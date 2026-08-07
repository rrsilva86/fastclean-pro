"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CalendarPlus, Copy, FilterX, MoreHorizontal, Plus, Printer, Send, XCircle } from "lucide-react";
import { Badge, Button, Card, CardContent, EmptyState, Input, Modal, Table, Td, Th } from "@/components/design-system";
import { readRemoteRecords, writeLocalRecords } from "@/lib/storage/local-records";
import { hasPermission, type RoleCode } from "@/lib/permissions/permissions";
import { defaultClients, type ClientRecord } from "@/modules/clients/types";
import { EstimateDocument, type EstimateDocumentSettings, estimatePdfFileName } from "@/modules/proposals/estimate-document";

type EstimateStatus = "draft" | "sent" | "viewed" | "accepted" | "rejected" | "expired" | "converted" | "void";
type EstimateSource = "manual" | "pricing_calculator" | "customer" | "appointment" | "other";
type EstimateTab = "overview" | "pricing" | "communication" | "activity";

type EstimateLineItem = {
  id: string;
  type: "service" | "extra" | "custom" | "discount" | "fee";
  description: string;
  quantity: number;
  rate: number;
};

type EstimateActivity = {
  id: string;
  at: string;
  user: string;
  action: string;
  previousValue?: string;
  newValue?: string;
};

type EstimateCommunication = {
  id: string;
  at: string;
  channel: "email" | "sms" | "both";
  message: string;
  sentBy: string;
};

export type EstimateRecord = {
  id: string;
  number: string;
  publicToken: string;
  revisionNumber: number;
  previousRevisionId?: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  serviceAddress: string;
  serviceName: string;
  frequency: string;
  description: string;
  source: EstimateSource;
  sourcePricingQuoteId?: string;
  pricingCalculationId?: string;
  pricingRuleVersion?: string;
  pricingSnapshot?: Record<string, unknown>;
  recommendedPrice?: number;
  finalPrice?: number;
  firstVisitPrice?: number;
  recurringVisitPrice?: number;
  estimatedLaborHours?: number;
  overrideReason?: string;
  estimateDate: string;
  expirationDate: string;
  assignedUser: string;
  status: EstimateStatus;
  lineItems: EstimateLineItem[];
  discount: number;
  tax: number;
  additionalCharges: number;
  notes: string;
  terms: string;
  sentAt?: string;
  firstViewedAt?: string;
  lastViewedAt?: string;
  viewCount: number;
  acceptedAt?: string;
  rejectedAt?: string;
  declineReason?: string;
  convertedAppointmentId?: string;
  voidReason?: string;
  voidedAt?: string;
  modifiedAfterSend?: boolean;
  communications: EstimateCommunication[];
  activity: EstimateActivity[];
  createdAt: string;
  updatedAt: string;
};

type ProposalLabels = Record<string, string>;

const storageKey = "fastclean_pricing_quotes";
const clientsStorageKey = "fastclean_clients";
const appointmentsStorageKey = "fastclean_appointments";
const settingsStorageKey = "fastclean_system_settings";
const currentUser = "Current user";
const currency = new Intl.NumberFormat("en-US", { currency: "USD", style: "currency" });

const emptyEstimate: EstimateRecord = {
  activity: [],
  additionalCharges: 0,
  assignedUser: currentUser,
  communications: [],
  createdAt: "",
  customerName: "",
  description: "",
  discount: 0,
  estimateDate: "",
  expirationDate: "",
  frequency: "",
  id: "",
  lineItems: [{ description: "", id: "line_1", quantity: 1, rate: 0, type: "service" }],
  notes: "",
  number: "",
  publicToken: "",
  revisionNumber: 1,
  serviceAddress: "",
  serviceName: "",
  source: "manual",
  status: "draft",
  tax: 0,
  terms: "",
  updatedAt: "",
  viewCount: 0
};

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + days);
  return nextDate;
}

function money(value: unknown) {
  return Number(String(value ?? "").replace(/[^0-9.-]+/g, "")) || 0;
}

function subtotal(estimate: EstimateRecord) {
  return estimate.lineItems.reduce((total, item) => total + Number(item.quantity || 0) * Number(item.rate || 0), 0);
}

function total(estimate: EstimateRecord) {
  return Math.max(0, subtotal(estimate) - Number(estimate.discount || 0) + Number(estimate.tax || 0) + Number(estimate.additionalCharges || 0));
}

function secureToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replaceAll("-", "");
  }
  return `${Date.now()}${Math.random().toString(36).slice(2)}`;
}

function nextEstimateNumber(estimates: EstimateRecord[]) {
  const maxNumber = estimates.reduce((max, estimate) => {
    const numeric = Number(estimate.number.replace(/\D/g, ""));
    return Number.isFinite(numeric) ? Math.max(max, numeric) : max;
  }, 1000);
  return `EST-${maxNumber + 1}`;
}

function activity(action: string, previousValue?: string, newValue?: string): EstimateActivity {
  return { action, at: new Date().toISOString(), id: `act_${Date.now()}_${Math.random().toString(36).slice(2)}`, newValue, previousValue, user: currentUser };
}

function clientAddress(client: ClientRecord | undefined) {
  const address = client?.addresses?.find((item) => item.primary) ?? client?.addresses?.[0];
  return address?.formatted || [address?.street, address?.city || address?.serviceArea, address?.state, address?.postalCode].filter(Boolean).join(", ");
}

function deriveStatus(estimate: EstimateRecord, today = dateKey(new Date())): EstimateStatus {
  if (["accepted", "rejected", "converted", "void"].includes(estimate.status)) {
    return estimate.status;
  }
  if (estimate.expirationDate && estimate.expirationDate < today) {
    return "expired";
  }
  return estimate.status;
}

function normalizeEstimate(raw: Partial<EstimateRecord> & Record<string, unknown>, existing: EstimateRecord[], clients: ClientRecord[]): EstimateRecord {
  const snapshot = raw.pricingSnapshot as Record<string, unknown> | undefined;
  const snapshotInput = snapshot?.input as { serviceId?: string; frequencyId?: string } | undefined;
  const quoteFinalPrice = money(raw.finalPrice);
  const quoteRecommendedPrice = money(raw.recommendedPrice);
  const client = clients.find((item) => item.id === raw.clientId);
  const address = raw.address as { formatted?: string } | null | undefined;
  const now = new Date();
  const createdAt = String(raw.createdAt || now.toISOString());
  const estimateDate = String(raw.estimateDate || createdAt.slice(0, 10));
  const lineItems = Array.isArray(raw.lineItems) && raw.lineItems.length > 0
    ? raw.lineItems as EstimateLineItem[]
    : [{ description: String(raw.serviceName || raw.service || snapshotInput?.serviceId || "Cleaning service"), id: "line_1", quantity: 1, rate: quoteFinalPrice || quoteRecommendedPrice || 0, type: "service" as const }];

  const estimate: EstimateRecord = {
    ...emptyEstimate,
    ...raw,
    activity: Array.isArray(raw.activity) ? raw.activity as EstimateActivity[] : [activity("Estimate created")],
    communications: Array.isArray(raw.communications) ? raw.communications as EstimateCommunication[] : [],
    createdAt,
    customerEmail: String(raw.customerEmail || client?.email || ""),
    customerId: String(raw.customerId || raw.clientId || ""),
    customerName: String(raw.customerName || client?.displayName || client?.name || "New customer"),
    customerPhone: String(raw.customerPhone || client?.phone || ""),
    description: String(raw.description || ""),
    estimateDate,
    expirationDate: String(raw.expirationDate || raw.expiresAt || dateKey(addDays(new Date(estimateDate), 14))),
    finalPrice: quoteFinalPrice || quoteRecommendedPrice || undefined,
    frequency: String(raw.frequency || raw.frequencyCode || snapshotInput?.frequencyId || ""),
    id: String(raw.id || `est_${Date.now()}_${Math.random().toString(36).slice(2)}`),
    lineItems,
    notes: String(raw.notes || ""),
    number: String(raw.number || raw.quoteNumber || nextEstimateNumber(existing)),
    pricingRuleVersion: String(raw.pricingRuleVersion || snapshot?.pricingRuleVersion || ""),
    pricingSnapshot: snapshot || raw.pricingSnapshot as Record<string, unknown> | undefined,
    publicToken: String(raw.publicToken || secureToken()),
    recommendedPrice: quoteRecommendedPrice || undefined,
    firstVisitPrice: money(raw.firstVisitPrice || snapshot?.firstVisitPrice) || quoteFinalPrice || quoteRecommendedPrice || undefined,
    recurringVisitPrice: money(raw.recurringVisitPrice || snapshot?.recurringVisitPrice) || undefined,
    revisionNumber: Number(raw.revisionNumber || 1),
    serviceAddress: String(raw.serviceAddress || address?.formatted || clientAddress(client) || ""),
    serviceName: String(raw.serviceName || raw.service || snapshotInput?.serviceId || "Cleaning service"),
    source: raw.source === "manual" || raw.source === "customer" || raw.source === "appointment" || raw.source === "other" ? raw.source : "pricing_calculator",
    sourcePricingQuoteId: raw.sourcePricingQuoteId ? String(raw.sourcePricingQuoteId) : String(raw.id || ""),
    status: deriveStatus((String(raw.status) === "recommended" ? { ...emptyEstimate, ...raw, status: "draft" } : { ...emptyEstimate, ...raw }) as EstimateRecord),
    terms: String(raw.terms || "Estimate is valid until the expiration date above. Final scope may change if property conditions differ from the information provided."),
    updatedAt: String(raw.updatedAt || createdAt),
    viewCount: Number(raw.viewCount || 0)
  };

  return { ...estimate, status: deriveStatus(estimate) };
}

function can(role: RoleCode, permission: string) {
  return hasPermission(role, permission);
}

export function ProposalsManager({ labels, role = "owner" }: { labels: ProposalLabels; role?: RoleCode }) {
  const [estimates, setEstimates] = useState<EstimateRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>(defaultClients);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [sendId, setSendId] = useState<string | null>(null);
  const [voidId, setVoidId] = useState<string | null>(null);
  const [filters, setFilters] = useState({ customer: "", search: "", service: "", source: "", status: "" });
  const [documentSettings, setDocumentSettings] = useState<EstimateDocumentSettings | undefined>();

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      const savedClients = await readRemoteRecords<ClientRecord>(clientsStorageKey, defaultClients);
      const rawEstimates = await readRemoteRecords<Record<string, unknown>>(storageKey, []);
      const settingsRecords = await readRemoteRecords<{ documentSettings?: EstimateDocumentSettings }>(settingsStorageKey, []);
      if (cancelled) return;
      const normalized: EstimateRecord[] = [];
      rawEstimates.forEach((raw) => normalized.push(normalizeEstimate(raw, normalized, savedClients)));
      setClients(savedClients);
      setEstimates(normalized.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setDocumentSettings(settingsRecords[0]?.documentSettings);
    }
    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = estimates.find((estimate) => estimate.id === selectedId) ?? null;
  const editing = editingId === "new" ? createBlankEstimate(estimates) : estimates.find((estimate) => estimate.id === editingId) ?? null;
  const sending = estimates.find((estimate) => estimate.id === sendId) ?? null;
  const voiding = estimates.find((estimate) => estimate.id === voidId) ?? null;

  const visibleEstimates = useMemo(() => estimates.filter((estimate) => {
    const search = filters.search.toLowerCase();
    const haystack = `${estimate.number} ${estimate.customerName} ${estimate.customerPhone} ${estimate.customerEmail} ${estimate.serviceName}`.toLowerCase();
    return (!search || haystack.includes(search))
      && (!filters.status || deriveStatus(estimate) === filters.status)
      && (!filters.source || estimate.source === filters.source)
      && (!filters.service || estimate.serviceName === filters.service)
      && (!filters.customer || estimate.customerName === filters.customer);
  }), [estimates, filters]);

  const kpis = useMemo(() => {
    const open = estimates.filter((estimate) => ["draft", "sent", "viewed"].includes(deriveStatus(estimate)));
    const awaiting = estimates.filter((estimate) => ["sent", "viewed"].includes(deriveStatus(estimate)));
    const accepted = estimates.filter((estimate) => deriveStatus(estimate) === "accepted");
    const soon = estimates.filter((estimate) => {
      const status = deriveStatus(estimate);
      if (["accepted", "rejected", "converted", "void"].includes(status)) return false;
      const days = Math.ceil((new Date(estimate.expirationDate).getTime() - Date.now()) / 86400000);
      return days >= 0 && days <= 7;
    });
    return { acceptedValue: accepted.reduce((sum, estimate) => sum + total(estimate), 0), awaiting: awaiting.length, expiringSoon: soon.length, openCount: open.length, openValue: open.reduce((sum, estimate) => sum + total(estimate), 0) };
  }, [estimates]);

  function persist(nextEstimates: EstimateRecord[]) {
    setEstimates(nextEstimates);
    writeLocalRecords(storageKey, nextEstimates);
  }

  function saveEstimate(estimate: EstimateRecord) {
    const exists = estimates.some((item) => item.id === estimate.id);
    const nextEstimate = { ...estimate, status: deriveStatus(estimate), updatedAt: new Date().toISOString(), activity: [...estimate.activity, activity(exists ? "Estimate edited" : "Estimate created")] };
    persist(exists ? estimates.map((item) => (item.id === estimate.id ? nextEstimate : item)) : [nextEstimate, ...estimates]);
    setEditingId(null);
    setSelectedId(nextEstimate.id);
  }

  function updateEstimate(estimate: EstimateRecord, patch: Partial<EstimateRecord>, action: string, previousValue?: string, newValue?: string) {
    const nextEstimate = { ...estimate, ...patch, updatedAt: new Date().toISOString(), activity: [...estimate.activity, activity(action, previousValue, newValue)] };
    persist(estimates.map((item) => (item.id === estimate.id ? nextEstimate : item)));
  }

  async function sendEstimate(estimate: EstimateRecord, channel: "email" | "sms" | "both", message: string) {
    const now = new Date().toISOString();
    if (channel === "sms" || channel === "both") {
      await fetch("/api/highlevel/estimate-sms", {
        body: JSON.stringify({
          client: {
            id: estimate.customerId || estimate.id,
            name: estimate.customerName,
            displayName: estimate.customerName,
            phone: estimate.customerPhone,
            email: estimate.customerEmail,
            addresses: [{ formatted: estimate.serviceAddress, primary: true }]
          },
          estimate: {
            number: estimate.number,
            publicLink: publicEstimateLink(estimate),
            total: currency.format(total(estimate))
          },
          message
        }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
    }
    updateEstimate(estimate, {
      communications: [...estimate.communications, { at: now, channel, id: `com_${Date.now()}`, message, sentBy: currentUser }],
      sentAt: estimate.sentAt || now,
      status: estimate.status === "draft" ? "sent" : estimate.status
    }, estimate.sentAt ? "Estimate resent" : "Estimate sent", estimate.status, "sent");
    setSendId(null);
  }

  function duplicateEstimate(estimate: EstimateRecord) {
    const duplicate = { ...estimate, acceptedAt: undefined, activity: [activity("Estimate duplicated")], communications: [], convertedAppointmentId: undefined, createdAt: new Date().toISOString(), firstViewedAt: undefined, id: `est_${Date.now()}`, lastViewedAt: undefined, modifiedAfterSend: false, number: nextEstimateNumber(estimates), publicToken: secureToken(), rejectedAt: undefined, revisionNumber: 1, sentAt: undefined, status: "draft" as const, updatedAt: new Date().toISOString(), viewCount: 0 };
    persist([duplicate, ...estimates]);
    setSelectedId(duplicate.id);
  }

  function deleteDraft(estimate: EstimateRecord) {
    persist(estimates.filter((item) => item.id !== estimate.id));
    setSelectedId(null);
  }

  function convertToAppointment(estimate: EstimateRecord) {
    const appointment = {
      client: estimate.customerName,
      clientId: estimate.customerId,
      date: dateKey(addDays(new Date(), 1)),
      durationMinutes: Math.round(Number(estimate.estimatedLaborHours || 3) * 60),
      extraServices: estimate.lineItems.filter((item) => item.type === "extra").map((item) => item.description),
      id: `appt_from_${estimate.id}`,
      notes: `Created from estimate ${estimate.number}`,
      price: String(total(estimate)),
      recurrence: recurrenceFromFrequency(estimate.frequency),
      service: estimate.serviceName,
      sourceEstimateId: estimate.id,
      status: "scheduled",
      team: "Team A",
      time: "09:00"
    };
    readRemoteRecords<Record<string, unknown>>(appointmentsStorageKey, []).then((appointments) => {
      writeLocalRecords(appointmentsStorageKey, [appointment, ...appointments]);
      updateEstimate(estimate, { convertedAppointmentId: appointment.id, status: "converted" }, "Converted to appointment");
    });
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">{labels.title}</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">{labels.subtitle}</p>
        </div>
        <Button onClick={() => setEditingId("new")} type="button"><Plus className="h-4 w-4" />{labels.newEstimate}</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <KpiCard label={labels.open} subValue={currency.format(kpis.openValue)} value={String(kpis.openCount)} />
        <KpiCard label={labels.awaitingResponse} value={String(kpis.awaiting)} />
        <KpiCard label={labels.accepted} subValue={labels.thisMonth} value={currency.format(kpis.acceptedValue)} tone="green" />
        <KpiCard label={labels.expiringSoon} value={String(kpis.expiringSoon)} tone="orange" />
      </div>

      <Card>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-[1.3fr_1fr_1fr_1fr_auto]">
            <Input label={labels.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} value={filters.search} />
            <Select label={labels.status} onChange={(value) => setFilters((current) => ({ ...current, status: value }))} value={filters.status}>
              <option value="">{labels.allStatuses}</option>
              {statusOptions.map((status) => <option key={status} value={status}>{labels[`status.${status}`] ?? status}</option>)}
            </Select>
            <Select label={labels.source} onChange={(value) => setFilters((current) => ({ ...current, source: value }))} value={filters.source}>
              <option value="">{labels.allSources}</option>
              {sourceOptions.map((source) => <option key={source} value={source}>{labels[`source.${source}`] ?? source}</option>)}
            </Select>
            <Select label={labels.customer} onChange={(value) => setFilters((current) => ({ ...current, customer: value }))} value={filters.customer}>
              <option value="">{labels.allCustomers}</option>
              {Array.from(new Set(estimates.map((estimate) => estimate.customerName))).filter(Boolean).sort().map((customer) => <option key={customer} value={customer}>{customer}</option>)}
            </Select>
            <div className="flex items-end">
              <Button onClick={() => setFilters({ customer: "", search: "", service: "", source: "", status: "" })} type="button" variant="outline"><FilterX className="h-4 w-4" />{labels.clearFilters}</Button>
            </div>
          </div>

          {visibleEstimates.length === 0 ? (
            <EmptyState title={labels.emptyTitle} description={labels.emptyDescription} action={<Button onClick={() => setEditingId("new")} type="button">{labels.newEstimate}</Button>} />
          ) : (
            <>
              <div className="hidden lg:block">
                <Table>
                  <thead><tr><Th>{labels.estimateNumber}</Th><Th>{labels.customer}</Th><Th>{labels.service}</Th><Th>{labels.created}</Th><Th>{labels.expiration}</Th><Th>{labels.total}</Th><Th>{labels.status}</Th><Th>{labels.source}</Th><Th>{labels.actions}</Th></tr></thead>
                  <tbody>
                    {visibleEstimates.map((estimate) => (
                      <tr className="cursor-pointer transition hover:bg-slate-50" key={estimate.id} onClick={() => setSelectedId(estimate.id)}>
                        <Td><b>{estimate.number}</b></Td>
                        <Td>{estimate.customerName}</Td>
                        <Td>{estimate.serviceName}</Td>
                        <Td>{estimate.estimateDate}</Td>
                        <Td>{estimate.expirationDate}</Td>
                        <Td><b>{currency.format(total(estimate))}</b></Td>
                        <Td><StatusBadge labels={labels} status={deriveStatus(estimate)} /></Td>
                        <Td>{labels[`source.${estimate.source}`] ?? estimate.source}</Td>
                        <Td><Button onClick={(event) => { event.stopPropagation(); setSelectedId(estimate.id); }} type="button" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              <div className="grid gap-3 lg:hidden">
                {visibleEstimates.map((estimate) => (
                  <button className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm" key={estimate.id} onClick={() => setSelectedId(estimate.id)} type="button">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-950">{estimate.number}</p>
                        <p className="mt-1 text-sm font-bold text-slate-600">{estimate.customerName}</p>
                        <p className="mt-1 text-xs font-bold text-slate-400">{estimate.serviceName} · {estimate.frequency || "-"}</p>
                      </div>
                      <StatusBadge labels={labels} status={deriveStatus(estimate)} />
                    </div>
                    <p className="mt-3 text-lg font-black text-slate-950">{currency.format(total(estimate))}</p>
                  </button>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {selected ? <EstimateWorkspace canDelete={can(role, "estimate.delete")} canInternal={can(role, "estimate.viewInternalPricing")} documentSettings={documentSettings} estimate={selected} labels={labels} onAccept={() => updateEstimate(selected, { acceptedAt: new Date().toISOString(), status: "accepted" }, "Marked accepted", selected.status, "accepted")} onClose={() => setSelectedId(null)} onConvert={() => convertToAppointment(selected)} onDelete={() => deleteDraft(selected)} onDuplicate={() => duplicateEstimate(selected)} onEdit={() => setEditingId(selected.id)} onPrint={() => window.print()} onReject={() => updateEstimate(selected, { rejectedAt: new Date().toISOString(), status: "rejected" }, "Marked rejected", selected.status, "rejected")} onSend={() => setSendId(selected.id)} onVoid={() => setVoidId(selected.id)} /> : null}
      {editing ? <EstimateEditor clients={clients} estimate={editing} labels={labels} onClose={() => setEditingId(null)} onSave={saveEstimate} /> : null}
      {sending ? <SendEstimateModal estimate={sending} labels={labels} onClose={() => setSendId(null)} onSend={sendEstimate} /> : null}
      {voiding ? <VoidEstimateModal estimate={voiding} labels={labels} onClose={() => setVoidId(null)} onVoid={(reason) => { updateEstimate(voiding, { status: "void", voidedAt: new Date().toISOString(), voidReason: reason }, "Estimate voided"); setVoidId(null); }} /> : null}
    </div>
  );
}

const statusOptions: EstimateStatus[] = ["draft", "sent", "viewed", "accepted", "rejected", "expired", "converted", "void"];
const sourceOptions: EstimateSource[] = ["manual", "pricing_calculator", "customer", "appointment", "other"];

function createBlankEstimate(estimates: EstimateRecord[]): EstimateRecord {
  const today = dateKey(new Date());
  return { ...emptyEstimate, createdAt: new Date().toISOString(), estimateDate: today, expirationDate: dateKey(addDays(new Date(), 14)), id: `est_${Date.now()}`, number: nextEstimateNumber(estimates), publicToken: secureToken(), updatedAt: new Date().toISOString() };
}

function KpiCard({ label, subValue, tone = "blue", value }: { label: string; subValue?: string; tone?: "blue" | "green" | "orange"; value: string }) {
  const toneClass = tone === "green" ? "border-green-200" : tone === "orange" ? "border-orange-200" : "border-cyan-200";
  return (
    <Card className={toneClass}>
      <CardContent>
        <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
        {subValue ? <p className="mt-1 text-xs font-bold text-slate-500">{subValue}</p> : null}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ labels, status }: { labels: ProposalLabels; status: EstimateStatus }) {
  const tone = status === "accepted" || status === "converted" ? "green" : status === "rejected" || status === "void" ? "red" : status === "expired" ? "orange" : status === "sent" || status === "viewed" ? "blue" : "gray";
  return <Badge tone={tone}>{labels[`status.${status}`] ?? status}</Badge>;
}

function Select({ children, label, onChange, value }: { children: ReactNode; label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="grid gap-1.5 text-xs font-bold text-slate-600">
      {label}
      <select className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-cyan-100" onChange={(event) => onChange(event.target.value)} value={value}>{children}</select>
    </label>
  );
}

function EstimateWorkspace({ canDelete, canInternal, documentSettings, estimate, labels, onAccept, onClose, onConvert, onDelete, onDuplicate, onEdit, onPrint, onReject, onSend, onVoid }: { canDelete: boolean; canInternal: boolean; documentSettings?: EstimateDocumentSettings; estimate: EstimateRecord; labels: ProposalLabels; onAccept: () => void; onClose: () => void; onConvert: () => void; onDelete: () => void; onDuplicate: () => void; onEdit: () => void; onPrint: () => void; onReject: () => void; onSend: () => void; onVoid: () => void }) {
  const [tab, setTab] = useState<EstimateTab>("overview");
  const status = deriveStatus(estimate);
  const publicLink = publicEstimateLink(estimate);
  return (
    <Modal onClose={onClose} title={`${labels.estimateWorkspace} · ${estimate.number}`}>
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StatusBadge labels={labels} status={status} />
          <div className="flex flex-wrap gap-2">
            <Button onClick={onEdit} type="button" variant="outline">{labels.edit}</Button>
            <Button onClick={onSend} type="button"><Send className="h-4 w-4" />{estimate.sentAt ? labels.resend : labels.send}</Button>
            <Button onClick={() => navigator.clipboard?.writeText(publicLink)} type="button" variant="outline"><Copy className="h-4 w-4" />{labels.copyPublicLink}</Button>
            <Button onClick={() => { document.title = estimatePdfFileName(estimate); onPrint(); }} type="button" variant="outline"><Printer className="h-4 w-4" />{labels.print}</Button>
          </div>
        </div>
        <div className="flex gap-2 border-b border-slate-100">
          {(["overview", "pricing", "communication", "activity"] as EstimateTab[]).filter((item) => item !== "pricing" || canInternal).map((item) => (
            <button className={`px-3 py-2 text-sm font-black ${tab === item ? "border-b-2 border-secondary text-slate-950" : "text-slate-500"}`} key={item} onClick={() => setTab(item)} type="button">{labels[`tab.${item}`] ?? item}</button>
          ))}
        </div>
        {tab === "overview" ? <EstimatePreview estimate={estimate} labels={labels} settings={documentSettings} /> : null}
        {tab === "pricing" ? <PricingSnapshot estimate={estimate} labels={labels} /> : null}
        {tab === "communication" ? <HistoryList empty={labels.noCommunication} items={estimate.communications.map((item) => `${item.at.slice(0, 10)} · ${item.channel} · ${item.message}`)} /> : null}
        {tab === "activity" ? <HistoryList empty={labels.noActivity} items={estimate.activity.map((item) => `${item.at.slice(0, 10)} · ${item.action}`)} /> : null}
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          {["sent", "viewed"].includes(status) ? <Button onClick={onAccept} type="button" variant="secondary">{labels.markAccepted}</Button> : null}
          {["sent", "viewed"].includes(status) ? <Button onClick={onReject} type="button" variant="outline">{labels.markRejected}</Button> : null}
          {status === "accepted" ? <Button onClick={onConvert} type="button"><CalendarPlus className="h-4 w-4" />{labels.convertToAppointment}</Button> : null}
          <Button onClick={onDuplicate} type="button" variant="outline">{labels.duplicate}</Button>
          {status === "draft" && canDelete ? <Button onClick={onDelete} type="button" variant="danger">{labels.deleteDraft}</Button> : <Button onClick={onVoid} type="button" variant="danger"><XCircle className="h-4 w-4" />{labels.voidEstimate}</Button>}
        </div>
      </div>
    </Modal>
  );
}

function EstimatePreview({ estimate, labels, settings }: { estimate: EstimateRecord; labels: ProposalLabels; settings?: EstimateDocumentSettings }) {
  return (
    <div className="-mx-4 overflow-x-auto bg-slate-100 p-4 print:m-0 print:overflow-visible print:bg-white print:p-0">
      <EstimateDocument estimate={estimate} labels={labels} settings={settings} />
    </div>
  );
}

function PreviewBox({ title, value }: { title: string; value: string }) {
  return <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-black uppercase text-slate-400">{title}</p><p className="mt-2 whitespace-pre-line text-sm font-bold text-slate-800">{value}</p></div>;
}

function PricingSnapshot({ estimate, labels }: { estimate: EstimateRecord; labels: ProposalLabels }) {
  const snapshot = estimate.pricingSnapshot;
  const components = Array.isArray(snapshot?.components) ? snapshot.components as Array<{ label: string; amount: number }> : [];
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-3">
        <PreviewBox title={labels.recommendedPrice} value={currency.format(Number(estimate.recommendedPrice || total(estimate)))} />
        <PreviewBox title={labels.finalPrice} value={currency.format(Number(estimate.finalPrice || total(estimate)))} />
        <PreviewBox title={labels.pricingRuleVersion} value={estimate.pricingRuleVersion || "-"} />
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <p className="mb-2 text-sm font-black text-slate-950">{labels.calculationBreakdown}</p>
        {components.length === 0 ? <p className="text-sm font-semibold text-slate-500">{labels.noPricingSnapshot}</p> : components.map((item) => <div className="flex justify-between border-b border-slate-100 py-2 text-sm" key={item.label}><span>{item.label}</span><b>{currency.format(item.amount)}</b></div>)}
      </div>
    </div>
  );
}

function HistoryList({ empty, items }: { empty: string; items: string[] }) {
  return items.length === 0 ? <p className="rounded-lg bg-slate-50 p-4 text-sm font-bold text-slate-500">{empty}</p> : <div className="grid gap-2">{items.map((item) => <p className="rounded-lg border border-slate-200 bg-white p-3 text-sm font-bold text-slate-700" key={item}>{item}</p>)}</div>;
}

function EstimateEditor({ clients, estimate, labels, onClose, onSave }: { clients: ClientRecord[]; estimate: EstimateRecord; labels: ProposalLabels; onClose: () => void; onSave: (estimate: EstimateRecord) => void }) {
  const [draft, setDraft] = useState(estimate);
  function updateLine(id: string, patch: Partial<EstimateLineItem>) {
    setDraft((current) => ({ ...current, lineItems: current.lineItems.map((item) => (item.id === id ? { ...item, ...patch } : item)) }));
  }
  function selectCustomer(clientId: string) {
    const client = clients.find((item) => item.id === clientId);
    setDraft((current) => ({ ...current, customerEmail: client?.email || "", customerId: client?.id || "", customerName: client?.displayName || client?.name || "", customerPhone: client?.phone || "", serviceAddress: clientAddress(client) }));
  }
  return (
    <Modal onClose={onClose} title={estimate.id ? labels.editEstimate : labels.newEstimate}>
      <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); onSave(draft); }}>
        <div className="grid gap-3 md:grid-cols-3">
          <Select label={labels.customer} onChange={selectCustomer} value={draft.customerId || ""}><option value="">{labels.selectCustomer}</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.displayName || client.name}</option>)}</Select>
          <Input label={labels.estimateNumber} onChange={(event) => setDraft({ ...draft, number: event.target.value })} required value={draft.number} />
          <Input label={labels.expiration} onChange={(event) => setDraft({ ...draft, expirationDate: event.target.value })} required type="date" value={draft.expirationDate} />
          <Input label={labels.customer} onChange={(event) => setDraft({ ...draft, customerName: event.target.value })} required value={draft.customerName} />
          <Input label={labels.phone} onChange={(event) => setDraft({ ...draft, customerPhone: event.target.value })} value={draft.customerPhone || ""} />
          <Input label={labels.email} onChange={(event) => setDraft({ ...draft, customerEmail: event.target.value })} type="email" value={draft.customerEmail || ""} />
          <Input className="md:col-span-2" label={labels.address} onChange={(event) => setDraft({ ...draft, serviceAddress: event.target.value })} value={draft.serviceAddress} />
          <Input label={labels.service} onChange={(event) => setDraft({ ...draft, serviceName: event.target.value })} value={draft.serviceName} />
          <Input label={labels.frequency} onChange={(event) => setDraft({ ...draft, frequency: event.target.value })} value={draft.frequency} />
          <Input label={labels.assignedUser} onChange={(event) => setDraft({ ...draft, assignedUser: event.target.value })} value={draft.assignedUser} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-black">{labels.lineItems}</h3><Button onClick={() => setDraft({ ...draft, lineItems: [...draft.lineItems, { description: "", id: `line_${Date.now()}`, quantity: 1, rate: 0, type: "custom" }] })} type="button" variant="outline"><Plus className="h-4 w-4" />{labels.addCustomItem}</Button></div>
          <div className="grid gap-2">
            {draft.lineItems.map((item) => (
              <div className="grid gap-2 rounded-lg bg-white p-3 md:grid-cols-[1.5fr_90px_110px_40px]" key={item.id}>
                <Input label={labels.description} onChange={(event) => updateLine(item.id, { description: event.target.value })} value={item.description} />
                <Input label={labels.quantity} onChange={(event) => updateLine(item.id, { quantity: Number(event.target.value) || 0 })} type="number" value={item.quantity} />
                <Input label={labels.rate} onChange={(event) => updateLine(item.id, { rate: Number(event.target.value) || 0 })} type="number" value={item.rate} />
                <button className="mt-5 grid h-9 w-9 place-items-center rounded-lg text-red-500 hover:bg-red-50" onClick={() => setDraft({ ...draft, lineItems: draft.lineItems.filter((line) => line.id !== item.id) })} type="button">×</button>
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Input label={labels.discount} onChange={(event) => setDraft({ ...draft, discount: Number(event.target.value) || 0 })} type="number" value={draft.discount} />
          <Input label={labels.tax} onChange={(event) => setDraft({ ...draft, tax: Number(event.target.value) || 0 })} type="number" value={draft.tax} />
          <Input label={labels.additionalCharges} onChange={(event) => setDraft({ ...draft, additionalCharges: Number(event.target.value) || 0 })} type="number" value={draft.additionalCharges} />
        </div>
        <TextArea label={labels.notes} onChange={(value) => setDraft({ ...draft, notes: value })} value={draft.notes} />
        <TextArea label={labels.terms} onChange={(value) => setDraft({ ...draft, terms: value })} value={draft.terms} />
        <div className="flex items-center justify-between border-t border-slate-100 pt-4"><b>{labels.total}: {currency.format(total(draft))}</b><div className="flex gap-2"><Button onClick={onClose} type="button" variant="outline">{labels.cancel}</Button><Button type="submit">{labels.saveEstimate}</Button></div></div>
      </form>
    </Modal>
  );
}

function SendEstimateModal({ estimate, labels, onClose, onSend }: { estimate: EstimateRecord; labels: ProposalLabels; onClose: () => void; onSend: (estimate: EstimateRecord, channel: "email" | "sms" | "both", message: string) => Promise<void> }) {
  const [channel, setChannel] = useState<"email" | "sms" | "both">("email");
  const [message, setMessage] = useState(`${labels.defaultSendMessage} ${publicEstimateLink(estimate)}`);
  const [isSending, setIsSending] = useState(false);
  return (
    <Modal onClose={onClose} title={`${labels.sendEstimate} · ${estimate.number}`}>
      <div className="grid gap-4">
        <PreviewBox title={labels.customer} value={`${estimate.customerName}\n${estimate.customerPhone || "-"}\n${estimate.customerEmail || "-"}`} />
        <PreviewBox title={labels.publicLink} value={publicEstimateLink(estimate)} />
        <Select label={labels.channel} onChange={(value) => setChannel(value as "email" | "sms" | "both")} value={channel}><option value="email">Email</option><option value="sms">SMS</option><option value="both">Both</option></Select>
        <TextArea label={labels.message} onChange={setMessage} value={message} />
        <div className="flex justify-end gap-2"><Button onClick={onClose} type="button" variant="outline">{labels.cancel}</Button><Button disabled={isSending} onClick={() => { setIsSending(true); onSend(estimate, channel, message).finally(() => setIsSending(false)); }} type="button">{labels.sendEstimate}</Button></div>
      </div>
    </Modal>
  );
}

function VoidEstimateModal({ estimate, labels, onClose, onVoid }: { estimate: EstimateRecord; labels: ProposalLabels; onClose: () => void; onVoid: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <Modal onClose={onClose} title={`${labels.voidEstimate} · ${estimate.number}`}>
      <div className="grid gap-4">
        <p className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700 ring-1 ring-red-100">{labels.voidWarning}</p>
        <TextArea label={labels.reason} onChange={setReason} value={reason} />
        <div className="flex justify-end gap-2"><Button onClick={onClose} type="button" variant="outline">{labels.cancel}</Button><Button disabled={!reason.trim()} onClick={() => onVoid(reason)} type="button" variant="danger">{labels.voidEstimate}</Button></div>
      </div>
    </Modal>
  );
}

function TextArea({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return <label className="grid gap-1.5 text-xs font-bold text-slate-600">{label}<textarea className="min-h-24 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-cyan-100" onChange={(event) => onChange(event.target.value)} value={value} /></label>;
}

function recurrenceFromFrequency(frequency: string) {
  const normalized = frequency.toLowerCase();
  if (normalized.includes("week") && !normalized.includes("2") && !normalized.includes("3") && !normalized.includes("4")) return "weekly";
  if (normalized.includes("2") || normalized.includes("bi")) return "every_2_weeks";
  if (normalized.includes("3")) return "every_3_weeks";
  if (normalized.includes("4") || normalized.includes("month")) return "every_4_weeks";
  return "no_repeat";
}

export function publicEstimateLink(estimate: Pick<EstimateRecord, "publicToken">) {
  if (typeof window === "undefined") {
    return `/estimate/${estimate.publicToken}`;
  }
  const locale = window.location.pathname.split("/").filter(Boolean)[0] || "pt";
  return `${window.location.origin}/${locale}/estimate/${estimate.publicToken}`;
}
