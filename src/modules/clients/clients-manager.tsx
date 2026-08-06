"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Download, FileSpreadsheet, Home, MapPin, Pencil, Plus, Search, Sparkles, Trash2, Upload } from "lucide-react";
import { Badge, Button, Card, CardContent, EmptyState, Input, Modal, Table, Td, Th } from "@/components/design-system";
import { readLocalRecords, readRemoteRecords, writeLocalRecords } from "@/lib/storage/local-records";
import {
  defaultClients,
  defaultPaymentMethods,
  type ClientAddressRecord,
  type ClientRecord,
  type ContactMethod,
  type CustomerStatus,
  type CustomerType,
  type ServiceFrequency
} from "@/modules/clients/types";

const storageKey = "fastclean_clients";
const importHistoryKey = "fastclean_customer_import_history";
const maxImportSize = 8 * 1024 * 1024;
const blankAddress: ClientAddressRecord = { id: "", label: "", street: "", line2: "", city: "", serviceArea: "", state: "", postalCode: "", country: "United States", accessInstructions: "", gateCode: "", parkingInstructions: "", notes: "", primary: true, active: true, formatted: "", latitude: "", longitude: "", verified: false };

type AddressSearchResult = {
  id: string;
  formatted: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: string;
  longitude: string;
};

type ImportField = "externalId" | "name" | "phone" | "status" | "address" | "frequency" | "rating" | "companyName";
type ImportRowStatus = "ready" | "warning" | "error" | "duplicate" | "excluded";

type ImportRow = {
  id: string;
  rowNumber: number;
  source: Record<string, string>;
  client: ClientRecord;
  status: ImportRowStatus;
  warnings: string[];
  errors: string[];
  duplicateIds: string[];
  decision: "create" | "replace" | "merge" | "keep" | "skip";
};

type ImportBatch = {
  id: string;
  filename: string;
  worksheetName: string;
  importedBy: string;
  importedAt: string;
  totalRows: number;
  created: number;
  updated: number;
  merged: number;
  skipped: number;
  failed: number;
  status: string;
  settings: Record<string, boolean | string>;
  warnings: string[];
};

export type ClientsLabels = Record<string, string> & {
  addAddress: string;
  addClient: string;
  addressDetails: string;
  addressLabel: string;
  addressSearch: string;
  addressVerified: string;
  birthday: string;
  cancel: string;
  city: string;
  communicationPreferences: string;
  delete: string;
  deleteClient: string;
  deleteClientConfirm: string;
  details: string;
  edit: string;
  editClient: string;
  email: string;
  emailOptIn: string;
  emptyTitle: string;
  emptyDescription: string;
  joinedDate: string;
  leadInformation: string;
  leadProfile: string;
  leadSource: string;
  name: string;
  nickname: string;
  noSecondaryPayment: string;
  paymentInformation: string;
  paymentNotes: string;
  phone: string;
  postalCode: string;
  primaryPaymentMethod: string;
  property: string;
  referralClient: string;
  saveChanges: string;
  saveClient: string;
  searchAddress: string;
  secondaryPaymentMethod: string;
  selectAddress: string;
  smsOptIn: string;
  state: string;
  street: string;
  tag: string;
  viewProfile: string;
};

type ClientFormMode = "create" | "edit";

const fieldAliases: Record<ImportField, string[]> = {
  externalId: ["#", "id", "customer id", "number"],
  name: ["nome", "name", "customer", "customer name", "full name"],
  phone: ["telefone", "phone", "phone number", "mobile", "cell"],
  status: ["status", "customer status"],
  address: ["endereco", "endereço", "address", "city", "service address", "location"],
  frequency: ["frequencia", "frequência", "frequency", "recurrence", "service frequency"],
  rating: ["nota", "rating", "score"],
  companyName: ["empresa", "company", "business", "business name"]
};

const cityOrAreaValues = ["sarasota", "bradenton", "lakewood ranch", "longboat key", "venice", "nokomis", "siesta key", "palmetto", "parrish", "englewood", "osprey"];

function getAddress(client: ClientRecord | null, index: number) {
  return client?.addresses?.[index] ?? { ...blankAddress, id: `address_${index}` };
}

function paymentName(paymentMethodId: string | undefined) {
  return defaultPaymentMethods.find((method) => method.id === paymentMethodId)?.name ?? "-";
}

function displayName(client: ClientRecord) {
  return client.displayName || (client.customerType === "commercial" && client.companyName ? client.companyName : client.name || client.companyName || "-");
}

function addressSummary(address: ClientAddressRecord | undefined) {
  if (!address) {
    return "-";
  }

  if (address.formatted) {
    return address.formatted;
  }

  return [address.street, address.line2, address.city || address.serviceArea, address.state, address.postalCode].filter(Boolean).join(", ") || "-";
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizePhone(value: string) {
  const original = value.trim();
  const digits = original.replace(/\D/g, "");

  if (digits.length === 10) {
    return { normalized: `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`, warning: "" };
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return { normalized: `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`, warning: "" };
  }

  if (!original) {
    return { normalized: "", warning: "" };
  }

  return { normalized: original, warning: digits.length < 10 ? "phoneWarning" : "phonePreservedWarning" };
}

function normalizeStatus(value: string): CustomerStatus {
  const normalized = normalizeHeader(value);
  if (normalized === "inativo" || normalized === "inactive") {
    return "inactive";
  }
  if (normalized === "lead") {
    return "lead";
  }
  if (normalized === "archived" || normalized === "arquivado") {
    return "archived";
  }
  return "active";
}

function normalizeFrequency(value: string): ServiceFrequency {
  const normalized = normalizeHeader(value).replace(/\s+/g, " ");
  if (["weekly", "semanal"].includes(normalized)) return "weekly";
  if (["every two weeks", "a cada duas semanas", "quinzenal"].includes(normalized)) return "every_2_weeks";
  if (["every three weeks", "a cada tres semanas", "a cada três semanas"].includes(normalized)) return "every_3_weeks";
  if (["every four weeks", "a cada quatro semanas"].includes(normalized)) return "every_4_weeks";
  if (["no repeat", "nao repetir", "não repetir"].includes(normalized)) return "no_repeat";
  if (["multiple", "multiplo", "múltiplo"].includes(normalized)) return "multiple";
  if (["on demand", "sob demanda"].includes(normalized)) return "on_demand";
  return value.trim() ? "custom" : "no_repeat";
}

function parseRating(value: string) {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) {
    return { rating: "", warning: "" };
  }

  const rating = Number(normalized);
  if (Number.isNaN(rating) || rating < 0 || rating > 5) {
    return { rating: normalized, warning: "ratingWarning" };
  }

  return { rating: String(rating), warning: "" };
}

function mapHeaders(headers: string[]) {
  const mapping: Partial<Record<ImportField, string>> = {};

  headers.forEach((header) => {
    const normalized = normalizeHeader(header);
    (Object.keys(fieldAliases) as ImportField[]).forEach((field) => {
      if (!mapping[field] && fieldAliases[field].map(normalizeHeader).includes(normalized)) {
        mapping[field] = header;
      }
    });
  });

  return mapping;
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"" && quoted && next === "\"") {
      current += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(current);
      current = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(current);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }

  row.push(current);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

function rowsToObjects(rows: string[][]) {
  const headerIndex = rows.findIndex((row) => row.filter((cell) => cell.trim()).length >= 2);
  const headers = (rows[headerIndex] ?? []).map((header) => header.trim());
  const dataRows = rows.slice(headerIndex + 1);

  return {
    headers,
    detectedHeaderRow: headerIndex + 1,
    records: dataRows.map((row, index) => ({
      rowNumber: headerIndex + index + 2,
      source: Object.fromEntries(headers.map((header, columnIndex) => [header, String(row[columnIndex] ?? "").trim()]))
    }))
  };
}

function buildAddressFromImport(value: string, labels: ClientsLabels) {
  const trimmed = value.trim();
  if (!trimmed) {
    return { addresses: [] as ClientAddressRecord[], warnings: [] as string[] };
  }

  if (normalizeHeader(trimmed) === "multiple") {
    return { addresses: [] as ClientAddressRecord[], warnings: [labels.multipleAddressWarning] };
  }

  if (cityOrAreaValues.includes(normalizeHeader(trimmed)) && !/\d/.test(trimmed)) {
    return {
      addresses: [{ ...blankAddress, id: `address_${Date.now()}`, label: labels.importedAddressLabel, city: trimmed, serviceArea: trimmed, primary: true, active: true }],
      warnings: [labels.cityOnlyWarning]
    };
  }

  return {
    addresses: [{ ...blankAddress, id: `address_${Date.now()}`, label: labels.importedAddressLabel, street: trimmed, formatted: trimmed, primary: true, active: true }],
    warnings: []
  };
}

function findDuplicates(candidate: ClientRecord, clients: ClientRecord[]) {
  const candidatePhone = (candidate.phone ?? "").replace(/\D/g, "");
  const candidateName = normalizeHeader(candidate.name ?? "");
  const candidateCompany = normalizeHeader(candidate.companyName ?? "");

  return clients
    .filter((client) => {
      const phone = (client.phone ?? "").replace(/\D/g, "");
      const name = normalizeHeader(client.name ?? "");
      const company = normalizeHeader(client.companyName ?? "");
      return Boolean(
        (candidate.externalId && candidate.externalId === client.externalId) ||
        (candidate.email && candidate.email.toLowerCase() === client.email?.toLowerCase()) ||
        (candidatePhone && phone && candidatePhone === phone) ||
        (candidateName && name && candidateName === name) ||
        (candidateCompany && company && candidateCompany === company)
      );
    })
    .map((client) => client.id);
}

function buildAddresses(formData: FormData) {
  return [0, 1, 2]
    .map((index) => ({
      id: String(formData.get(`addressId${index}`) || `address_${Date.now()}_${index}`),
      label: String(formData.get(`addressLabel${index}`) ?? ""),
      street: String(formData.get(`street${index}`) ?? ""),
      line2: String(formData.get(`line2${index}`) ?? ""),
      city: String(formData.get(`city${index}`) ?? ""),
      serviceArea: String(formData.get(`serviceArea${index}`) ?? ""),
      state: String(formData.get(`state${index}`) ?? ""),
      postalCode: String(formData.get(`postalCode${index}`) ?? ""),
      country: String(formData.get(`country${index}`) ?? ""),
      accessInstructions: String(formData.get(`accessInstructions${index}`) ?? ""),
      gateCode: String(formData.get(`gateCode${index}`) ?? ""),
      parkingInstructions: String(formData.get(`parkingInstructions${index}`) ?? ""),
      notes: String(formData.get(`addressNotes${index}`) ?? ""),
      formatted: String(formData.get(`formatted${index}`) ?? ""),
      latitude: String(formData.get(`latitude${index}`) ?? ""),
      longitude: String(formData.get(`longitude${index}`) ?? ""),
      verified: formData.get(`verified${index}`) === "true",
      primary: formData.get("primaryAddressIndex") === String(index),
      active: formData.get(`addressActive${index}`) !== "off"
    }))
    .filter((address) => address.label || address.street || address.city || address.serviceArea || address.state || address.postalCode || address.notes || address.accessInstructions || address.gateCode || address.parkingInstructions);
}

function buildClientFromFormData(formData: FormData, existing?: ClientRecord): ClientRecord {
  const value = (key: string, fallback = "") => formData.has(key) ? String(formData.get(key) ?? "") : fallback;
  const checked = (key: string, fallback = false) => formData.has(key) ? formData.get(key) === "on" : fallback;
  const addresses = formData.has("addressLabel0") ? buildAddresses(formData) : existing?.addresses ?? [];
  const rawPhone = value("phone", existing?.phone ?? "");
  const customerType = value("customerType", existing?.customerType ?? "residential") as CustomerType;
  const name = value("name", existing?.name ?? "").trim();
  const companyName = value("companyName", existing?.companyName ?? "").trim();
  const phoneValue = normalizePhone(rawPhone);
  const now = new Date();

  return {
    ...existing,
    id: existing?.id ?? `client_${Date.now()}`,
    externalId: value("externalId", existing?.externalId ?? ""),
    customerType,
    name,
    companyName,
    displayName: customerType === "commercial" && companyName ? companyName : name || companyName,
    phone: phoneValue.normalized,
    originalPhone: phoneValue.normalized === rawPhone ? existing?.originalPhone : rawPhone,
    secondaryPhone: value("secondaryPhone", existing?.secondaryPhone ?? ""),
    email: value("email", existing?.email ?? ""),
    preferredContactMethod: value("preferredContactMethod", existing?.preferredContactMethod ?? "phone") as ContactMethod,
    nickname: value("nickname", existing?.nickname ?? ""),
    birthday: value("birthday", existing?.birthday ?? ""),
    frequency: value("frequency", existing?.frequency ?? "no_repeat") as ServiceFrequency,
    preferredDay: value("preferredDay", existing?.preferredDay ?? ""),
    preferredTimeWindow: value("preferredTimeWindow", existing?.preferredTimeWindow ?? ""),
    defaultServiceType: value("defaultServiceType", existing?.defaultServiceType ?? ""),
    defaultTeam: value("defaultTeam", existing?.defaultTeam ?? ""),
    specialInstructions: value("specialInstructions", existing?.specialInstructions ?? ""),
    property: value("property", existing?.property ?? ""),
    price: value("price", existing?.price ?? ""),
    nextCleaning: existing?.nextCleaning,
    status: value("status", existing?.status ?? "active") as CustomerStatus,
    rating: value("rating", existing?.rating ?? ""),
    ratingNotes: value("ratingNotes", existing?.ratingNotes ?? ""),
    ratingUpdatedAt: value("ratingUpdatedAt", existing?.ratingUpdatedAt ?? formatDateKey(now)),
    tag: value("tag", existing?.tag ?? ""),
    wantsSms: checked("wantsSms", existing?.wantsSms ?? false),
    wantsEmail: checked("wantsEmail", existing?.wantsEmail ?? false),
    marketingConsent: checked("marketingConsent", existing?.marketingConsent ?? false),
    contactNotes: value("contactNotes", existing?.contactNotes ?? ""),
    leadProfile: value("leadProfile", existing?.leadProfile ?? ""),
    leadSource: value("leadSource", existing?.leadSource ?? ""),
    referralClientId: value("referralClientId", existing?.referralClientId ?? ""),
    joinedDate: value("joinedDate", existing?.joinedDate ?? formatDateKey(now)),
    companyContactPerson: value("companyContactPerson", existing?.companyContactPerson ?? ""),
    companyPhone: value("companyPhone", existing?.companyPhone ?? ""),
    companyEmail: value("companyEmail", existing?.companyEmail ?? ""),
    taxExempt: checked("taxExempt", existing?.taxExempt ?? false),
    companyNotes: value("companyNotes", existing?.companyNotes ?? ""),
    primaryPaymentMethod: value("primaryPaymentMethod", existing?.primaryPaymentMethod ?? ""),
    secondaryPaymentMethod: value("secondaryPaymentMethod", existing?.secondaryPaymentMethod ?? ""),
    paymentNotes: value("paymentNotes", existing?.paymentNotes ?? ""),
    internalNotes: value("internalNotes", existing?.internalNotes ?? ""),
    addresses,
    updatedAt: now.toISOString()
  };
}

function SelectField({ defaultValue, label, name, options }: { defaultValue?: string; label: string; name: string; options: { label: string; value: string }[] }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      {label}
      <select className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-cyan-100" defaultValue={defaultValue} name={name}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({ defaultValue, label, name }: { defaultValue?: string; label: string; name: string }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      {label}
      <textarea className="min-h-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-cyan-100" defaultValue={defaultValue} name={name} />
    </label>
  );
}

function AddressSearchFields({ address, index, labels }: { address: ClientAddressRecord; index: number; labels: ClientsLabels }) {
  const [currentAddress, setCurrentAddress] = useState<ClientAddressRecord>(address);
  const [query, setQuery] = useState(address.formatted || addressSummary(address));
  const [results, setResults] = useState<AddressSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const lastSelectedAddress = useRef(address.formatted || "");
  const latestSearchId = useRef(0);

  async function searchAddress(searchQuery = query) {
    if (searchQuery.trim().length < 3) {
      setResults([]);
      return;
    }

    const searchId = latestSearchId.current + 1;
    latestSearchId.current = searchId;
    setIsSearching(true);
    try {
      const response = await fetch(`/api/address-search?q=${encodeURIComponent(searchQuery)}`);
      const payload = (await response.json()) as { results: AddressSearchResult[] };
      if (latestSearchId.current === searchId) {
        setResults(payload.results);
      }
    } finally {
      if (latestSearchId.current === searchId) {
        setIsSearching(false);
      }
    }
  }

  useEffect(() => {
    if (query.trim().length < 3 || query === lastSelectedAddress.current) {
      setResults([]);
      return;
    }

    const timeout = window.setTimeout(() => {
      void searchAddress(query);
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [query]);

  function selectAddress(result: AddressSearchResult) {
    setCurrentAddress((value) => ({
      ...value,
      street: result.street,
      city: result.city,
      state: result.state,
      postalCode: result.postalCode,
      formatted: result.formatted,
      latitude: result.latitude,
      longitude: result.longitude,
      verified: true
    }));
    lastSelectedAddress.current = result.formatted;
    setQuery(result.formatted);
    setResults([]);
  }

  return (
    <div className="grid gap-4 rounded-xl bg-slate-50 p-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          {labels.addressSearch}
          <input
            className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-cyan-100"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={labels.addressSearchPlaceholder}
            type="search"
            value={query}
          />
        </label>
        <Button disabled={isSearching} onClick={() => searchAddress()} type="button" variant="outline">
          <Search className="h-4 w-4" />
          {labels.searchAddress}
        </Button>
      </div>

      {results.length > 0 ? (
        <div className="grid gap-2 rounded-xl border border-cyan-100 bg-white p-3">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">{labels.selectAddress}</p>
          {results.map((result) => (
            <button className="rounded-lg border border-slate-100 p-3 text-left text-sm font-bold text-slate-700 transition hover:border-cyan-200 hover:bg-cyan-50" key={result.id} onClick={() => selectAddress(result)} type="button">
              {result.formatted}
            </button>
          ))}
        </div>
      ) : null}

      {currentAddress.verified ? (
        <div className="flex items-center gap-2 rounded-xl bg-green-50 p-3 text-sm font-black text-green-700 ring-1 ring-green-100">
          <MapPin className="h-4 w-4" />
          {labels.addressVerified}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Input defaultValue={currentAddress.label} label={labels.addressLabel} name={`addressLabel${index}`} />
        <Input defaultValue={currentAddress.street} label={labels.street} name={`street${index}`} />
        <Input defaultValue={currentAddress.line2} label={labels.addressLine2} name={`line2${index}`} />
        <Input defaultValue={currentAddress.city} label={labels.city} name={`city${index}`} />
        <Input defaultValue={currentAddress.serviceArea} label={labels.serviceArea} name={`serviceArea${index}`} />
        <Input defaultValue={currentAddress.state} label={labels.state} name={`state${index}`} />
        <Input defaultValue={currentAddress.postalCode} label={labels.postalCode} name={`postalCode${index}`} />
        <Input defaultValue={currentAddress.country} label={labels.country} name={`country${index}`} />
        <Input defaultValue={currentAddress.gateCode} label={labels.gateCode} name={`gateCode${index}`} />
        <Input defaultValue={currentAddress.parkingInstructions} label={labels.parkingInstructions} name={`parkingInstructions${index}`} />
        <Input defaultValue={currentAddress.accessInstructions} label={labels.accessInstructions} name={`accessInstructions${index}`} />
        <Input defaultValue={currentAddress.notes} label={labels.addressDetails} name={`addressNotes${index}`} />
      </div>
      <div className="flex flex-wrap gap-3">
        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <input className="h-4 w-4 accent-primary" defaultChecked={currentAddress.primary} name="primaryAddressIndex" type="radio" value={String(index)} />
          {labels.primaryAddress}
        </label>
        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <input className="h-4 w-4 accent-primary" defaultChecked={currentAddress.active !== false} name={`addressActive${index}`} type="checkbox" />
          {labels.activeAddress}
        </label>
      </div>
      <input name={`addressId${index}`} type="hidden" value={currentAddress.id ?? ""} />
      <input name={`formatted${index}`} type="hidden" value={currentAddress.formatted ?? ""} />
      <input name={`latitude${index}`} type="hidden" value={currentAddress.latitude ?? ""} />
      <input name={`longitude${index}`} type="hidden" value={currentAddress.longitude ?? ""} />
      <input name={`verified${index}`} type="hidden" value={currentAddress.verified ? "true" : "false"} />
    </div>
  );
}

export function ClientForm({ clients, client, labels, mode, onCancel, onDelete, onSubmit }: { clients: ClientRecord[]; client: ClientRecord | null; labels: ClientsLabels; mode: ClientFormMode; onCancel: () => void; onDelete?: () => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  const [activeTab, setActiveTab] = useState("basic");
  const defaultJoinedDate = client?.joinedDate || formatDateKey(new Date());
  const tabs = [
    ["basic", labels.basicInformation],
    ["contact", labels.contactInformation],
    ["addresses", labels.serviceAddresses],
    ["preferences", labels.servicePreferences],
    ["notes", labels.notesHistory]
  ];

  return (
    <form className="grid gap-6" onSubmit={onSubmit}>
      <div className="flex gap-2 overflow-x-auto border-b border-slate-100 pb-2">
        {tabs.map(([key, label]) => (
          <button className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-black transition ${activeTab === key ? "bg-cyan-50 text-cyan-700" : "text-slate-500 hover:bg-slate-50"}`} key={key} onClick={() => setActiveTab(key)} type="button">
            {label}
          </button>
        ))}
      </div>

      {activeTab === "basic" ? (
        <section className="grid gap-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Input defaultValue={client?.externalId ?? ""} label={labels.importedExternalId} name="externalId" />
            <SelectField defaultValue={client?.customerType ?? "residential"} label={labels.customerType} name="customerType" options={[{ label: labels.residential, value: "residential" }, { label: labels.commercial, value: "commercial" }]} />
            <SelectField defaultValue={client?.status ?? "active"} label={labels.status} name="status" options={[{ label: labels.active, value: "active" }, { label: labels.inactive, value: "inactive" }, { label: labels.lead, value: "lead" }, { label: labels.archived, value: "archived" }]} />
            <Input defaultValue={client?.name ?? ""} label={labels.name} name="name" />
            <Input defaultValue={client?.companyName ?? ""} label={labels.companyName} name="companyName" />
            <Input defaultValue={client?.nickname ?? ""} label={labels.nickname} name="nickname" />
            <Input defaultValue={client?.birthday ?? ""} label={labels.birthday} name="birthday" type="date" />
            <Input defaultValue={client?.rating ?? ""} label={labels.rating} max="5" min="0" name="rating" step="0.1" type="number" />
            <Input defaultValue={client?.ratingUpdatedAt ?? formatDateKey(new Date())} label={labels.ratingUpdatedAt} name="ratingUpdatedAt" type="date" />
            <Input defaultValue={defaultJoinedDate} label={labels.joinedDate} name="joinedDate" type="date" />
            <Input defaultValue={client?.tag ?? ""} label={labels.tag} name="tag" />
            <Input defaultValue={client?.property ?? ""} label={labels.property} name="property" />
          </div>
          <TextArea defaultValue={client?.ratingNotes ?? ""} label={labels.ratingNotes} name="ratingNotes" />
        </section>
      ) : null}

      {activeTab === "contact" ? (
        <section className="grid gap-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Input defaultValue={client?.phone ?? ""} label={labels.primaryPhone} name="phone" type="tel" />
            <Input defaultValue={client?.secondaryPhone ?? ""} label={labels.secondaryPhone} name="secondaryPhone" type="tel" />
            <Input defaultValue={client?.email ?? ""} label={labels.email} name="email" type="email" />
            <SelectField defaultValue={client?.preferredContactMethod ?? "phone"} label={labels.preferredContactMethod} name="preferredContactMethod" options={[{ label: labels.contactPhone, value: "phone" }, { label: labels.contactSms, value: "sms" }, { label: labels.contactEmail, value: "email" }]} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 text-sm font-bold text-slate-700 ring-1 ring-slate-100">
              <input className="h-4 w-4 accent-primary" defaultChecked={client?.wantsSms ?? false} name="wantsSms" type="checkbox" />
              {labels.smsOptIn}
            </label>
            <label className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 text-sm font-bold text-slate-700 ring-1 ring-slate-100">
              <input className="h-4 w-4 accent-primary" defaultChecked={client?.wantsEmail ?? false} name="wantsEmail" type="checkbox" />
              {labels.emailOptIn}
            </label>
            <label className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 text-sm font-bold text-slate-700 ring-1 ring-slate-100">
              <input className="h-4 w-4 accent-primary" defaultChecked={client?.marketingConsent ?? false} name="marketingConsent" type="checkbox" />
              {labels.marketingConsent}
            </label>
          </div>
          <TextArea defaultValue={client?.contactNotes ?? ""} label={labels.contactNotes} name="contactNotes" />
        </section>
      ) : null}

      {activeTab === "addresses" ? (
        <section className="grid gap-4">
          {[0, 1, 2].map((index) => (
            <AddressSearchFields address={getAddress(client, index)} index={index} key={index} labels={labels} />
          ))}
        </section>
      ) : null}

      {activeTab === "preferences" ? (
        <section className="grid gap-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <SelectField defaultValue={client?.frequency ?? "no_repeat"} label={labels.frequency} name="frequency" options={[{ label: labels.frequencyWeekly, value: "weekly" }, { label: labels.frequencyEveryTwoWeeks, value: "every_2_weeks" }, { label: labels.frequencyEveryThreeWeeks, value: "every_3_weeks" }, { label: labels.frequencyEveryFourWeeks, value: "every_4_weeks" }, { label: labels.frequencyNoRepeat, value: "no_repeat" }, { label: labels.frequencyMultiple, value: "multiple" }, { label: labels.frequencyOnDemand, value: "on_demand" }, { label: labels.frequencyCustom, value: "custom" }]} />
            <Input defaultValue={client?.preferredDay ?? ""} label={labels.preferredDay} name="preferredDay" />
            <Input defaultValue={client?.preferredTimeWindow ?? ""} label={labels.preferredTimeWindow} name="preferredTimeWindow" />
            <Input defaultValue={client?.defaultServiceType ?? ""} label={labels.defaultServiceType} name="defaultServiceType" />
            <Input defaultValue={client?.defaultTeam ?? ""} label={labels.defaultTeam} name="defaultTeam" />
            <Input defaultValue={client?.price ?? ""} label={labels.price} name="price" />
          </div>
          <TextArea defaultValue={client?.specialInstructions ?? ""} label={labels.specialInstructions} name="specialInstructions" />
          <div className="grid gap-4 rounded-xl border border-cyan-100 bg-cyan-50/40 p-4">
            <h3 className="text-sm font-black text-slate-950">{labels.leadInformation}</h3>
            <div className="grid gap-4 lg:grid-cols-3">
              <Input defaultValue={client?.leadProfile ?? ""} label={labels.leadProfile} name="leadProfile" />
              <Input defaultValue={client?.leadSource ?? ""} label={labels.leadSource} name="leadSource" />
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                {labels.referralClient}
                <select className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-cyan-100" defaultValue={client?.referralClientId ?? ""} name="referralClientId">
                  <option value="">-</option>
                  {clients.filter((option) => option.id !== client?.id).map((option) => <option key={option.id} value={option.id}>{displayName(option)}</option>)}
                </select>
              </label>
            </div>
          </div>
          <div className="grid gap-4 rounded-xl border border-teal-100 bg-teal-50/40 p-4">
            <h3 className="text-sm font-black text-slate-950">{labels.paymentInformation}</h3>
            <div className="grid gap-4 lg:grid-cols-2">
              <SelectField defaultValue={client?.primaryPaymentMethod ?? "credit_card"} label={labels.primaryPaymentMethod} name="primaryPaymentMethod" options={defaultPaymentMethods.filter((method) => method.active).map((method) => ({ label: `${method.icon} ${method.name}`, value: method.id }))} />
              <SelectField defaultValue={client?.secondaryPaymentMethod ?? ""} label={labels.secondaryPaymentMethod} name="secondaryPaymentMethod" options={[{ label: labels.noSecondaryPayment, value: "" }, ...defaultPaymentMethods.filter((method) => method.active).map((method) => ({ label: `${method.icon} ${method.name}`, value: method.id }))]} />
              <div className="lg:col-span-2">
                <TextArea defaultValue={client?.paymentNotes ?? ""} label={labels.paymentNotes} name="paymentNotes" />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "notes" ? (
        <section className="grid gap-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Input defaultValue={client?.companyContactPerson ?? ""} label={labels.companyContactPerson} name="companyContactPerson" />
            <Input defaultValue={client?.companyPhone ?? ""} label={labels.companyPhone} name="companyPhone" />
            <Input defaultValue={client?.companyEmail ?? ""} label={labels.companyEmail} name="companyEmail" type="email" />
          </div>
          <label className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 text-sm font-bold text-slate-700 ring-1 ring-slate-100">
            <input className="h-4 w-4 accent-primary" defaultChecked={client?.taxExempt ?? false} name="taxExempt" type="checkbox" />
            {labels.taxExempt}
          </label>
          <TextArea defaultValue={client?.companyNotes ?? ""} label={labels.companyNotes} name="companyNotes" />
          <TextArea defaultValue={client?.internalNotes ?? ""} label={labels.internalNotes} name="internalNotes" />
          {client?.importWarnings?.length ? (
            <div className="grid gap-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-100">
              <p className="font-black">{labels.importWarnings}</p>
              {client.importWarnings.map((warning, index) => <p key={`${warning.message}-${index}`}>{warning.row ? `${labels.row} ${warning.row}: ` : ""}{warning.message}</p>)}
            </div>
          ) : null}
          <div className="grid gap-2 rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">
            <p>{labels.creationDate}: {client?.joinedDate || defaultJoinedDate}</p>
            <p>{labels.lastUpdate}: {client?.updatedAt ? new Date(client.updatedAt).toLocaleString() : "-"}</p>
            <p>{labels.importBatch}: {client?.importBatchId || "-"}</p>
          </div>
        </section>
      ) : null}

      {mode === "edit" ? <div className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700 ring-1 ring-red-100">{labels.deleteClientConfirm}</div> : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit">{mode === "create" ? labels.saveClient : labels.saveChanges}</Button>
        <Button onClick={onCancel} type="button" variant="outline">{labels.cancel}</Button>
        {onDelete ? <Button onClick={onDelete} type="button" variant="danger"><Trash2 className="h-4 w-4" />{labels.deleteClient}</Button> : null}
      </div>
    </form>
  );
}

function ImportWizard({ clients, labels, onClose, onImport }: { clients: ClientRecord[]; labels: ClientsLabels; onClose: () => void; onImport: (nextClients: ClientRecord[], batch: ImportBatch) => void }) {
  const [step, setStep] = useState(1);
  const [filename, setFilename] = useState("");
  const [worksheetName, setWorksheetName] = useState("");
  const [worksheets, setWorksheets] = useState<Record<string, string[][]>>({});
  const [headers, setHeaders] = useState<string[]>([]);
  const [records, setRecords] = useState<{ rowNumber: number; source: Record<string, string> }[]>([]);
  const [mapping, setMapping] = useState<Partial<Record<ImportField, string>>>({});
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [batchName, setBatchName] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportBatch | null>(null);
  const [settings, setSettings] = useState({
    includeActive: true,
    includeInactive: true,
    preserveExternalIds: true,
    normalizePhones: true,
    createAddresses: true,
    addWarningsToNotes: true,
    createServicePreferences: true,
    createAppointments: false
  });

  const stats = useMemo(() => ({
    total: rows.length,
    ready: rows.filter((row) => row.status === "ready").length,
    warnings: rows.filter((row) => row.status === "warning").length,
    errors: rows.filter((row) => row.status === "error").length,
    duplicates: rows.filter((row) => row.status === "duplicate").length,
    skipped: rows.filter((row) => row.status === "excluded" || row.decision === "skip").length
  }), [rows]);

  function loadParsedRows(nextRows: string[][], nextFilename: string, nextWorksheetName: string) {
    const parsed = rowsToObjects(nextRows);
    setFilename(nextFilename);
    setWorksheetName(nextWorksheetName);
    setHeaders(parsed.headers);
    setRecords(parsed.records);
    setMapping(mapHeaders(parsed.headers));
    setBatchName(nextFilename.replace(/\.[^.]+$/, ""));
    setError("");
    setStep(2);
  }

  async function readFile(file: File) {
    if (!/\.(csv|xlsx)$/i.test(file.name)) {
      setError(labels.importInvalidType);
      return;
    }

    if (file.size > maxImportSize) {
      setError(labels.importTooLarge);
      return;
    }

    if (/\.csv$/i.test(file.name)) {
      loadParsedRows(parseCsv(await file.text()), file.name, labels.csvWorksheet);
      return;
    }

    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const parsedSheets = Object.fromEntries(workbook.SheetNames.map((name) => [name, XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[name], { header: 1, raw: false, defval: "" })]));
    setWorksheets(parsedSheets);
    loadParsedRows(parsedSheets[workbook.SheetNames[0]] ?? [], file.name, workbook.SheetNames[0] ?? labels.firstWorksheet);
  }

  function buildPreview() {
    const nextRows = records
      .filter((record) => Object.values(record.source).some((value) => value.trim()))
      .map((record) => {
        const sourceValue = (field: ImportField) => (mapping[field] ? record.source[mapping[field] as string] ?? "" : "");
        const warnings: string[] = [];
        const errors: string[] = [];
        const phone = normalizePhone(sourceValue("phone"));
        const rating = parseRating(sourceValue("rating"));
        const address = buildAddressFromImport(sourceValue("address"), labels);
        const status = normalizeStatus(sourceValue("status"));
        const frequency = normalizeFrequency(sourceValue("frequency"));
        const name = sourceValue("name").replace(/\s+/g, " ").trim();
        const companyName = sourceValue("companyName").replace(/\s+/g, " ").trim();

        if (!name && !companyName) errors.push(labels.nameRequiredWarning);
        if (phone.warning) warnings.push(labels[phone.warning]);
        if (rating.warning) warnings.push(labels[rating.warning]);
        warnings.push(...address.warnings);

        const client: ClientRecord = {
          id: `client_import_${Date.now()}_${record.rowNumber}`,
          externalId: sourceValue("externalId"),
          customerType: companyName ? "commercial" : "residential",
          name,
          companyName,
          displayName: companyName || name,
          phone: phone.normalized,
          originalPhone: sourceValue("phone"),
          email: "",
          preferredContactMethod: "phone",
          status,
          frequency,
          rating: rating.rating,
          ratingUpdatedAt: rating.rating ? formatDateKey(new Date()) : "",
          tag: batchName || labels.importedTag,
          wantsSms: false,
          wantsEmail: false,
          marketingConsent: false,
          joinedDate: formatDateKey(new Date()),
          addresses: settings.createAddresses ? address.addresses : [],
          importWarnings: warnings.map((message) => ({ row: record.rowNumber, message })),
          originalRowNumber: record.rowNumber
        };

        const duplicateIds = findDuplicates(client, clients);
        const statusValue: ImportRowStatus = errors.length ? "error" : duplicateIds.length ? "duplicate" : warnings.length ? "warning" : "ready";

        return {
          id: `row_${record.rowNumber}`,
          rowNumber: record.rowNumber,
          source: record.source,
          client,
          status: statusValue,
          warnings,
          errors,
          duplicateIds,
          decision: duplicateIds.length ? "create" : "create"
        } satisfies ImportRow;
      });

    setRows(nextRows);
    setStep(4);
  }

  function changeDecision(rowId: string, decision: ImportRow["decision"]) {
    setRows((current) => current.map((row) => row.id === rowId ? { ...row, decision, status: decision === "skip" ? "excluded" : row.status } : row));
  }

  function applyImport() {
    const batchId = `import_${Date.now()}`;
    const importedAt = new Date().toISOString();
    let nextClients = [...clients];
    let created = 0;
    let updated = 0;
    let merged = 0;
    let skipped = 0;
    let failed = 0;

    rows.forEach((row) => {
      if (row.errors.length || row.decision === "skip" || row.decision === "keep") {
        if (row.errors.length) failed += 1;
        else skipped += 1;
        return;
      }

      const existing = nextClients.find((client) => row.duplicateIds.includes(client.id));
      const importedClient = {
        ...row.client,
        importBatchId: batchId,
        importedAt,
        importedBy: labels.currentUser,
        importWarnings: settings.addWarningsToNotes ? row.client.importWarnings : []
      };

      if ((row.decision === "replace" || row.decision === "merge") && existing) {
        nextClients = nextClients.map((client) => client.id === existing.id ? { ...client, ...importedClient, id: existing.id, addresses: row.decision === "merge" ? [...(client.addresses ?? []), ...(importedClient.addresses ?? [])] : importedClient.addresses } : client);
        if (row.decision === "merge") merged += 1;
        else updated += 1;
      } else {
        nextClients = [importedClient, ...nextClients];
        created += 1;
      }
    });

    const batch: ImportBatch = {
      id: batchId,
      filename,
      worksheetName,
      importedBy: labels.currentUser,
      importedAt,
      totalRows: rows.length,
      created,
      updated,
      merged,
      skipped,
      failed,
      status: failed ? labels.importCompletedWithErrors : labels.importCompleted,
      settings: { ...settings, batchName },
      warnings: rows.flatMap((row) => row.warnings)
    };

    setResult(batch);
    onImport(nextClients, batch);
    setStep(8);
  }

  function downloadTemplate() {
    const content = "#,Nome,Telefone,Status,Endereço,Frequência,Nota,Empresa\n1,Jane Smith,+1 941 555 0100,Ativo,Sarasota,Weekly,5,\n";
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "fastclean-customer-import-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadReport() {
    const reportRows = [["Row", "Status", "Name", "Phone", "Warnings", "Errors"], ...rows.map((row) => [String(row.rowNumber), row.status, row.client.name, row.client.phone ?? "", row.warnings.join(" | "), row.errors.join(" | ")])];
    const url = URL.createObjectURL(new Blob([reportRows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, "\"\"")}"`).join(",")).join("\n")], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename || "customer-import"}-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => <Badge key={item} tone={step === item ? "blue" : "gray"}>{labels.importStep} {item}</Badge>)}
      </div>

      {error ? <div className="rounded-xl bg-red-50 p-4 text-sm font-black text-red-700 ring-1 ring-red-100">{error}</div> : null}

      {step === 1 ? (
        <section className="grid gap-4">
          <label className="grid min-h-44 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-cyan-200 bg-cyan-50/40 p-6 text-center transition hover:bg-cyan-50">
            <Upload className="h-8 w-8 text-cyan-600" />
            <span className="text-lg font-black text-slate-950">{labels.importDropzone}</span>
            <span className="text-sm font-semibold text-slate-500">{labels.importAcceptedTypes}</span>
            <input className="hidden" accept=".csv,.xlsx" onChange={(event) => event.target.files?.[0] && void readFile(event.target.files[0])} type="file" />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button onClick={downloadTemplate} type="button" variant="outline"><Download className="h-4 w-4" />{labels.downloadTemplate}</Button>
            <Button onClick={onClose} type="button" variant="ghost">{labels.cancel}</Button>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="grid gap-4">
          <div className="rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
            {labels.fileName}: {filename} · {labels.detectedRows}: {records.length}
          </div>
          {Object.keys(worksheets).length > 1 ? <SelectField defaultValue={worksheetName} label={labels.worksheet} name="worksheet" options={Object.keys(worksheets).map((sheet) => ({ label: sheet, value: sheet }))} /> : null}
          <Button onClick={() => setStep(3)} type="button">{labels.continue}</Button>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="grid gap-4">
          {(Object.keys(fieldAliases) as ImportField[]).map((field) => (
            <label className="grid gap-2 text-sm font-medium text-slate-700" key={field}>
              {labels[`map_${field}`]}
              <select className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-cyan-100" onChange={(event) => setMapping((current) => ({ ...current, [field]: event.target.value }))} value={mapping[field] ?? ""}>
                <option value="">{labels.doNotImportColumn}</option>
                {headers.map((header) => <option key={header} value={header}>{header}</option>)}
              </select>
              <span className="text-xs font-semibold text-slate-400">{labels.preview}: {records.slice(0, 3).map((record) => mapping[field] ? record.source[mapping[field] as string] : "").filter(Boolean).join(" · ") || "-"}</span>
            </label>
          ))}
          <Button onClick={buildPreview} type="button">{labels.previewImport}</Button>
        </section>
      ) : null}

      {step === 4 || step === 5 || step === 6 || step === 7 ? (
        <section className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <MiniStat label={labels.totalRows} value={String(stats.total)} />
            <MiniStat label={labels.readyRows} value={String(stats.ready)} />
            <MiniStat label={labels.warningRows} value={String(stats.warnings)} />
            <MiniStat label={labels.errorRows} value={String(stats.errors)} />
            <MiniStat label={labels.duplicateRows} value={String(stats.duplicates)} />
            <MiniStat label={labels.skippedRows} value={String(stats.skipped)} />
          </div>
          <div className="max-h-80 overflow-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-400">
                <tr><th className="p-3">{labels.row}</th><th className="p-3">{labels.name}</th><th className="p-3">{labels.phone}</th><th className="p-3">{labels.status}</th><th className="p-3">{labels.frequency}</th><th className="p-3">{labels.importStatus}</th><th className="p-3">{labels.duplicateAction}</th></tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr className="border-t border-slate-100" key={row.id}>
                    <td className="p-3 font-bold">{row.rowNumber}</td>
                    <td className="p-3"><input className="h-9 rounded-lg border border-slate-200 px-2" onChange={(event) => setRows((current) => current.map((item) => item.id === row.id ? { ...item, client: { ...item.client, name: event.target.value, displayName: event.target.value || item.client.companyName } } : item))} value={row.client.name} /></td>
                    <td className="p-3">{row.client.phone || "-"}</td>
                    <td className="p-3">{labels[row.client.status ?? "active"]}</td>
                    <td className="p-3">{labels[`frequency_${row.client.frequency}`] ?? row.client.frequency}</td>
                    <td className="p-3"><Badge tone={row.status === "error" ? "red" : row.status === "duplicate" || row.status === "warning" ? "yellow" : "green"}>{labels[`rowStatus_${row.status}`]}</Badge><p className="mt-1 text-xs font-semibold text-amber-700">{[...row.warnings, ...row.errors].join(" · ")}</p></td>
                    <td className="p-3">
                      <select className="h-9 rounded-lg border border-slate-200 px-2" onChange={(event) => changeDecision(row.id, event.target.value as ImportRow["decision"])} value={row.decision}>
                        <option value="create">{labels.duplicateCreate}</option>
                        <option value="keep">{labels.duplicateKeep}</option>
                        <option value="replace">{labels.duplicateReplace}</option>
                        <option value="merge">{labels.duplicateMerge}</option>
                        <option value="skip">{labels.duplicateSkip}</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {step === 4 ? <Button onClick={() => setStep(6)} type="button">{labels.importOptions}</Button> : null}
          {step === 6 ? (
            <div className="grid gap-3 rounded-xl bg-slate-50 p-4">
              <Input defaultValue={batchName} label={labels.importBatchName} name="batchName" onChange={(event) => setBatchName(event.target.value)} />
              {Object.keys(settings).map((key) => (
                <label className="flex items-center gap-3 text-sm font-bold text-slate-700" key={key}>
                  <input checked={settings[key as keyof typeof settings]} className="h-4 w-4 accent-primary" onChange={(event) => setSettings((current) => ({ ...current, [key]: event.target.checked }))} type="checkbox" />
                  {labels[`setting_${key}`]}
                </label>
              ))}
              <Button onClick={() => setStep(7)} type="button">{labels.finalReview}</Button>
            </div>
          ) : null}
          {step === 7 ? (
            <div className="flex flex-wrap gap-2">
              <Button onClick={applyImport} type="button"><CheckCircle2 className="h-4 w-4" />{labels.confirmImport}</Button>
              <Button onClick={() => setStep(4)} type="button" variant="outline">{labels.backToPreview}</Button>
            </div>
          ) : null}
        </section>
      ) : null}

      {step === 8 && result ? (
        <section className="grid gap-4">
          <div className="rounded-xl bg-green-50 p-4 text-sm font-black text-green-700 ring-1 ring-green-100">{result.status}</div>
          <div className="grid gap-3 sm:grid-cols-5">
            <MiniStat label={labels.createdRows} value={String(result.created)} />
            <MiniStat label={labels.updatedRows} value={String(result.updated)} />
            <MiniStat label={labels.mergedRows} value={String(result.merged)} />
            <MiniStat label={labels.skippedRows} value={String(result.skipped)} />
            <MiniStat label={labels.failedRows} value={String(result.failed)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={downloadReport} type="button" variant="outline"><Download className="h-4 w-4" />{labels.downloadResultReport}</Button>
            <Button onClick={onClose} type="button">{labels.viewImportedCustomers}</Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-100 bg-white p-3"><p className="text-xs font-black uppercase text-slate-400">{label}</p><p className="mt-1 text-xl font-black text-slate-950">{value}</p></div>;
}

export function ClientsManager({ labels, locale }: { labels: ClientsLabels; locale: string }) {
  const [clients, setClients] = useState<ClientRecord[]>(defaultClients);
  const [history, setHistory] = useState<ImportBatch[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);
  const filteredClients = clients.filter((client) => {
    const searchValue = searchQuery.trim().toLowerCase();

    if (!searchValue) {
      return true;
    }

    return [
      client.externalId,
      client.name,
      client.displayName,
      client.companyName,
      client.phone,
      client.secondaryPhone,
      client.email,
      client.status ? labels[client.status] : "",
      client.frequency ? labels[`frequency_${client.frequency}`] : "",
      client.addresses?.map((address) => addressSummary(address)).join(" ")
    ].filter(Boolean).join(" ").toLowerCase().includes(searchValue);
  });

  useEffect(() => {
    const localClients = readLocalRecords(storageKey, defaultClients);
    const localHistory = readLocalRecords<ImportBatch>(importHistoryKey, []);
    setClients(localClients);
    setHistory(localHistory);
    readRemoteRecords(storageKey, localClients).then(setClients);
    readRemoteRecords(importHistoryKey, localHistory).then(setHistory);
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextClient = buildClientFromFormData(new FormData(event.currentTarget));
    const nextClients = [nextClient, ...clients];
    setClients(nextClients);
    writeLocalRecords(storageKey, nextClients);
    setShowCreateModal(false);
  }

  function handleUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClient) return;
    const updatedClient = buildClientFromFormData(new FormData(event.currentTarget), selectedClient);
    const nextClients = clients.map((client) => (client.id === updatedClient.id ? updatedClient : client));
    setClients(nextClients);
    writeLocalRecords(storageKey, nextClients);
    setSelectedClient(null);
  }

  function deleteClient(clientId: string) {
    const nextClients = clients.filter((client) => client.id !== clientId);
    setClients(nextClients);
    writeLocalRecords(storageKey, nextClients);
    setSelectedClient(null);
  }

  function exportClients() {
    const rows = [["ID", "Imported External ID", "Name", "Phone", "Status", "Address", "Frequency", "Rating", "Company"], ...clients.map((client) => [client.id, client.externalId ?? "", client.name, client.phone ?? "", client.status ?? "active", addressSummary(client.addresses?.[0]), client.frequency ?? "", client.rating ?? "", client.companyName ?? ""])];
    const url = URL.createObjectURL(new Blob([rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, "\"\"")}"`).join(",")).join("\n")], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "fastclean-customers.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(nextClients: ClientRecord[], batch: ImportBatch) {
    const nextHistory = [batch, ...history];
    setClients(nextClients);
    setHistory(nextHistory);
    writeLocalRecords(storageKey, nextClients);
    writeLocalRecords(importHistoryKey, nextHistory);
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap justify-end gap-2">
        <Button onClick={() => setShowImportModal(true)} type="button" variant="outline"><FileSpreadsheet className="h-4 w-4" />{labels.importCustomers}</Button>
        <Button onClick={exportClients} type="button" variant="outline"><Download className="h-4 w-4" />{labels.exportCustomers}</Button>
        <Button onClick={() => setShowCreateModal(true)} type="button"><Plus className="h-4 w-4" />{labels.addClient}</Button>
      </div>

      <Card>
        <CardContent>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {labels.searchCustomers}
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-cyan-100"
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={labels.searchCustomersPlaceholder}
                  type="search"
                  value={searchQuery}
                />
                {searchQuery ? (
                  <button className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400 transition hover:text-primary" onClick={() => setSearchQuery("")} type="button">
                    ×
                  </button>
                ) : null}
              </div>
            </label>
            <div className="rounded-xl bg-cyan-50 px-4 py-3 text-sm font-black text-cyan-700 ring-1 ring-cyan-100">
              {filteredClients.length} {filteredClients.length === 1 ? labels.customerFound : labels.customersFound}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:hidden">
        {filteredClients.map((client) => (
          <Card className="cursor-pointer" key={client.id}>
            <CardContent>
              <div className="flex items-start justify-between gap-3" onClick={() => setSelectedClient(client)}>
                <div>
                  <p className="text-lg font-black text-slate-950">{displayName(client)}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{client.nickname || client.leadProfile || "-"}</p>
                  <p className="mt-1 text-xs font-bold text-slate-400">{client.phone || client.email || "-"}</p>
                </div>
                <Badge tone={client.status === "inactive" ? "gray" : "teal"}>{labels[client.status ?? "active"]}</Badge>
              </div>
              <div className="mt-3 rounded-lg bg-green-50 p-3 text-sm ring-1 ring-green-100" onClick={() => setSelectedClient(client)}>
                <p className="font-bold text-green-700">{labels.addAddress}</p>
                <p className="mt-1 font-black text-slate-950">{addressSummary(client.addresses?.find((address) => address.primary) ?? client.addresses?.[0])}</p>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                <Link className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700 sm:col-span-3" href={`/${locale}/clients/${client.id}`}>
                  <Sparkles className="h-4 w-4" />{labels.viewProfile}
                </Link>
                <Button className="sm:col-span-2" onClick={() => setSelectedClient(client)} type="button" variant="outline"><Pencil className="h-4 w-4" />{labels.edit}</Button>
                <Button onClick={() => deleteClient(client.id)} type="button" variant="danger"><Trash2 className="h-4 w-4" />{labels.delete}</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="hidden lg:block">
        <CardContent>
          <Table>
            <thead>
              <tr>
                <Th>{labels.name}</Th>
                <Th>{labels.status}</Th>
                <Th>{labels.phone}</Th>
                <Th>{labels.addAddress}</Th>
                <Th>{labels.frequency}</Th>
                <Th>{labels.rating}</Th>
                <Th>{labels.companyName}</Th>
                <Th>{labels.edit}</Th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => (
                <tr className="cursor-pointer transition hover:bg-cyan-50/30" key={client.id} onClick={() => setSelectedClient(client)}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-50 text-cyan-600 ring-1 ring-cyan-100"><Home className="h-5 w-5" /></span>
                      <div><p className="font-black text-slate-950">{displayName(client)}</p><p className="mt-1 text-xs font-bold text-slate-400">{client.externalId ? `${labels.importedExternalId}: ${client.externalId}` : client.email || "-"}</p></div>
                    </div>
                  </Td>
                  <Td><Badge tone={client.status === "inactive" ? "gray" : client.status === "lead" ? "yellow" : "teal"}>{labels[client.status ?? "active"]}</Badge></Td>
                  <Td>{client.phone || "-"}</Td>
                  <Td><span className="font-semibold text-slate-700">{addressSummary(client.addresses?.find((address) => address.primary) ?? client.addresses?.[0])}</span></Td>
                  <Td>{labels[`frequency_${client.frequency}`] ?? client.frequency ?? "-"}</Td>
                  <Td>{client.rating ? `${client.rating}/5` : labels.notRated}</Td>
                  <Td>{client.companyName || "-"}</Td>
                  <Td>
                    <div className="flex gap-2">
                      <Button onClick={(event) => { event.stopPropagation(); setSelectedClient(client); }} type="button" variant="outline"><Pencil className="h-4 w-4" />{labels.edit}</Button>
                      <Button onClick={(event) => { event.stopPropagation(); deleteClient(client.id); }} type="button" variant="danger"><Trash2 className="h-4 w-4" />{labels.delete}</Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      {history.length ? (
        <Card>
          <CardContent>
            <h3 className="text-base font-black text-slate-950">{labels.importHistory}</h3>
            <div className="mt-4 grid gap-2">
              {history.slice(0, 5).map((batch) => (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-700" key={batch.id}>
                  <span>{batch.filename} · {batch.worksheetName}</span>
                  <span>{new Date(batch.importedAt).toLocaleString()}</span>
                  <span>{labels.createdRows}: {batch.created} · {labels.updatedRows}: {batch.updated} · {labels.failedRows}: {batch.failed}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {clients.length === 0 ? <EmptyState title={labels.emptyTitle} description={labels.emptyDescription} /> : null}
      {clients.length > 0 && filteredClients.length === 0 ? <EmptyState title={labels.noSearchResultsTitle} description={labels.noSearchResultsDescription} /> : null}

      {showCreateModal ? (
        <Modal onClose={() => setShowCreateModal(false)} title={labels.addClient}>
          <ClientForm clients={clients} client={null} labels={labels} mode="create" onCancel={() => setShowCreateModal(false)} onSubmit={handleSubmit} />
        </Modal>
      ) : null}

      {showImportModal ? (
        <Modal onClose={() => setShowImportModal(false)} title={labels.importCustomers}>
          <ImportWizard clients={clients} labels={labels} onClose={() => setShowImportModal(false)} onImport={handleImport} />
        </Modal>
      ) : null}

      {selectedClient ? (
        <Modal onClose={() => setSelectedClient(null)} title={labels.editClient}>
          <ClientForm clients={clients} client={selectedClient} labels={labels} mode="edit" onCancel={() => setSelectedClient(null)} onDelete={() => deleteClient(selectedClient.id)} onSubmit={handleUpdate} />
        </Modal>
      ) : null}
    </div>
  );
}
