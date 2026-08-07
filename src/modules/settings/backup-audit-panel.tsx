"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FilterX, RefreshCw, RotateCcw, Search, ShieldCheck } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, EmptyState, Input, Table, Td, Th } from "@/components/design-system";
import type { AuditEvent } from "@/lib/audit/audit-events";

type BackupRecord = {
  id: string;
  status: string;
  backup_type: string;
  progress: string;
  manifest: {
    applicationVersion?: string;
    createdAt?: string;
    recordCounts?: Record<string, number>;
  };
  checksum?: string;
  size_bytes: number;
  storage_provider: string;
  failure_reason?: string;
  created_at: string;
  verified_at?: string;
  expires_at?: string;
};

export type BackupAuditLabels = Record<string, string> & {
  auditLog: string;
  backups: string;
  restore: string;
  backupSettings: string;
  backupAuditTitle: string;
  backupAuditDescription: string;
  searchAudit: string;
  entityType: string;
  action: string;
  user: string;
  dateFrom: string;
  dateTo: string;
  clearFilters: string;
  dateTime: string;
  entity: string;
  change: string;
  source: string;
  oldValue: string;
  newValue: string;
  noAuditTitle: string;
  noAuditDescription: string;
  backupNow: string;
  download: string;
  lastBackup: string;
  verified: string;
  status: string;
  type: string;
  size: string;
  customers: string;
  appointments: string;
  auditEvents: string;
  appVersion: string;
  restoreWarning: string;
  restoreConfirmation: string;
  restoreBackup: string;
  retentionPolicy: string;
  encryption: string;
  externalStorage: string;
  dailySchedule: string;
};

export function BackupAuditPanel({ labels }: { labels: BackupAuditLabels }) {
  const [tab, setTab] = useState<"audit" | "backups" | "restore" | "settings">("audit");
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [backupStatus, setBackupStatus] = useState("");
  const [restoreBackupId, setRestoreBackupId] = useState("");
  const [restoreConfirmation, setRestoreConfirmation] = useState("");
  const [filters, setFilters] = useState({ action: "", entityType: "", from: "", search: "", to: "", user: "" });

  const auditQuery = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.set(key === "user" ? "actor" : key, value);
      }
    });
    return params.toString();
  }, [filters]);

  useEffect(() => {
    loadAudit();
    loadBackups();
  }, []);

  async function loadAudit() {
    const response = await fetch(`/api/audit${auditQuery ? `?${auditQuery}` : ""}`, { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) {
      return;
    }
    const payload = await response.json() as { events?: AuditEvent[] };
    setEvents(payload.events ?? []);
  }

  async function loadBackups() {
    const response = await fetch("/api/backups", { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) {
      return;
    }
    const payload = await response.json() as { backups?: BackupRecord[] };
    setBackups(payload.backups ?? []);
  }

  async function createBackup() {
    setLoading(true);
    setBackupStatus("");
    const response = await fetch("/api/backups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ mode: "create" })
    });
    setBackupStatus(response.ok ? labels.verified : "Failed");
    setLoading(false);
    await Promise.all([loadBackups(), loadAudit()]);
  }

  async function restoreSelectedBackup() {
    setLoading(true);
    const response = await fetch("/api/backups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ backupId: restoreBackupId, confirmation: restoreConfirmation, mode: "restore" })
    });
    setBackupStatus(response.ok ? labels.restoreBackup : "Failed");
    setLoading(false);
    await Promise.all([loadBackups(), loadAudit()]);
  }

  function downloadBackup(id: string) {
    window.location.href = `/api/backups?id=${encodeURIComponent(id)}`;
  }

  const lastBackup = backups[0];

  return (
    <Card>
      <CardHeader className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-green-50 text-secondary ring-1 ring-green-100">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-black text-slate-950">{labels.backupAuditTitle}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">{labels.backupAuditDescription}</p>
          </div>
        </div>
        <Button disabled={loading} onClick={createBackup} type="button">
          <RefreshCw className="h-4 w-4" />
          {labels.backupNow}
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          {[
            ["audit", labels.auditLog],
            ["backups", labels.backups],
            ["restore", labels.restore],
            ["settings", labels.backupSettings]
          ].map(([key, label]) => (
            <button className={`rounded-lg px-3 py-2 text-xs font-black transition ${tab === key ? "bg-green-50 text-teal-700 ring-1 ring-green-100" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`} key={key} onClick={() => setTab(key as typeof tab)} type="button">
              {label}
            </button>
          ))}
        </div>

        {backupStatus ? <Badge tone={backupStatus === "Failed" ? "red" : "green"}>{backupStatus}</Badge> : null}

        {tab === "audit" ? (
          <div className="grid gap-4">
            <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-3">
              <Input label={labels.searchAudit} name="auditSearch" onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} value={filters.search} />
              <Input label={labels.user} name="auditUser" onChange={(event) => setFilters((current) => ({ ...current, user: event.target.value }))} value={filters.user} />
              <Input label={labels.entityType} name="auditEntity" onChange={(event) => setFilters((current) => ({ ...current, entityType: event.target.value }))} value={filters.entityType} />
              <Input label={labels.action} name="auditAction" onChange={(event) => setFilters((current) => ({ ...current, action: event.target.value }))} value={filters.action} />
              <Input label={labels.dateFrom} name="auditFrom" onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} type="date" value={filters.from} />
              <Input label={labels.dateTo} name="auditTo" onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} type="date" value={filters.to} />
              <div className="flex gap-2 md:col-span-3">
                <Button onClick={loadAudit} type="button"><Search className="h-4 w-4" />{labels.searchAudit}</Button>
                <Button onClick={() => setFilters({ action: "", entityType: "", from: "", search: "", to: "", user: "" })} type="button" variant="outline"><FilterX className="h-4 w-4" />{labels.clearFilters}</Button>
              </div>
            </div>
            {events.length === 0 ? <EmptyState title={labels.noAuditTitle} description={labels.noAuditDescription} /> : (
              <Table>
                <thead>
                  <tr>
                    <Th>{labels.dateTime}</Th>
                    <Th>{labels.user}</Th>
                    <Th>{labels.entity}</Th>
                    <Th>{labels.change}</Th>
                    <Th>{labels.source}</Th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id}>
                      <Td>{new Date(event.createdAt).toLocaleString()}</Td>
                      <Td>{event.actorDisplayNameSnapshot || "-"}</Td>
                      <Td><b>{event.entityType}</b><br />{event.entityDisplayNameSnapshot || event.entityId}</Td>
                      <Td>
                        <span className="font-bold text-slate-900">{event.changeSummary}</span>
                        {event.fieldName ? <p className="mt-1 text-xs text-slate-500">{event.fieldName}: {String(event.previousValue ?? "-")} → {String(event.newValue ?? "-")}</p> : null}
                      </Td>
                      <Td>{event.source}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        ) : null}

        {tab === "backups" ? (
          <div className="grid gap-4">
            {lastBackup ? (
              <div className="rounded-lg border border-green-100 bg-green-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-green-700">{labels.lastBackup}</p>
                <h3 className="mt-1 text-lg font-black text-slate-950">{labels.verified} · {new Date(lastBackup.created_at).toLocaleString()}</h3>
                <p className="mt-1 text-sm font-semibold text-slate-600">{labels.customers}: {lastBackup.manifest.recordCounts?.fastclean_clients ?? 0} · {labels.appointments}: {lastBackup.manifest.recordCounts?.fastclean_appointments ?? 0} · {labels.auditEvents}: {lastBackup.manifest.recordCounts?.auditEvents ?? 0}</p>
              </div>
            ) : null}
            <BackupTable backups={backups} labels={labels} onDownload={downloadBackup} />
          </div>
        ) : null}

        {tab === "restore" ? (
          <div className="grid gap-4 rounded-lg border border-red-100 bg-red-50 p-4">
            <p className="text-sm font-bold text-red-700">{labels.restoreWarning}</p>
            <label className="grid gap-1.5 text-xs font-bold text-slate-600">
              {labels.backups}
              <select className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm" onChange={(event) => setRestoreBackupId(event.target.value)} value={restoreBackupId}>
                <option value="">-</option>
                {backups.map((backup) => <option key={backup.id} value={backup.id}>{backup.id}</option>)}
              </select>
            </label>
            <Input label={labels.restoreConfirmation} name="restoreConfirmation" onChange={(event) => setRestoreConfirmation(event.target.value)} value={restoreConfirmation} />
            <Button disabled={!restoreBackupId || restoreConfirmation !== "RESTORE" || loading} onClick={restoreSelectedBackup} type="button" variant="danger">
              <RotateCcw className="h-4 w-4" />
              {labels.restoreBackup}
            </Button>
          </div>
        ) : null}

        {tab === "settings" ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Detail label={labels.dailySchedule} value="02:00 company timezone" />
            <Detail label={labels.retentionPolicy} value="30 daily backups / 12 monthly backups prepared" />
            <Detail label={labels.encryption} value="AES-256-GCM" />
            <Detail label={labels.externalStorage} value="S3-compatible environment configuration prepared; encrypted Postgres storage active until configured" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function BackupTable({ backups, labels, onDownload }: { backups: BackupRecord[]; labels: BackupAuditLabels; onDownload: (id: string) => void }) {
  if (backups.length === 0) {
    return <EmptyState title={labels.backups} description={labels.noAuditDescription} />;
  }

  return (
    <Table>
      <thead>
        <tr>
          <Th>{labels.dateTime}</Th>
          <Th>{labels.type}</Th>
          <Th>{labels.status}</Th>
          <Th>{labels.size}</Th>
          <Th>{labels.customers}</Th>
          <Th>{labels.appointments}</Th>
          <Th>{labels.auditEvents}</Th>
          <Th>{labels.appVersion}</Th>
          <Th>{labels.download}</Th>
        </tr>
      </thead>
      <tbody>
        {backups.map((backup) => (
          <tr key={backup.id}>
            <Td>{new Date(backup.created_at).toLocaleString()}</Td>
            <Td>{backup.backup_type}</Td>
            <Td><Badge tone={backup.status === "verified" ? "green" : backup.status === "failed" ? "red" : "yellow"}>{backup.status}</Badge></Td>
            <Td>{formatBytes(backup.size_bytes)}</Td>
            <Td>{backup.manifest.recordCounts?.fastclean_clients ?? 0}</Td>
            <Td>{backup.manifest.recordCounts?.fastclean_appointments ?? 0}</Td>
            <Td>{backup.manifest.recordCounts?.auditEvents ?? 0}</Td>
            <Td>{backup.manifest.applicationVersion ?? "-"}</Td>
            <Td><Button onClick={() => onDownload(backup.id)} type="button" variant="outline"><Download className="h-4 w-4" />{labels.download}</Button></Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}

function formatBytes(size: number) {
  if (!size) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  return `${(size / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
