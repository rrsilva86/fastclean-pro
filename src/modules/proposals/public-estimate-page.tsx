"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileText, Printer, XCircle } from "lucide-react";
import { Badge, Button, EmptyState } from "@/components/design-system";
import { EstimateDocument, buildEstimateDocumentData, type EstimateDocumentSettings, estimatePdfFileName } from "@/modules/proposals/estimate-document";
import type { EstimateRecord } from "@/modules/proposals/proposals-manager";

type PublicLabels = Record<string, string>;

const storageKey = "fastclean_pricing_quotes";
const settingsStorageKey = "fastclean_system_settings";

function closedStatus(status: string) {
  return ["accepted", "rejected", "expired", "converted", "void"].includes(status);
}

export function PublicEstimatePage({ labels, token }: { labels: PublicLabels; token: string }) {
  const [estimates, setEstimates] = useState<EstimateRecord[]>([]);
  const [documentSettings, setDocumentSettings] = useState<EstimateDocumentSettings | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadEstimate() {
      try {
        const response = await fetch(`/api/storage/${encodeURIComponent(storageKey)}`, { cache: "no-store" });
        const settingsResponse = await fetch(`/api/storage/${encodeURIComponent(settingsStorageKey)}`, { cache: "no-store" });
        const payload = await response.json() as { records?: EstimateRecord[] };
        const settingsPayload = await settingsResponse.json().catch(() => ({ records: [] })) as { records?: Array<{ documentSettings?: EstimateDocumentSettings }> };
        if (!cancelled) {
          setEstimates(Array.isArray(payload.records) ? payload.records : []);
          setDocumentSettings(settingsPayload.records?.[0]?.documentSettings);
        }
      } catch {
        if (!cancelled) {
          setEstimates([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    loadEstimate();
    return () => {
      cancelled = true;
    };
  }, []);

  const estimate = useMemo(() => estimates.find((item) => item.publicToken === token), [estimates, token]);

  function updateStatus(status: "accepted" | "rejected") {
    if (!estimate || closedStatus(estimate.status)) {
      return;
    }
    const now = new Date().toISOString();
    const nextEstimate = {
      ...estimate,
      acceptedAt: status === "accepted" ? now : estimate.acceptedAt,
      rejectedAt: status === "rejected" ? now : estimate.rejectedAt,
      status,
      updatedAt: now
    };
    const nextEstimates = estimates.map((item) => (item.id === estimate.id ? nextEstimate : item));
    setEstimates(nextEstimates);
    setMessage(status === "accepted" ? labels.acceptedMessage : labels.declinedMessage);
    fetch(`/api/storage/${encodeURIComponent(storageKey)}`, {
      body: JSON.stringify({ records: nextEstimates }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    }).catch(() => undefined);
  }

  if (isLoading) {
    return <div className="min-h-screen bg-slate-50 p-6 text-sm font-bold text-slate-500">{labels.loading}</div>;
  }

  if (!estimate) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
        <EmptyState title={labels.publicExpired} description={labels.publicExpired} />
      </main>
    );
  }

  const isClosed = closedStatus(estimate.status);
  const documentData = buildEstimateDocumentData(estimate, labels, documentSettings);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 print:bg-white">
      <div className="mx-auto grid max-w-5xl gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Badge tone={estimate.status === "accepted" ? "green" : estimate.status === "rejected" ? "red" : "blue"}>{labels[`status.${estimate.status}`] ?? estimate.status}</Badge>
          <div className="flex gap-2">
            <Button onClick={() => printPublicEstimate(estimate)} type="button" variant="outline"><Printer className="h-4 w-4" />{labels.print}</Button>
            <Button onClick={() => printPublicEstimate(estimate)} type="button" variant="outline"><FileText className="h-4 w-4" />{labels.downloadPdf}</Button>
          </div>
        </div>

        <div className="estimate-public-canvas overflow-auto print:contents">
          <EstimateDocument data={documentData} />
        </div>
        <section className="flex flex-wrap items-center justify-end gap-2 rounded-lg bg-white p-4 shadow-sm print:hidden">
          {message ? <p className="mr-auto text-sm font-black text-teal-700">{message}</p> : null}
          <Button disabled={isClosed} onClick={() => updateStatus("rejected")} type="button" variant="outline"><XCircle className="h-4 w-4" />{labels.publicDecline}</Button>
          <Button disabled={isClosed} onClick={() => updateStatus("accepted")} type="button" variant="secondary"><CheckCircle2 className="h-4 w-4" />{labels.publicAccept}</Button>
        </section>
      </div>
    </main>
  );
}

async function printPublicEstimate(estimate: EstimateRecord) {
  document.title = estimatePdfFileName(estimate);
  await document.fonts?.ready;
  const images = Array.from(document.querySelectorAll<HTMLImageElement>(".estimate-document-printable img"));
  await Promise.all(images.map((image) => {
    if (image.complete) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener("error", () => resolve(), { once: true });
    });
  }));
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  window.print();
}
