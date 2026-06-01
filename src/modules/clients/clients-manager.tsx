"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Home, MapPin, Pencil, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardContent, EmptyState, Input, Modal, Table, Td, Th } from "@/components/design-system";
import { readLocalRecords, writeLocalRecords } from "@/lib/storage/local-records";
import { defaultClients, defaultPaymentMethods, type ClientAddressRecord, type ClientRecord } from "@/modules/clients/types";

const storageKey = "fastclean_clients";
const blankAddress: ClientAddressRecord = { label: "", street: "", city: "", state: "", postalCode: "", notes: "", formatted: "", latitude: "", longitude: "", verified: false };

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

export type ClientsLabels = {
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

function getAddress(client: ClientRecord | null, index: number) {
  return client?.addresses?.[index] ?? blankAddress;
}

function paymentName(paymentMethodId: string | undefined) {
  return defaultPaymentMethods.find((method) => method.id === paymentMethodId)?.name ?? "-";
}

function addressSummary(address: ClientAddressRecord | undefined) {
  if (!address) {
    return "-";
  }

  if (address.formatted) {
    return address.formatted;
  }

  return [address.street, address.city, address.state, address.postalCode].filter(Boolean).join(", ") || "-";
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function buildAddresses(formData: FormData) {
  return [0, 1]
    .map((index) => ({
      label: String(formData.get(`addressLabel${index}`) ?? ""),
      street: String(formData.get(`street${index}`) ?? ""),
      city: String(formData.get(`city${index}`) ?? ""),
      state: String(formData.get(`state${index}`) ?? ""),
      postalCode: String(formData.get(`postalCode${index}`) ?? ""),
      notes: String(formData.get(`addressNotes${index}`) ?? ""),
      formatted: String(formData.get(`formatted${index}`) ?? ""),
      latitude: String(formData.get(`latitude${index}`) ?? ""),
      longitude: String(formData.get(`longitude${index}`) ?? ""),
      verified: formData.get(`verified${index}`) === "true"
    }))
    .filter((address) => address.label || address.street || address.city || address.state || address.postalCode || address.notes);
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
            placeholder="210 Beacon St, Boston, MA"
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
            <button
              className="rounded-lg border border-slate-100 p-3 text-left text-sm font-bold text-slate-700 transition hover:border-cyan-200 hover:bg-cyan-50"
              key={result.id}
              onClick={() => selectAddress(result)}
              type="button"
            >
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
        <Input label={labels.street} name={`street${index}`} readOnly value={currentAddress.street} />
        <Input label={labels.city} name={`city${index}`} readOnly value={currentAddress.city} />
        <Input label={labels.state} name={`state${index}`} readOnly value={currentAddress.state} />
        <Input label={labels.postalCode} name={`postalCode${index}`} readOnly value={currentAddress.postalCode} />
        <Input defaultValue={currentAddress.notes} label={labels.addressDetails} name={`addressNotes${index}`} />
      </div>
      <input name={`formatted${index}`} type="hidden" value={currentAddress.formatted ?? ""} />
      <input name={`latitude${index}`} type="hidden" value={currentAddress.latitude ?? ""} />
      <input name={`longitude${index}`} type="hidden" value={currentAddress.longitude ?? ""} />
      <input name={`verified${index}`} type="hidden" value={currentAddress.verified ? "true" : "false"} />
    </div>
  );
}

export function ClientForm({
  clients,
  client,
  labels,
  mode,
  onCancel,
  onDelete,
  onSubmit
}: {
  clients: ClientRecord[];
  client: ClientRecord | null;
  labels: ClientsLabels;
  mode: ClientFormMode;
  onCancel: () => void;
  onDelete?: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const firstAddress = getAddress(client, 0);
  const defaultJoinedDate = client?.joinedDate || formatDateKey(new Date());

  return (
    <form className="grid gap-6" onSubmit={onSubmit}>
      <div className="grid gap-4 lg:grid-cols-3">
        <Input defaultValue={client?.name ?? ""} label={labels.name} name="name" required />
        <Input defaultValue={client?.phone ?? ""} label={labels.phone} name="phone" type="tel" />
        <Input defaultValue={client?.email ?? ""} label={labels.email} name="email" type="email" />
        <Input defaultValue={client?.nickname ?? ""} label={labels.nickname} name="nickname" />
        <Input defaultValue={client?.birthday ?? ""} label={labels.birthday} name="birthday" type="date" />
        <Input defaultValue={client?.tag ?? ""} label={labels.tag} name="tag" />
        <Input defaultValue={defaultJoinedDate} label={labels.joinedDate} name="joinedDate" type="date" />
      </div>

      <section className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
        <h3 className="text-sm font-black text-slate-950">{labels.communicationPreferences}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-3 rounded-lg bg-white p-3 text-sm font-bold text-slate-700 ring-1 ring-slate-100">
            <input className="h-4 w-4 accent-primary" defaultChecked={client?.wantsSms ?? false} name="wantsSms" type="checkbox" />
            {labels.smsOptIn}
          </label>
          <label className="flex items-center gap-3 rounded-lg bg-white p-3 text-sm font-bold text-slate-700 ring-1 ring-slate-100">
            <input className="h-4 w-4 accent-primary" defaultChecked={client?.wantsEmail ?? false} name="wantsEmail" type="checkbox" />
            {labels.emailOptIn}
          </label>
        </div>
      </section>

      <section className="grid gap-4 rounded-xl border border-cyan-100 bg-cyan-50/40 p-4">
        <h3 className="text-sm font-black text-slate-950">{labels.leadInformation}</h3>
        <div className="grid gap-4 lg:grid-cols-3">
          <Input defaultValue={client?.leadProfile ?? ""} label={labels.leadProfile} name="leadProfile" />
          <Input defaultValue={client?.leadSource ?? ""} label={labels.leadSource} name="leadSource" />
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {labels.referralClient}
            <select
              className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-cyan-100"
              defaultValue={client?.referralClientId ?? ""}
              name="referralClientId"
            >
              <option value="">-</option>
              {clients
                .filter((option) => option.id !== client?.id)
                .map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
            </select>
          </label>
        </div>
      </section>

      <section className="grid gap-4 rounded-xl border border-teal-100 bg-teal-50/40 p-4">
        <h3 className="text-sm font-black text-slate-950">{labels.paymentInformation}</h3>
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {labels.primaryPaymentMethod}
            <select
              className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-cyan-100"
              defaultValue={client?.primaryPaymentMethod ?? "credit_card"}
              name="primaryPaymentMethod"
            >
              {defaultPaymentMethods
                .filter((method) => method.active)
                .map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.icon} {method.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {labels.secondaryPaymentMethod}
            <select
              className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-cyan-100"
              defaultValue={client?.secondaryPaymentMethod ?? ""}
              name="secondaryPaymentMethod"
            >
              <option value="">{labels.noSecondaryPayment}</option>
              {defaultPaymentMethods
                .filter((method) => method.active)
                .map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.icon} {method.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700 lg:col-span-2">
            {labels.paymentNotes}
            <textarea
              className="min-h-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-cyan-100"
              defaultValue={client?.paymentNotes ?? ""}
              name="paymentNotes"
            />
          </label>
        </div>
      </section>

      <section className="grid gap-4 rounded-xl border border-slate-100 bg-white p-4">
        <h3 className="text-sm font-black text-slate-950">{labels.addAddress}</h3>
        <Input defaultValue={client?.property ?? ""} label={labels.property} name="property" />
        <AddressSearchFields address={firstAddress} index={0} labels={labels} />
      </section>

      {mode === "edit" ? (
        <div className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700 ring-1 ring-red-100">
          {labels.deleteClientConfirm}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit">{mode === "create" ? labels.saveClient : labels.saveChanges}</Button>
        <Button onClick={onCancel} type="button" variant="outline">
          {labels.cancel}
        </Button>
        {onDelete ? (
          <Button onClick={onDelete} type="button" variant="danger">
            <Trash2 className="h-4 w-4" />
            {labels.deleteClient}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export function ClientsManager({ labels, locale }: { labels: ClientsLabels; locale: string }) {
  const [clients, setClients] = useState<ClientRecord[]>(defaultClients);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);

  useEffect(() => {
    setClients(readLocalRecords(storageKey, defaultClients));
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextClient: ClientRecord = {
      id: `client_${Date.now()}`,
      name: String(formData.get("name") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      nickname: String(formData.get("nickname") ?? ""),
      birthday: String(formData.get("birthday") ?? ""),
      property: String(formData.get("property") ?? ""),
      tag: String(formData.get("tag") ?? ""),
      wantsSms: formData.get("wantsSms") === "on",
      wantsEmail: formData.get("wantsEmail") === "on",
      leadProfile: String(formData.get("leadProfile") ?? ""),
      leadSource: String(formData.get("leadSource") ?? ""),
      referralClientId: String(formData.get("referralClientId") ?? ""),
      joinedDate: String(formData.get("joinedDate") || formatDateKey(new Date())),
      primaryPaymentMethod: String(formData.get("primaryPaymentMethod") ?? ""),
      secondaryPaymentMethod: String(formData.get("secondaryPaymentMethod") ?? ""),
      paymentNotes: String(formData.get("paymentNotes") ?? ""),
      addresses: buildAddresses(formData)
    };

    const nextClients = [nextClient, ...clients];
    setClients(nextClients);
    writeLocalRecords(storageKey, nextClients);
    setShowCreateModal(false);
  }

  function handleUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClient) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const updatedClient: ClientRecord = {
      ...selectedClient,
      name: String(formData.get("name") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      nickname: String(formData.get("nickname") ?? ""),
      birthday: String(formData.get("birthday") ?? ""),
      property: String(formData.get("property") ?? ""),
      tag: String(formData.get("tag") ?? ""),
      wantsSms: formData.get("wantsSms") === "on",
      wantsEmail: formData.get("wantsEmail") === "on",
      leadProfile: String(formData.get("leadProfile") ?? ""),
      leadSource: String(formData.get("leadSource") ?? ""),
      referralClientId: String(formData.get("referralClientId") ?? ""),
      joinedDate: String(formData.get("joinedDate") || formatDateKey(new Date())),
      primaryPaymentMethod: String(formData.get("primaryPaymentMethod") ?? ""),
      secondaryPaymentMethod: String(formData.get("secondaryPaymentMethod") ?? ""),
      paymentNotes: String(formData.get("paymentNotes") ?? ""),
      addresses: buildAddresses(formData)
    };
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

  return (
    <div className="grid gap-6">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreateModal(true)} type="button">
          <Plus className="h-4 w-4" />
          {labels.addClient}
        </Button>
      </div>

      <div className="grid gap-4 lg:hidden">
        {clients.map((client) => (
          <Card className="cursor-pointer" key={client.id}>
            <CardContent>
              <div className="flex items-start justify-between gap-3" onClick={() => setSelectedClient(client)}>
                <div>
                  <p className="text-lg font-black text-slate-950">{client.name}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{client.nickname || client.leadProfile || "-"}</p>
                  <p className="mt-1 text-xs font-bold text-slate-400">{client.phone || client.email || "-"}</p>
                </div>
                <Badge tone="teal">{client.tag}</Badge>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm" onClick={() => setSelectedClient(client)}>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="font-bold text-slate-500">{labels.primaryPaymentMethod}</p>
                  <p className="mt-1 font-black text-slate-950">{paymentName(client.primaryPaymentMethod)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="font-bold text-slate-500">{labels.leadSource}</p>
                  <p className="mt-1 font-black text-slate-950">{client.leadSource || "-"}</p>
                </div>
              </div>
              <div className="mt-3 rounded-lg bg-green-50 p-3 text-sm ring-1 ring-green-100" onClick={() => setSelectedClient(client)}>
                <p className="font-bold text-green-700">{labels.addAddress}</p>
                <p className="mt-1 font-black text-slate-950">{addressSummary(client.addresses?.[0])}</p>
                {client.property ? <p className="mt-2 text-xs font-bold text-green-700">{client.property}</p> : null}
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                <Link
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700 sm:col-span-3"
                  href={`/${locale}/clients/${client.id}`}
                >
                  <Sparkles className="h-4 w-4" />
                  {labels.viewProfile}
                </Link>
                <Button className="sm:col-span-2" onClick={() => setSelectedClient(client)} type="button" variant="outline">
                  <Pencil className="h-4 w-4" />
                  {labels.edit}
                </Button>
                <Button onClick={() => deleteClient(client.id)} type="button" variant="danger">
                  <Trash2 className="h-4 w-4" />
                  {labels.delete}
                </Button>
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
                <Th>{labels.nickname}</Th>
                <Th>{labels.primaryPaymentMethod}</Th>
                <Th>{labels.addAddress}</Th>
                <Th>{labels.property}</Th>
                <Th>{labels.leadSource}</Th>
                <Th>{labels.details}</Th>
                <Th>{labels.edit}</Th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr className="cursor-pointer transition hover:bg-cyan-50/30" key={client.id} onClick={() => setSelectedClient(client)}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-50 text-cyan-600 ring-1 ring-cyan-100">
                        <Home className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-black text-slate-950">{client.name}</p>
                        <p className="mt-1 text-xs font-bold text-slate-400">{client.phone || client.email || "-"}</p>
                        <Badge tone="teal">{client.tag}</Badge>
                      </div>
                    </div>
                  </Td>
                  <Td>{client.nickname || "-"}</Td>
                  <Td>
                    <span className="font-black text-slate-950">{paymentName(client.primaryPaymentMethod)}</span>
                  </Td>
                  <Td>
                    <span className="font-semibold text-slate-700">{addressSummary(client.addresses?.[0])}</span>
                  </Td>
                  <Td>{client.property || "-"}</Td>
                  <Td>{client.leadSource || "-"}</Td>
                  <Td>
                    <Link
                      className="inline-flex items-center gap-1 text-sm font-black text-primary"
                      href={`/${locale}/clients/${client.id}`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Sparkles className="h-4 w-4" />
                      {labels.viewProfile}
                    </Link>
                  </Td>
                  <Td>
                    <div className="flex gap-2">
                      <Button onClick={(event) => { event.stopPropagation(); setSelectedClient(client); }} type="button" variant="outline">
                        <Pencil className="h-4 w-4" />
                        {labels.edit}
                      </Button>
                      <Button onClick={(event) => { event.stopPropagation(); deleteClient(client.id); }} type="button" variant="danger">
                        <Trash2 className="h-4 w-4" />
                        {labels.delete}
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      {clients.length === 0 ? <EmptyState title={labels.emptyTitle} description={labels.emptyDescription} /> : null}

      {showCreateModal ? (
        <Modal onClose={() => setShowCreateModal(false)} title={labels.addClient}>
          <ClientForm clients={clients} client={null} labels={labels} mode="create" onCancel={() => setShowCreateModal(false)} onSubmit={handleSubmit} />
        </Modal>
      ) : null}

      {selectedClient ? (
        <Modal onClose={() => setSelectedClient(null)} title={labels.editClient}>
          <ClientForm
            clients={clients}
            client={selectedClient}
            labels={labels}
            mode="edit"
            onCancel={() => setSelectedClient(null)}
            onDelete={() => deleteClient(selectedClient.id)}
            onSubmit={handleUpdate}
          />
        </Modal>
      ) : null}
    </div>
  );
}
