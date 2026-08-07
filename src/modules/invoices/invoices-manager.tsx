"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FilterX, MoreHorizontal, Plus, Printer, Send, WalletCards } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, EmptyState, Input, Modal, Table, Td, Th } from "@/components/design-system";
import { readLocalRecords, readRemoteRecords, writeLocalRecords } from "@/lib/storage/local-records";
import { hasPermission, type RoleCode } from "@/lib/permissions/permissions";
import { defaultClients, defaultPaymentMethods, type ClientRecord } from "@/modules/clients/types";

type InvoiceStatus = "draft" | "sent" | "viewed" | "partially_paid" | "paid" | "overdue" | "void";
type InvoiceSource = "cleaning" | "manual" | "recurring" | "other";
type PeriodFilter = "this_month" | "last_month" | "last_30_days" | "this_quarter" | "this_year" | "custom";
type SortKey = "number" | "customer" | "invoiceDate" | "dueDate" | "total" | "balanceDue" | "status";
type SortDirection = "asc" | "desc";
type WorkspaceTab = "overview" | "payments" | "communication" | "activity";

type InvoiceLineItem = {
  id: string;
  description: string;
  quantity: number;
  rate: number;
};

type InvoicePayment = {
  id: string;
  amount: number;
  date: string;
  method: string;
  reference: string;
  notes: string;
  recordedBy: string;
  status: "recorded" | "reversed";
};

type InvoiceActivity = {
  id: string;
  at: string;
  user: string;
  action: string;
  previousValue?: string;
  newValue?: string;
};

type InvoiceCommunication = {
  id: string;
  at: string;
  channel: "email" | "sms" | "both";
  message: string;
  sentBy: string;
};

type InvoiceRecord = {
  id: string;
  publicToken: string;
  number: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  billingAddress: string;
  serviceReference: string;
  source: InvoiceSource;
  sourceAppointmentId?: string;
  invoiceDate: string;
  dueDate: string;
  lineItems: InvoiceLineItem[];
  discount: number;
  tax: number;
  additionalCharges: number;
  notes: string;
  terms: string;
  internalNotes: string;
  paymentMethod?: string;
  status: InvoiceStatus;
  sentAt?: string;
  viewedAt?: string;
  voidReason?: string;
  voidedAt?: string;
  voidedBy?: string;
  payments: InvoicePayment[];
  communications: InvoiceCommunication[];
  activity: InvoiceActivity[];
  modifiedAfterSend?: boolean;
  createdAt: string;
  updatedAt: string;
};

type AppointmentRecord = {
  id: string;
  date: string;
  time: string;
  client: string;
  clientId?: string;
  service: string;
  status: string;
  price: string;
};

type InvoiceLabels = Record<string, string>;

const storageKey = "fastclean_invoices";
const clientsStorageKey = "fastclean_clients";
const appointmentsStorageKey = "fastclean_appointments";
const currentUser = "Current user";
const currency = new Intl.NumberFormat("en-US", { currency: "USD", style: "currency" });
const emptyInvoice: InvoiceRecord = {
  id: "",
  publicToken: "",
  number: "",
  customerName: "",
  billingAddress: "",
  serviceReference: "",
  source: "manual",
  invoiceDate: "",
  dueDate: "",
  lineItems: [{ id: "line_1", description: "", quantity: 1, rate: 0 }],
  discount: 0,
  tax: 0,
  additionalCharges: 0,
  notes: "",
  terms: "",
  internalNotes: "",
  paymentMethod: "",
  status: "draft",
  payments: [],
  communications: [],
  activity: [],
  createdAt: "",
  updatedAt: ""
};

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + days);
  return nextDate;
}

function parseMoney(value: string) {
  return Number(String(value).replace(/[^0-9.-]+/g, "")) || 0;
}

function invoiceSubtotal(invoice: InvoiceRecord) {
  return invoice.lineItems.reduce((total, item) => total + Number(item.quantity || 0) * Number(item.rate || 0), 0);
}

function invoiceTotal(invoice: InvoiceRecord) {
  return Math.max(0, invoiceSubtotal(invoice) - Number(invoice.discount || 0) + Number(invoice.tax || 0) + Number(invoice.additionalCharges || 0));
}

function amountPaid(invoice: InvoiceRecord) {
  return invoice.payments.filter((payment) => payment.status !== "reversed").reduce((total, payment) => total + Number(payment.amount || 0), 0);
}

function balanceDue(invoice: InvoiceRecord) {
  return Math.max(0, invoiceTotal(invoice) - amountPaid(invoice));
}

function derivedStatus(invoice: InvoiceRecord, today = dateKey(new Date())): InvoiceStatus {
  if (invoice.status === "void") return "void";
  if (balanceDue(invoice) <= 0 && invoiceTotal(invoice) > 0) return "paid";
  if (amountPaid(invoice) > 0) return "partially_paid";
  if (invoice.status !== "draft" && invoice.dueDate < today) return "overdue";
  return invoice.status === "viewed" ? "viewed" : invoice.status === "sent" ? "sent" : "draft";
}

function normalizeInvoice(invoice: InvoiceRecord): InvoiceRecord {
  const payments = Array.isArray(invoice.payments) ? invoice.payments : [];
  const nextInvoice = {
    ...emptyInvoice,
    ...invoice,
    lineItems: Array.isArray(invoice.lineItems) && invoice.lineItems.length > 0 ? invoice.lineItems : emptyInvoice.lineItems,
    payments,
    communications: Array.isArray(invoice.communications) ? invoice.communications : [],
    activity: Array.isArray(invoice.activity) ? invoice.activity : []
  };
  return { ...nextInvoice, status: derivedStatus(nextInvoice), updatedAt: nextInvoice.updatedAt || new Date().toISOString() };
}

function secureToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replaceAll("-", "");
  }
  return `${Date.now()}${Math.random().toString(36).slice(2)}`;
}

function nextInvoiceNumber(invoices: InvoiceRecord[]) {
  const maxNumber = invoices.reduce((max, invoice) => {
    const numeric = Number(invoice.number.replace(/\D/g, ""));
    return Number.isFinite(numeric) ? Math.max(max, numeric) : max;
  }, 1000);
  return `INV-${maxNumber + 1}`;
}

function activity(action: string, previousValue?: string, newValue?: string): InvoiceActivity {
  return { action, at: new Date().toISOString(), id: `act_${Date.now()}_${Math.random().toString(36).slice(2)}`, newValue, previousValue, user: currentUser };
}

function clientAddress(client: ClientRecord | undefined) {
  const address = client?.addresses?.[0];
  return address?.formatted || [address?.street, address?.city, address?.state, address?.postalCode].filter(Boolean).join(", ");
}

function generateInvoicesFromCompletedCleanings(appointments: AppointmentRecord[], clients: ClientRecord[], invoices: InvoiceRecord[], labels: InvoiceLabels) {
  const existingSources = new Set(invoices.map((invoice) => invoice.sourceAppointmentId).filter(Boolean));
  const completedAppointments = appointments.filter((appointment) => ["finished", "paid", "completed"].includes(appointment.status) && parseMoney(appointment.price) > 0 && !existingSources.has(appointment.id));
  let invoiceNumberSeed = invoices;
  const generated = completedAppointments.map((appointment) => {
    const client = clients.find((item) => item.id === appointment.clientId || item.name === appointment.client);
    const number = nextInvoiceNumber(invoiceNumberSeed);
    const invoice: InvoiceRecord = {
      ...emptyInvoice,
      id: `inv_${appointment.id}`,
      publicToken: secureToken(),
      number,
      customerId: client?.id,
      customerName: appointment.client,
      customerPhone: client?.phone,
      customerEmail: client?.email,
      billingAddress: clientAddress(client),
      serviceReference: `${appointment.service} · ${appointment.date}`,
      source: "cleaning",
      sourceAppointmentId: appointment.id,
      invoiceDate: appointment.date,
      dueDate: dateKey(addDays(new Date(`${appointment.date}T00:00:00`), 7)),
      lineItems: [{ id: `line_${appointment.id}`, description: appointment.service, quantity: 1, rate: parseMoney(appointment.price) }],
      paymentMethod: client?.primaryPaymentMethod || "",
      status: appointment.status === "paid" ? "paid" : "draft",
      payments: appointment.status === "paid" ? [{ id: `pay_${appointment.id}`, amount: parseMoney(appointment.price), date: appointment.date, method: client?.primaryPaymentMethod || "not_defined", notes: "", recordedBy: currentUser, reference: "", status: "recorded" }] : [],
      communications: [],
      activity: [activity(labels.createdFromCleaning)],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    invoiceNumberSeed = [invoice, ...invoiceNumberSeed];
    return normalizeInvoice(invoice);
  });
  return generated;
}

function periodRange(period: PeriodFilter, customStart: string, customEnd: string) {
  const today = new Date();
  let start = new Date(today.getFullYear(), today.getMonth(), 1);
  let end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  if (period === "last_month") {
    start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    end = new Date(today.getFullYear(), today.getMonth(), 0);
  } else if (period === "last_30_days") {
    start = addDays(today, -30);
    end = today;
  } else if (period === "this_quarter") {
    const quarterStart = Math.floor(today.getMonth() / 3) * 3;
    start = new Date(today.getFullYear(), quarterStart, 1);
    end = new Date(today.getFullYear(), quarterStart + 3, 0);
  } else if (period === "this_year") {
    start = new Date(today.getFullYear(), 0, 1);
    end = new Date(today.getFullYear(), 11, 31);
  } else if (period === "custom" && customStart && customEnd) {
    return { end: customEnd, start: customStart };
  }
  return { end: dateKey(end), start: dateKey(start) };
}

function statusTone(status: InvoiceStatus) {
  return status === "paid" ? "green" : status === "overdue" ? "red" : status === "partially_paid" ? "yellow" : status === "void" ? "gray" : status === "draft" ? "gray" : "blue";
}

function paymentMethodName(methodId: string) {
  if (!methodId) return "Not defined";
  return defaultPaymentMethods.find((method) => method.id === methodId)?.name ?? methodId;
}

function readRole(): RoleCode {
  if (typeof document === "undefined") return "owner";
  const role = document.cookie.split("; ").find((item) => item.startsWith("fastclean_role="))?.split("=")[1];
  return (role || "owner") as RoleCode;
}

function can(role: RoleCode, permission: string) {
  return hasPermission(role, permission) || hasPermission(role, "invoices.manage");
}

function statusLabel(status: InvoiceStatus, labels: InvoiceLabels) {
  return labels[`status.${status}`] ?? status;
}

function sourceLabel(source: InvoiceSource, labels: InvoiceLabels) {
  return labels[`source.${source}`] ?? source;
}

export function InvoicesManager({ labels }: { labels: InvoiceLabels }) {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("overview");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [recordPaymentForId, setRecordPaymentForId] = useState<string | null>(null);
  const [voidInvoiceId, setVoidInvoiceId] = useState<string | null>(null);
  const [deleteInvoiceId, setDeleteInvoiceId] = useState<string | null>(null);
  const [sendInvoiceId, setSendInvoiceId] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodFilter>("this_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [filters, setFilters] = useState({ customer: "", paymentMethod: "", search: "", source: "", status: "" });
  const [sort, setSort] = useState<{ direction: SortDirection; key: SortKey }>({ direction: "desc", key: "invoiceDate" });
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const role = readRole();
  const selectedInvoice = invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? null;
  const paymentInvoice = invoices.find((invoice) => invoice.id === recordPaymentForId) ?? null;
  const sendInvoice = invoices.find((invoice) => invoice.id === sendInvoiceId) ?? null;
  const voidInvoice = invoices.find((invoice) => invoice.id === voidInvoiceId) ?? null;
  const deleteInvoice = invoices.find((invoice) => invoice.id === deleteInvoiceId) ?? null;
  const range = periodRange(period, customStart, customEnd);

  useEffect(() => {
    const localInvoices = readLocalRecords<InvoiceRecord>(storageKey, []).map(normalizeInvoice);
    const localClients = readLocalRecords<ClientRecord>(clientsStorageKey, defaultClients);
    const localAppointments = readLocalRecords<AppointmentRecord>(appointmentsStorageKey, []);
    const generatedInvoices = generateInvoicesFromCompletedCleanings(localAppointments, localClients, localInvoices, labels);
    const mergedInvoices = [...generatedInvoices, ...localInvoices].map(normalizeInvoice);
    setClients(localClients);
    setInvoices(mergedInvoices);
    if (generatedInvoices.length > 0) {
      writeLocalRecords(storageKey, mergedInvoices);
    }
    readRemoteRecords(storageKey, mergedInvoices).then((records) => setInvoices(records.map(normalizeInvoice)));
    readRemoteRecords(clientsStorageKey, localClients).then(setClients);
  }, [labels]);

  function persist(nextInvoices: InvoiceRecord[]) {
    const normalized = nextInvoices.map(normalizeInvoice);
    setInvoices(normalized);
    writeLocalRecords(storageKey, normalized);
  }

  const filteredInvoices = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return invoices
      .filter((invoice) => {
        const status = derivedStatus(invoice);
        const haystack = `${invoice.number} ${invoice.customerName} ${invoice.customerPhone ?? ""} ${invoice.customerEmail ?? ""}`.toLowerCase();
        return (!search || haystack.includes(search))
          && (!filters.status || status === filters.status)
          && (!filters.paymentMethod || (filters.paymentMethod === "not_defined" ? !invoice.paymentMethod : invoice.paymentMethod === filters.paymentMethod))
          && (!filters.source || invoice.source === filters.source)
          && (!filters.customer || invoice.customerName === filters.customer);
      })
      .sort((first, second) => {
        const value = (invoice: InvoiceRecord) => {
          if (sort.key === "customer") return invoice.customerName;
          if (sort.key === "total") return invoiceTotal(invoice);
          if (sort.key === "balanceDue") return balanceDue(invoice);
          if (sort.key === "status") return derivedStatus(invoice);
          return invoice[sort.key];
        };
        const firstValue = value(first);
        const secondValue = value(second);
        const result = typeof firstValue === "number" && typeof secondValue === "number" ? firstValue - secondValue : String(firstValue).localeCompare(String(secondValue));
        return sort.direction === "asc" ? result : -result;
      });
  }, [filters, invoices, sort]);

  const periodInvoices = invoices.filter((invoice) => invoice.invoiceDate >= range.start && invoice.invoiceDate <= range.end);
  const receivedInPeriod = invoices.reduce((total, invoice) => total + invoice.payments.filter((payment) => payment.status !== "reversed" && payment.date >= range.start && payment.date <= range.end).reduce((sum, payment) => sum + payment.amount, 0), 0);
  const openInvoices = invoices.filter((invoice) => derivedStatus(invoice) !== "paid" && derivedStatus(invoice) !== "void" && balanceDue(invoice) > 0);
  const overdueInvoices = invoices.filter((invoice) => derivedStatus(invoice) === "overdue");
  const kpis = [
    { detail: `${openInvoices.length} ${labels.invoiceCount}`, label: labels.openBalance, tone: "blue", value: currency.format(openInvoices.reduce((total, invoice) => total + balanceDue(invoice), 0)) },
    { detail: `${overdueInvoices.length} ${labels.invoiceCount}`, label: labels.overdueBalance, tone: "red", value: currency.format(overdueInvoices.reduce((total, invoice) => total + balanceDue(invoice), 0)) },
    { detail: labels.selectedPeriod, label: labels.received, tone: "green", value: currency.format(receivedInPeriod) },
    { detail: labels.selectedPeriod, label: labels.invoiced, tone: "teal", value: currency.format(periodInvoices.reduce((total, invoice) => total + invoiceTotal(invoice), 0)) }
  ] as const;
  const paymentBreakdown = defaultPaymentMethods
    .filter((method) => ["zelle", "cash", "check", "credit_card", "ach_transfer", "other"].includes(method.id))
    .map((method) => ({ method, value: periodInvoices.filter((invoice) => invoice.paymentMethod === method.id).reduce((total, invoice) => total + invoiceTotal(invoice), 0) }));

  function updateSort(key: SortKey) {
    setSort((current) => ({ direction: current.key === key && current.direction === "asc" ? "desc" : "asc", key }));
  }

  function openInvoice(invoice: InvoiceRecord, tab: WorkspaceTab = "overview") {
    setSelectedInvoiceId(invoice.id);
    setWorkspaceTab(tab);
    setOpenMenuId(null);
  }

  function createInvoice() {
    const today = dateKey(new Date());
    const invoice: InvoiceRecord = {
      ...emptyInvoice,
      id: `inv_${Date.now()}`,
      publicToken: secureToken(),
      number: nextInvoiceNumber(invoices),
      invoiceDate: today,
      dueDate: dateKey(addDays(new Date(), 7)),
      status: "draft",
      activity: [activity(labels.auditCreated)],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    persist([invoice, ...invoices]);
    openInvoice(invoice);
  }

  function saveInvoice(invoice: InvoiceRecord) {
    const original = invoices.find((item) => item.id === invoice.id);
    if (!original) return;
    const nextTotal = invoiceTotal(invoice);
    if (amountPaid(original) > 0 && nextTotal < amountPaid(original)) return;
    const changedAfterSend = ["sent", "viewed", "partially_paid", "overdue"].includes(derivedStatus(original)) && invoiceTotal(original) !== nextTotal;
    const updatedInvoice = normalizeInvoice({
      ...invoice,
      modifiedAfterSend: invoice.modifiedAfterSend || changedAfterSend,
      activity: [...invoice.activity, activity(changedAfterSend ? labels.auditFinancialEdit : labels.auditEdited)],
      updatedAt: new Date().toISOString()
    });
    persist(invoices.map((item) => (item.id === invoice.id ? updatedInvoice : item)));
    setSelectedInvoiceId(updatedInvoice.id);
  }

  function duplicateInvoice(invoice: InvoiceRecord) {
    if (!can(role, "invoice.duplicate")) return;
    const today = dateKey(new Date());
    const duplicate: InvoiceRecord = normalizeInvoice({
      ...invoice,
      id: `inv_${Date.now()}`,
      publicToken: secureToken(),
      number: nextInvoiceNumber(invoices),
      status: "draft",
      invoiceDate: today,
      dueDate: dateKey(addDays(new Date(), 7)),
      sentAt: undefined,
      viewedAt: undefined,
      voidReason: undefined,
      voidedAt: undefined,
      voidedBy: undefined,
      payments: [],
      communications: [],
      activity: [activity(labels.auditDuplicated, invoice.number)],
      modifiedAfterSend: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    persist([duplicate, ...invoices]);
    openInvoice(duplicate);
  }

  function sendSelectedInvoice(invoice: InvoiceRecord, channel: "email" | "sms" | "both", message: string) {
    if (!can(role, "invoice.send")) return;
    const nextInvoice = normalizeInvoice({
      ...invoice,
      status: invoice.status === "draft" ? "sent" : invoice.status,
      sentAt: new Date().toISOString(),
      communications: [...invoice.communications, { at: new Date().toISOString(), channel, id: `com_${Date.now()}`, message, sentBy: currentUser }],
      activity: [...invoice.activity, activity(invoice.sentAt ? labels.auditResent : labels.auditSent, undefined, channel)],
      updatedAt: new Date().toISOString()
    });
    persist(invoices.map((item) => (item.id === invoice.id ? nextInvoice : item)));
    setSendInvoiceId(null);
  }

  function recordPayment(invoice: InvoiceRecord, payment: Omit<InvoicePayment, "id" | "recordedBy" | "status">) {
    if (!can(role, "invoice.recordPayment")) return;
    const nextPayment = { ...payment, id: `pay_${Date.now()}`, recordedBy: currentUser, status: "recorded" as const };
    const nextInvoice = normalizeInvoice({
      ...invoice,
      payments: [...invoice.payments, nextPayment],
      paymentMethod: payment.method || invoice.paymentMethod,
      activity: [...invoice.activity, activity(labels.auditPaymentRecorded, undefined, currency.format(payment.amount))],
      updatedAt: new Date().toISOString()
    });
    persist(invoices.map((item) => (item.id === invoice.id ? nextInvoice : item)));
    setRecordPaymentForId(null);
    setSelectedInvoiceId(nextInvoice.id);
    setWorkspaceTab("payments");
  }

  function reversePayment(invoice: InvoiceRecord, paymentId: string) {
    if (!can(role, "invoice.reversePayment")) return;
    const nextInvoice = normalizeInvoice({
      ...invoice,
      payments: invoice.payments.map((payment) => (payment.id === paymentId ? { ...payment, status: "reversed" as const } : payment)),
      activity: [...invoice.activity, activity(labels.auditPaymentReversed)],
      updatedAt: new Date().toISOString()
    });
    persist(invoices.map((item) => (item.id === invoice.id ? nextInvoice : item)));
  }

  function voidSelectedInvoice(invoice: InvoiceRecord, reason: string) {
    if (!can(role, "invoice.void")) return;
    const nextInvoice = normalizeInvoice({
      ...invoice,
      status: "void",
      voidReason: reason,
      voidedAt: new Date().toISOString(),
      voidedBy: currentUser,
      activity: [...invoice.activity, activity(labels.auditVoided, undefined, reason)],
      updatedAt: new Date().toISOString()
    });
    persist(invoices.map((item) => (item.id === invoice.id ? nextInvoice : item)));
    setVoidInvoiceId(null);
  }

  function deleteSelectedInvoice(invoice: InvoiceRecord) {
    if (!can(role, "invoice.delete") || derivedStatus(invoice) !== "draft" || invoice.payments.length > 0) return;
    persist(invoices.filter((item) => item.id !== invoice.id));
    setDeleteInvoiceId(null);
    if (selectedInvoiceId === invoice.id) setSelectedInvoiceId(null);
  }

  function copyPaymentLink(invoice: InvoiceRecord) {
    const link = `${window.location.origin}/invoice/${invoice.publicToken}`;
    navigator.clipboard?.writeText(link).catch(() => undefined);
  }

  function printInvoice(invoice: InvoiceRecord) {
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) return;
    const rows = invoice.lineItems.map((item) => `<tr><td>${item.description}</td><td>${item.quantity}</td><td>${currency.format(item.rate)}</td><td>${currency.format(item.quantity * item.rate)}</td></tr>`).join("");
    printWindow.document.write(`<html><head><title>${invoice.number}</title><style>body{font-family:Arial;padding:32px;color:#0f172a}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #e2e8f0;padding:10px;text-align:left}.total{font-weight:700;font-size:20px}</style></head><body><h1>FastClean Pro</h1><h2>${invoice.number}</h2><p>${invoice.customerName}<br>${invoice.billingAddress}</p><table><thead><tr><th>${labels.description}</th><th>${labels.quantity}</th><th>${labels.rate}</th><th>${labels.amount}</th></tr></thead><tbody>${rows}</tbody></table><p class="total">${labels.total}: ${currency.format(invoiceTotal(invoice))}</p><p>${labels.balanceDue}: ${currency.format(balanceDue(invoice))}</p><p>${invoice.notes}</p></body></html>`);
    printWindow.document.close();
    printWindow.print();
  }

  const selectedAll = filteredInvoices.length > 0 && filteredInvoices.every((invoice) => selectedRows.includes(invoice.id));

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-950">{labels.title}</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">{labels.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => window.print()} type="button" variant="outline"><Download className="h-4 w-4" />{labels.export}</Button>
          <Button onClick={createInvoice} type="button"><Plus className="h-4 w-4" />{labels.newInvoice}</Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-3">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">{kpi.label}</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{kpi.value}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">{kpi.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="grid gap-3 lg:grid-cols-[1.2fr_repeat(5,minmax(0,1fr))_auto] lg:items-end">
          <Input label={labels.search} name="invoiceSearch" onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder={labels.searchPlaceholder} value={filters.search} />
          <Select label={labels.period} onChange={(value) => setPeriod(value as PeriodFilter)} value={period}>
            <option value="this_month">{labels.periodThisMonth}</option>
            <option value="last_month">{labels.periodLastMonth}</option>
            <option value="last_30_days">{labels.periodLast30Days}</option>
            <option value="this_quarter">{labels.periodThisQuarter}</option>
            <option value="this_year">{labels.periodThisYear}</option>
            <option value="custom">{labels.periodCustom}</option>
          </Select>
          <Select label={labels.status} onChange={(value) => setFilters((current) => ({ ...current, status: value }))} value={filters.status}>
            <option value="">{labels.allStatuses}</option>
            {(["draft", "sent", "viewed", "partially_paid", "paid", "overdue", "void"] as InvoiceStatus[]).map((status) => <option key={status} value={status}>{statusLabel(status, labels)}</option>)}
          </Select>
          <Select label={labels.paymentMethod} onChange={(value) => setFilters((current) => ({ ...current, paymentMethod: value }))} value={filters.paymentMethod}>
            <option value="">{labels.allPaymentMethods}</option>
            <option value="not_defined">{labels.notDefined}</option>
            {defaultPaymentMethods.filter((method) => ["zelle", "cash", "check", "credit_card", "ach_transfer", "other"].includes(method.id)).map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}
          </Select>
          <Select label={labels.source} onChange={(value) => setFilters((current) => ({ ...current, source: value }))} value={filters.source}>
            <option value="">{labels.allSources}</option>
            {(["cleaning", "manual", "recurring", "other"] as InvoiceSource[]).map((source) => <option key={source} value={source}>{sourceLabel(source, labels)}</option>)}
          </Select>
          <Select label={labels.customer} onChange={(value) => setFilters((current) => ({ ...current, customer: value }))} value={filters.customer}>
            <option value="">{labels.allCustomers}</option>
            {Array.from(new Set(invoices.map((invoice) => invoice.customerName).filter(Boolean))).sort().map((customer) => <option key={customer} value={customer}>{customer}</option>)}
          </Select>
          <Button onClick={() => { setFilters({ customer: "", paymentMethod: "", search: "", source: "", status: "" }); setPeriod("this_month"); }} type="button" variant="outline"><FilterX className="h-4 w-4" />{labels.clearFilters}</Button>
          {period === "custom" ? (
            <div className="grid gap-3 lg:col-span-full sm:grid-cols-2">
              <Input label={labels.startDate} name="customStart" onChange={(event) => setCustomStart(event.target.value)} type="date" value={customStart} />
              <Input label={labels.endDate} name="customEnd" onChange={(event) => setCustomEnd(event.target.value)} type="date" value={customEnd} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      {selectedRows.length > 0 ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-2 p-3">
            <p className="text-sm font-black text-slate-700">{selectedRows.length} {labels.selected}</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => window.print()} type="button" variant="outline">{labels.export}</Button>
              <Button onClick={() => selectedRows.forEach((id) => { const invoice = invoices.find((item) => item.id === id); if (invoice && derivedStatus(invoice) !== "void") voidSelectedInvoice(invoice, labels.bulkVoidReason); })} type="button" variant="outline">{labels.markVoid}</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-black text-slate-950">{labels.invoiceTable}</h2>
            <p className="text-xs font-semibold text-slate-500">{filteredInvoices.length} {labels.invoiceCount}</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <WalletCards className="h-4 w-4 text-primary" />
            {labels.paymentBreakdown}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {paymentBreakdown.map(({ method, value }) => (
              <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-100" key={method.id}>
                <p className="text-[11px] font-black uppercase text-slate-400">{method.name}</p>
                <p className="mt-1 text-sm font-black text-slate-900">{currency.format(value)}</p>
              </div>
            ))}
          </div>

          <div className="hidden lg:block">
            <Table>
              <thead>
                <tr>
                  <Th><input checked={selectedAll} onChange={(event) => setSelectedRows(event.target.checked ? filteredInvoices.map((invoice) => invoice.id) : [])} type="checkbox" /></Th>
                  <SortableTh label={labels.invoiceNumber} onClick={() => updateSort("number")} />
                  <SortableTh label={labels.customer} onClick={() => updateSort("customer")} />
                  <Th>{labels.serviceJob}</Th>
                  <SortableTh label={labels.invoiceDate} onClick={() => updateSort("invoiceDate")} />
                  <SortableTh label={labels.dueDate} onClick={() => updateSort("dueDate")} />
                  <SortableTh label={labels.total} onClick={() => updateSort("total")} />
                  <SortableTh label={labels.balanceDue} onClick={() => updateSort("balanceDue")} />
                  <Th>{labels.paymentMethod}</Th>
                  <SortableTh label={labels.status} onClick={() => updateSort("status")} />
                  <Th>{labels.actions}</Th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr className="cursor-pointer transition hover:bg-cyan-50/30" key={invoice.id} onClick={() => openInvoice(invoice)}>
                    <Td><input checked={selectedRows.includes(invoice.id)} onChange={(event) => { event.stopPropagation(); setSelectedRows((current) => event.target.checked ? [...current, invoice.id] : current.filter((id) => id !== invoice.id)); }} onClick={(event) => event.stopPropagation()} type="checkbox" /></Td>
                    <Td><button className="font-black text-cyan-700 hover:underline" onClick={(event) => { event.stopPropagation(); openInvoice(invoice); }} type="button">{invoice.number}</button></Td>
                    <Td><span className="font-black text-slate-950">{invoice.customerName || labels.noCustomer}</span></Td>
                    <Td>{invoice.serviceReference || "-"}</Td>
                    <Td>{invoice.invoiceDate}</Td>
                    <Td>{invoice.dueDate}</Td>
                    <Td><span className="font-black text-slate-950">{currency.format(invoiceTotal(invoice))}</span></Td>
                    <Td><span className="font-black text-slate-950">{currency.format(balanceDue(invoice))}</span></Td>
                    <Td>{paymentMethodName(invoice.paymentMethod ?? "")}</Td>
                    <Td><Badge tone={statusTone(derivedStatus(invoice))}>{statusLabel(derivedStatus(invoice), labels)}</Badge></Td>
                    <Td><InvoiceActions invoice={invoice} labels={labels} menuOpen={openMenuId === invoice.id} onCopyLink={copyPaymentLink} onDelete={(item) => setDeleteInvoiceId(item.id)} onDuplicate={duplicateInvoice} onOpen={openInvoice} onPayment={(item) => setRecordPaymentForId(item.id)} onPrint={printInvoice} onSend={(item) => setSendInvoiceId(item.id)} onToggleMenu={() => setOpenMenuId(openMenuId === invoice.id ? null : invoice.id)} onVoid={(item) => setVoidInvoiceId(item.id)} role={role} /></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>

          <div className="grid gap-3 lg:hidden">
            {filteredInvoices.map((invoice) => (
              <button className="rounded-xl border border-slate-100 bg-white p-4 text-left shadow-sm" key={invoice.id} onClick={() => openInvoice(invoice)} type="button">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-cyan-700">{invoice.number}</p>
                    <p className="mt-1 text-base font-black text-slate-950">{invoice.customerName || labels.noCustomer}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">{labels.dueDate}: {invoice.dueDate}</p>
                  </div>
                  <Badge tone={statusTone(derivedStatus(invoice))}>{statusLabel(derivedStatus(invoice), labels)}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <span><b>{labels.total}</b><br />{currency.format(invoiceTotal(invoice))}</span>
                  <span><b>{labels.balanceDue}</b><br />{currency.format(balanceDue(invoice))}</span>
                </div>
              </button>
            ))}
          </div>

          {filteredInvoices.length === 0 ? <EmptyState title={labels.emptyTitle} description={labels.emptyDescription} /> : null}
        </CardContent>
      </Card>

      {selectedInvoice ? (
        <InvoiceWorkspace
          clients={clients}
          invoice={selectedInvoice}
          labels={labels}
          onClose={() => setSelectedInvoiceId(null)}
          onCopyLink={copyPaymentLink}
          onDelete={(invoice) => setDeleteInvoiceId(invoice.id)}
          onDuplicate={duplicateInvoice}
          onOpenPayment={(invoice) => setRecordPaymentForId(invoice.id)}
          onPrint={printInvoice}
          onReversePayment={reversePayment}
          onSave={saveInvoice}
          onSend={(invoice) => setSendInvoiceId(invoice.id)}
          onVoid={(invoice) => setVoidInvoiceId(invoice.id)}
          role={role}
          setTab={setWorkspaceTab}
          tab={workspaceTab}
        />
      ) : null}

      {paymentInvoice ? <PaymentModal invoice={paymentInvoice} labels={labels} onClose={() => setRecordPaymentForId(null)} onSubmit={recordPayment} /> : null}
      {sendInvoice ? <SendInvoiceModal invoice={sendInvoice} labels={labels} onClose={() => setSendInvoiceId(null)} onSubmit={sendSelectedInvoice} /> : null}
      {voidInvoice ? <ReasonModal invoice={voidInvoice} labels={labels} onClose={() => setVoidInvoiceId(null)} onSubmit={voidSelectedInvoice} title={labels.voidInvoice} /> : null}
      {deleteInvoice ? <DeleteInvoiceModal invoice={deleteInvoice} labels={labels} onClose={() => setDeleteInvoiceId(null)} onDelete={deleteSelectedInvoice} /> : null}
    </div>
  );
}

function Select({ children, label, onChange, value }: { children: React.ReactNode; label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="grid min-w-0 gap-1.5 text-xs font-bold text-slate-600">
      {label}
      <select className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-cyan-100" onChange={(event) => onChange(event.target.value)} value={value}>
        {children}
      </select>
    </label>
  );
}

function SortableTh({ label, onClick }: { label: string; onClick: () => void }) {
  return <Th><button className="font-black uppercase tracking-wide hover:text-cyan-700" onClick={onClick} type="button">{label}</button></Th>;
}

function InvoiceActions({
  invoice,
  labels,
  menuOpen,
  onCopyLink,
  onDelete,
  onDuplicate,
  onOpen,
  onPayment,
  onPrint,
  onSend,
  onToggleMenu,
  onVoid,
  role
}: {
  invoice: InvoiceRecord;
  labels: InvoiceLabels;
  menuOpen: boolean;
  onCopyLink: (invoice: InvoiceRecord) => void;
  onDelete: (invoice: InvoiceRecord) => void;
  onDuplicate: (invoice: InvoiceRecord) => void;
  onOpen: (invoice: InvoiceRecord, tab?: WorkspaceTab) => void;
  onPayment: (invoice: InvoiceRecord) => void;
  onPrint: (invoice: InvoiceRecord) => void;
  onSend: (invoice: InvoiceRecord) => void;
  onToggleMenu: () => void;
  onVoid: (invoice: InvoiceRecord) => void;
  role: RoleCode;
}) {
  const status = derivedStatus(invoice);
  const canDelete = can(role, "invoice.delete") && status === "draft" && invoice.payments.length === 0;
  const canVoid = can(role, "invoice.void") && status !== "draft" && status !== "void";
  return (
    <div className="relative" onClick={(event) => event.stopPropagation()}>
      <button className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 hover:bg-slate-50" onClick={onToggleMenu} type="button"><MoreHorizontal className="h-4 w-4" /></button>
      {menuOpen ? (
        <div className="absolute right-0 z-20 mt-2 grid w-48 rounded-lg border border-slate-200 bg-white p-1 text-xs font-bold shadow-xl">
          <MenuButton label={labels.view} onClick={() => onOpen(invoice)} />
          {status !== "paid" && status !== "void" && can(role, "invoice.edit") ? <MenuButton label={labels.edit} onClick={() => onOpen(invoice)} /> : null}
          {status !== "void" && can(role, "invoice.send") ? <MenuButton label={invoice.sentAt ? labels.resend : labels.send} onClick={() => onSend(invoice)} /> : null}
          <MenuButton label={labels.print} onClick={() => onPrint(invoice)} />
          <MenuButton label={labels.downloadPdf} onClick={() => onPrint(invoice)} />
          <MenuButton label={labels.copyPaymentLink} onClick={() => onCopyLink(invoice)} />
          {status !== "paid" && status !== "void" && can(role, "invoice.recordPayment") ? <MenuButton label={labels.recordPayment} onClick={() => onPayment(invoice)} /> : null}
          <MenuButton label={labels.paymentHistory} onClick={() => onOpen(invoice, "payments")} />
          {can(role, "invoice.duplicate") ? <MenuButton label={labels.duplicate} onClick={() => onDuplicate(invoice)} /> : null}
          {canVoid ? <MenuButton label={labels.markVoid} onClick={() => onVoid(invoice)} /> : null}
          {canDelete ? <MenuButton danger label={labels.delete} onClick={() => onDelete(invoice)} /> : null}
          <MenuButton label={labels.viewActivity} onClick={() => onOpen(invoice, "activity")} />
        </div>
      ) : null}
    </div>
  );
}

function MenuButton({ danger, label, onClick }: { danger?: boolean; label: string; onClick: () => void }) {
  return <button className={`rounded-md px-3 py-2 text-left hover:bg-slate-50 ${danger ? "text-red-600" : "text-slate-700"}`} onClick={onClick} type="button">{label}</button>;
}

function InvoiceWorkspace({
  clients,
  invoice,
  labels,
  onClose,
  onCopyLink,
  onDelete,
  onDuplicate,
  onOpenPayment,
  onPrint,
  onReversePayment,
  onSave,
  onSend,
  onVoid,
  role,
  setTab,
  tab
}: {
  clients: ClientRecord[];
  invoice: InvoiceRecord;
  labels: InvoiceLabels;
  onClose: () => void;
  onCopyLink: (invoice: InvoiceRecord) => void;
  onDelete: (invoice: InvoiceRecord) => void;
  onDuplicate: (invoice: InvoiceRecord) => void;
  onOpenPayment: (invoice: InvoiceRecord) => void;
  onPrint: (invoice: InvoiceRecord) => void;
  onReversePayment: (invoice: InvoiceRecord, paymentId: string) => void;
  onSave: (invoice: InvoiceRecord) => void;
  onSend: (invoice: InvoiceRecord) => void;
  onVoid: (invoice: InvoiceRecord) => void;
  role: RoleCode;
  setTab: (tab: WorkspaceTab) => void;
  tab: WorkspaceTab;
}) {
  const [draft, setDraft] = useState(invoice);
  const status = derivedStatus(draft);
  const locked = status === "paid" || status === "void" || !can(role, "invoice.edit");
  const maxPaidGuard = amountPaid(invoice);

  useEffect(() => setDraft(invoice), [invoice]);

  function updateLine(id: string, patch: Partial<InvoiceLineItem>) {
    setDraft((current) => ({ ...current, lineItems: current.lineItems.map((item) => (item.id === id ? { ...item, ...patch } : item)) }));
  }

  function addLine() {
    setDraft((current) => ({ ...current, lineItems: [...current.lineItems, { id: `line_${Date.now()}`, description: "", quantity: 1, rate: 0 }] }));
  }

  function removeLine(id: string) {
    setDraft((current) => ({ ...current, lineItems: current.lineItems.filter((item) => item.id !== id) }));
  }

  function save() {
    if (invoiceTotal(draft) < maxPaidGuard) return;
    onSave(draft);
  }

  return (
    <Modal onClose={onClose} title={`${labels.invoiceWorkspace} · ${invoice.number}`}>
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {(["overview", "payments", "communication", "activity"] as WorkspaceTab[]).map((item) => (
              <button className={`rounded-lg px-3 py-2 text-xs font-black ${tab === item ? "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100" : "text-slate-500 hover:bg-slate-50"}`} key={item} onClick={() => setTab(item)} type="button">{labels[`tab.${item}`]}</button>
            ))}
          </div>
          <Badge tone={statusTone(status)}>{statusLabel(status, labels)}</Badge>
        </div>

        {draft.modifiedAfterSend ? <p className="rounded-lg bg-yellow-50 p-3 text-xs font-black text-yellow-800 ring-1 ring-yellow-100">{labels.modifiedAfterSend}</p> : null}
        {invoiceTotal(draft) < maxPaidGuard ? <p className="rounded-lg bg-red-50 p-3 text-xs font-black text-red-700 ring-1 ring-red-100">{labels.totalBelowPaid}</p> : null}

        {tab === "overview" ? (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Input disabled={locked} label={labels.invoiceNumber} name="number" onChange={(event) => setDraft({ ...draft, number: event.target.value })} value={draft.number} />
              <Input disabled={locked} label={labels.invoiceDate} name="invoiceDate" onChange={(event) => setDraft({ ...draft, invoiceDate: event.target.value })} type="date" value={draft.invoiceDate} />
              <Input disabled={locked} label={labels.dueDate} name="dueDate" onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })} type="date" value={draft.dueDate} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Select label={labels.customer} onChange={(value) => {
                const client = clients.find((item) => item.name === value);
                setDraft({ ...draft, billingAddress: clientAddress(client), customerEmail: client?.email, customerId: client?.id, customerName: value, customerPhone: client?.phone, paymentMethod: client?.primaryPaymentMethod || draft.paymentMethod });
              }} value={draft.customerName}>
                <option value="">{labels.noCustomer}</option>
                {clients.map((client) => <option key={client.id} value={client.name}>{client.name}</option>)}
              </Select>
              <Input disabled={locked} label={labels.serviceJob} name="serviceReference" onChange={(event) => setDraft({ ...draft, serviceReference: event.target.value })} value={draft.serviceReference} />
            </div>
            <label className="grid gap-1.5 text-xs font-bold text-slate-600">
              {labels.billingAddress}
              <textarea className="min-h-20 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-cyan-100" disabled={locked} onChange={(event) => setDraft({ ...draft, billingAddress: event.target.value })} value={draft.billingAddress} />
            </label>
            <div className="grid gap-2">
              <p className="text-sm font-black text-slate-950">{labels.lineItems}</p>
              {draft.lineItems.map((item) => (
                <div className="grid gap-2 rounded-lg border border-slate-100 p-3 md:grid-cols-[1fr_5rem_7rem_7rem_auto] md:items-end" key={item.id}>
                  <Input disabled={locked} label={labels.description} name={`description_${item.id}`} onChange={(event) => updateLine(item.id, { description: event.target.value })} value={item.description} />
                  <Input disabled={locked} label={labels.quantity} name={`quantity_${item.id}`} onChange={(event) => updateLine(item.id, { quantity: Number(event.target.value) })} type="number" value={item.quantity} />
                  <Input disabled={locked} label={labels.rate} name={`rate_${item.id}`} onChange={(event) => updateLine(item.id, { rate: Number(event.target.value) })} type="number" value={item.rate} />
                  <p className="text-sm font-black text-slate-950">{labels.amount}<br />{currency.format(item.quantity * item.rate)}</p>
                  <Button disabled={locked || draft.lineItems.length === 1} onClick={() => removeLine(item.id)} type="button" variant="outline">{labels.remove}</Button>
                </div>
              ))}
              <Button disabled={locked} onClick={addLine} type="button" variant="outline">{labels.addLine}</Button>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Input disabled={locked} label={labels.discount} name="discount" onChange={(event) => setDraft({ ...draft, discount: Number(event.target.value) })} type="number" value={draft.discount} />
              <Input disabled={locked} label={labels.tax} name="tax" onChange={(event) => setDraft({ ...draft, tax: Number(event.target.value) })} type="number" value={draft.tax} />
              <Input disabled={locked} label={labels.additionalCharges} name="additionalCharges" onChange={(event) => setDraft({ ...draft, additionalCharges: Number(event.target.value) })} type="number" value={draft.additionalCharges} />
            </div>
            <div className="grid gap-2 rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-700 ring-1 ring-slate-100 md:grid-cols-2">
              <p>{labels.subtotal}: <b>{currency.format(invoiceSubtotal(draft))}</b></p>
              <p>{labels.total}: <b>{currency.format(invoiceTotal(draft))}</b></p>
              <p>{labels.amountPaid}: <b>{currency.format(amountPaid(draft))}</b></p>
              <p>{labels.balanceDue}: <b>{currency.format(balanceDue(draft))}</b></p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <TextArea disabled={locked} label={labels.notes} onChange={(value) => setDraft({ ...draft, notes: value })} value={draft.notes} />
              <TextArea disabled={locked} label={labels.terms} onChange={(value) => setDraft({ ...draft, terms: value })} value={draft.terms} />
              <TextArea disabled={locked} label={labels.internalNotes} onChange={(value) => setDraft({ ...draft, internalNotes: value })} value={draft.internalNotes} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button disabled={locked || invoiceTotal(draft) < maxPaidGuard} onClick={save} type="button">{labels.saveChanges}</Button>
              <Button onClick={() => onSend(invoice)} type="button" variant="outline"><Send className="h-4 w-4" />{labels.send}</Button>
              <Button onClick={() => onOpenPayment(invoice)} type="button" variant="outline"><WalletCards className="h-4 w-4" />{labels.recordPayment}</Button>
              <Button onClick={() => onPrint(invoice)} type="button" variant="outline"><Printer className="h-4 w-4" />{labels.print}</Button>
              <Button onClick={() => onCopyLink(invoice)} type="button" variant="outline">{labels.copyPaymentLink}</Button>
              <Button onClick={() => onDuplicate(invoice)} type="button" variant="outline">{labels.duplicate}</Button>
              {status !== "draft" && status !== "void" ? <Button onClick={() => onVoid(invoice)} type="button" variant="outline">{labels.markVoid}</Button> : null}
              {status === "draft" && invoice.payments.length === 0 ? <Button onClick={() => onDelete(invoice)} type="button" variant="danger">{labels.delete}</Button> : null}
            </div>
          </div>
        ) : null}

        {tab === "payments" ? <PaymentsPanel invoice={invoice} labels={labels} onRecord={() => onOpenPayment(invoice)} onReverse={(paymentId) => onReversePayment(invoice, paymentId)} role={role} /> : null}
        {tab === "communication" ? <CommunicationPanel invoice={invoice} labels={labels} onSend={() => onSend(invoice)} /> : null}
        {tab === "activity" ? <ActivityPanel invoice={invoice} labels={labels} /> : null}
      </div>
    </Modal>
  );
}

function TextArea({ disabled, label, onChange, value }: { disabled?: boolean; label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="grid gap-1.5 text-xs font-bold text-slate-600">
      {label}
      <textarea className="min-h-24 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-cyan-100" disabled={disabled} onChange={(event) => onChange(event.target.value)} value={value} />
    </label>
  );
}

function PaymentsPanel({ invoice, labels, onRecord, onReverse, role }: { invoice: InvoiceRecord; labels: InvoiceLabels; onRecord: () => void; onReverse: (paymentId: string) => void; role: RoleCode }) {
  return (
    <div className="grid gap-3">
      <div className="flex justify-between gap-2">
        <p className="text-sm font-black text-slate-950">{labels.paymentHistory}</p>
        <Button disabled={derivedStatus(invoice) === "void"} onClick={onRecord} type="button">{labels.recordPayment}</Button>
      </div>
      {invoice.payments.length === 0 ? <EmptyState title={labels.noPaymentsTitle} description={labels.noPaymentsDescription} /> : null}
      {invoice.payments.map((payment) => (
        <div className="grid gap-2 rounded-lg border border-slate-100 p-3 text-sm md:grid-cols-[1fr_1fr_1fr_auto] md:items-center" key={payment.id}>
          <div><b>{payment.date}</b><br />{paymentMethodName(payment.method)}</div>
          <div>{currency.format(payment.amount)}<br /><span className="text-xs text-slate-500">{payment.reference || "-"}</span></div>
          <div>{payment.recordedBy}<br /><Badge tone={payment.status === "reversed" ? "red" : "green"}>{payment.status}</Badge></div>
          {payment.status !== "reversed" && can(role, "invoice.reversePayment") ? <Button onClick={() => onReverse(payment.id)} type="button" variant="outline">{labels.reverse}</Button> : null}
        </div>
      ))}
    </div>
  );
}

function CommunicationPanel({ invoice, labels, onSend }: { invoice: InvoiceRecord; labels: InvoiceLabels; onSend: () => void }) {
  return (
    <div className="grid gap-3">
      <Button onClick={onSend} type="button"><Send className="h-4 w-4" />{labels.sendInvoice}</Button>
      {invoice.communications.length === 0 ? <EmptyState title={labels.noCommunicationTitle} description={labels.noCommunicationDescription} /> : null}
      {invoice.communications.map((item) => (
        <div className="rounded-lg border border-slate-100 p-3 text-sm" key={item.id}>
          <p className="font-black text-slate-950">{item.channel} · {new Date(item.at).toLocaleString()}</p>
          <p className="mt-1 text-slate-600">{item.message}</p>
        </div>
      ))}
    </div>
  );
}

function ActivityPanel({ invoice, labels }: { invoice: InvoiceRecord; labels: InvoiceLabels }) {
  return (
    <div className="grid gap-2">
      {invoice.activity.length === 0 ? <EmptyState title={labels.noActivityTitle} description={labels.noActivityDescription} /> : null}
      {invoice.activity.map((item) => (
        <div className="rounded-lg bg-slate-50 p-3 text-sm ring-1 ring-slate-100" key={item.id}>
          <p className="font-black text-slate-950">{item.action}</p>
          <p className="text-xs font-bold text-slate-500">{new Date(item.at).toLocaleString()} · {item.user}</p>
          {item.previousValue || item.newValue ? <p className="mt-1 text-xs text-slate-500">{item.previousValue ?? "-"} → {item.newValue ?? "-"}</p> : null}
        </div>
      ))}
    </div>
  );
}

function PaymentModal({ invoice, labels, onClose, onSubmit }: { invoice: InvoiceRecord; labels: InvoiceLabels; onClose: () => void; onSubmit: (invoice: InvoiceRecord, payment: Omit<InvoicePayment, "id" | "recordedBy" | "status">) => void }) {
  const [payment, setPayment] = useState({ amount: balanceDue(invoice), date: dateKey(new Date()), method: invoice.paymentMethod || "zelle", notes: "", reference: "" });
  return (
    <Modal onClose={onClose} title={`${labels.recordPayment} · ${invoice.number}`}>
      <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); onSubmit(invoice, payment); }}>
        <p className="rounded-lg bg-cyan-50 p-3 text-sm font-black text-cyan-800 ring-1 ring-cyan-100">{labels.invoiceTotal}: {currency.format(invoiceTotal(invoice))} · {labels.balanceDue}: {currency.format(balanceDue(invoice))}</p>
        <Input label={labels.amount} min="0" name="paymentAmount" onChange={(event) => setPayment({ ...payment, amount: Number(event.target.value) })} step="0.01" type="number" value={payment.amount} />
        <Input label={labels.paymentDate} name="paymentDate" onChange={(event) => setPayment({ ...payment, date: event.target.value })} type="date" value={payment.date} />
        <Select label={labels.paymentMethod} onChange={(value) => setPayment({ ...payment, method: value })} value={payment.method}>
          {["zelle", "cash", "check", "credit_card", "ach_transfer", "other"].map((method) => <option key={method} value={method}>{paymentMethodName(method)}</option>)}
        </Select>
        <Input label={labels.reference} name="reference" onChange={(event) => setPayment({ ...payment, reference: event.target.value })} value={payment.reference} />
        <TextArea label={labels.notes} onChange={(value) => setPayment({ ...payment, notes: value })} value={payment.notes} />
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} type="button" variant="outline">{labels.cancel}</Button>
          <Button disabled={payment.amount <= 0} type="submit">{labels.recordPayment}</Button>
        </div>
      </form>
    </Modal>
  );
}

function SendInvoiceModal({ invoice, labels, onClose, onSubmit }: { invoice: InvoiceRecord; labels: InvoiceLabels; onClose: () => void; onSubmit: (invoice: InvoiceRecord, channel: "email" | "sms" | "both", message: string) => void }) {
  const [channel, setChannel] = useState<"email" | "sms" | "both">("email");
  const [message, setMessage] = useState(`${labels.defaultSendMessage} ${invoice.number} ${currency.format(balanceDue(invoice))}`);
  return (
    <Modal onClose={onClose} title={`${labels.sendInvoice} · ${invoice.number}`}>
      <div className="grid gap-3">
        <div className="rounded-lg bg-slate-50 p-3 text-sm ring-1 ring-slate-100">
          <p><b>{labels.customer}:</b> {invoice.customerName || labels.noCustomer}</p>
          <p><b>{labels.email}:</b> {invoice.customerEmail || "-"}</p>
          <p><b>{labels.phone}:</b> {invoice.customerPhone || "-"}</p>
          <p><b>{labels.amount}:</b> {currency.format(balanceDue(invoice))}</p>
          <p><b>{labels.paymentLink}:</b> /invoice/{invoice.publicToken}</p>
        </div>
        <Select label={labels.channel} onChange={(value) => setChannel(value as "email" | "sms" | "both")} value={channel}>
          <option value="email">{labels.email}</option>
          <option value="sms">{labels.sms}</option>
          <option value="both">{labels.both}</option>
        </Select>
        <TextArea label={labels.message} onChange={setMessage} value={message} />
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} type="button" variant="outline">{labels.cancel}</Button>
          <Button onClick={() => onSubmit(invoice, channel, message)} type="button">{labels.sendInvoice}</Button>
        </div>
      </div>
    </Modal>
  );
}

function ReasonModal({ invoice, labels, onClose, onSubmit, title }: { invoice: InvoiceRecord; labels: InvoiceLabels; onClose: () => void; onSubmit: (invoice: InvoiceRecord, reason: string) => void; title: string }) {
  const [reason, setReason] = useState("");
  return (
    <Modal onClose={onClose} title={`${title} · ${invoice.number}`}>
      <div className="grid gap-3">
        <p className="rounded-lg bg-yellow-50 p-3 text-sm font-bold text-yellow-800 ring-1 ring-yellow-100">{labels.voidWarning}</p>
        <TextArea label={labels.reason} onChange={setReason} value={reason} />
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} type="button" variant="outline">{labels.cancel}</Button>
          <Button disabled={!reason.trim()} onClick={() => onSubmit(invoice, reason)} type="button" variant="danger">{labels.markVoid}</Button>
        </div>
      </div>
    </Modal>
  );
}

function DeleteInvoiceModal({ invoice, labels, onClose, onDelete }: { invoice: InvoiceRecord; labels: InvoiceLabels; onClose: () => void; onDelete: (invoice: InvoiceRecord) => void }) {
  return (
    <Modal onClose={onClose} title={`${labels.deleteInvoice} ${invoice.number}?`}>
      <div className="grid gap-3">
        <p className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700 ring-1 ring-red-100">{labels.deleteWarning}</p>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} type="button" variant="outline">{labels.cancel}</Button>
          <Button onClick={() => onDelete(invoice)} type="button" variant="danger">{labels.delete}</Button>
        </div>
      </div>
    </Modal>
  );
}
