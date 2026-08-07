"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Calculator, CheckCircle2, FileText, Home, Loader2, MapPin, Minus, Plus, Route, Save, Search, Sparkles } from "lucide-react";
import { Badge, Button, Card, CardContent, Input, Modal } from "@/components/design-system";
import {
  buildPricingSnapshot,
  calculateCleaningPrice,
  defaultCleaningPricingRules,
  mergePricingRules,
  type CleaningPricingInput,
  type CleaningPricingRules,
  type PricingComponent
} from "@/lib/pricing/cleaning-pricing";
import { normalizeAuditEvent } from "@/lib/audit/audit-events";
import { readRemoteRecords, writeLocalRecords } from "@/lib/storage/local-records";

type AddressResult = {
  id: string;
  formatted: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude?: string;
  longitude?: string;
};

type PropertyData = {
  squareFeet: string;
  bedrooms: number;
  bathrooms: number;
  kitchens: number;
  floors: number;
  basement: boolean;
  yearBuilt: string;
  propertyType: string;
  lotSize: string;
  estimatedValue: string;
  imageUrl: string;
  source: "manual" | "provider" | "previouslyVerified";
  providerRecordId: string;
  retrievedAt: string;
  confidence: "manual" | "estimated" | "verified" | "unavailable";
  manuallyModified: boolean;
  distanceMiles: string;
  distanceCalculatedAt: string;
};

type HouseholdData = {
  children: number;
  cats: number;
  smallDogs: number;
  largeDogs: number;
  bedLinens: number;
};

type ClientSummary = {
  id: string;
  name?: string;
  displayName?: string;
  phone?: string;
  email?: string;
  property?: string;
  addresses?: Array<{
    formatted?: string;
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    latitude?: string;
    longitude?: string;
    primary?: boolean;
  }>;
};

type PricingQuote = {
  id: string;
  status: "draft" | "recommended" | "sent" | "viewed" | "accepted" | "rejected" | "expired" | "converted" | "void";
  clientId?: string;
  customerName?: string;
  address?: AddressResult | null;
  finalPrice: number;
  recommendedPrice: number;
  pricingSnapshot: ReturnType<typeof buildPricingSnapshot>;
  createdAt: string;
  customerEmail?: string;
  customerPhone?: string;
  estimateDate?: string;
  expirationDate?: string;
  frequency?: string;
  lineItems?: Array<{ id: string; type: "service" | "extra" | "custom" | "discount" | "fee"; description: string; quantity: number; rate: number }>;
  number?: string;
  publicToken?: string;
  serviceAddress?: string;
  serviceName?: string;
  source?: "pricing_calculator";
};

type CalculatorLabels = {
  title: string;
  subtitle: string;
  propertyStep: string;
  detailsStep: string;
  reviewStep: string;
  pricingStep: string;
  next: string;
  back: string;
  editProperty: string;
  editCleaningDetails: string;
  customer: string;
  noCustomer: string;
  propertyAddress: string;
  addressInput: string;
  verifiedAddress: string;
  manualAddress: string;
  searchAddress: string;
  noResults: string;
  propertyImage: string;
  imageUnavailable: string;
  fetchPropertyData: string;
  propertyDataManual: string;
  propertyDataProviderUnavailable: string;
  dataSource: string;
  retrievedAt: string;
  squareFeet: string;
  bedrooms: string;
  bathrooms: string;
  kitchens: string;
  floors: string;
  basement: string;
  yes: string;
  no: string;
  yearBuilt: string;
  propertyType: string;
  lotSize: string;
  estimatedValue: string;
  distance: string;
  calculateDistance: string;
  household: string;
  children: string;
  cats: string;
  smallDogs: string;
  largeDogs: string;
  bedLinens: string;
  cleaningProfile: string;
  organizationProfile: string;
  serviceType: string;
  frequency: string;
  extraServices: string;
  noExtrasSelected: string;
  propertyReview: string;
  householdReview: string;
  serviceReview: string;
  recommendedPrice: string;
  finalPrice: string;
  overrideReason: string;
  estimatedLabor: string;
  confidence: string;
  confidenceVerified: string;
  confidenceEstimated: string;
  confidenceNeedsReview: string;
  calculationBreakdown: string;
  recurringComparison: string;
  oneTimeRecommendations: string;
  viewCalculation: string;
  saveQuote: string;
  createEstimate: string;
  quoteSaved: string;
  priceNote: string;
  pricingRulesNote: string;
  profiles: Record<string, string>;
};

const pricingRulesStorageKey = "fastclean_pricing_rules";
const quoteStorageKey = "fastclean_pricing_quotes";
const clientStorageKey = "fastclean_clients";
const addressMemoryStorageKey = "fastclean_address_memory";

const initialPropertyData: PropertyData = {
  basement: false,
  bathrooms: 2,
  bedrooms: 3,
  confidence: "manual",
  distanceCalculatedAt: "",
  distanceMiles: "",
  estimatedValue: "",
  floors: 1,
  imageUrl: "",
  kitchens: 1,
  lotSize: "",
  manuallyModified: false,
  propertyType: "Single Family Residence",
  providerRecordId: "",
  retrievedAt: "",
  source: "manual",
  squareFeet: "",
  yearBuilt: ""
};

const steps = ["property", "details", "review", "pricing"] as const;

function currency(value: number, currencyCode = "USD") {
  return new Intl.NumberFormat("en-US", { currency: currencyCode, maximumFractionDigits: 0, style: "currency" }).format(value);
}

function numberValue(value: string) {
  return Number(String(value).replace(/[^\d.]/g, "")) || 0;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function dateOffsetIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function createPublicToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replaceAll("-", "");
  }
  return `${Date.now()}${Math.random().toString(36).slice(2)}`;
}

function readCookie(name: string) {
  if (typeof document === "undefined") {
    return "";
  }

  return decodeURIComponent(document.cookie.split("; ").find((item) => item.startsWith(`${name}=`))?.split("=")[1] ?? "");
}

export function PriceCalculator({ labels }: { labels: CalculatorLabels }) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeStep, setActiveStep] = useState<(typeof steps)[number]>("property");
  const [addressQuery, setAddressQuery] = useState("");
  const [addressResults, setAddressResults] = useState<AddressResult[]>([]);
  const [highlightedResult, setHighlightedResult] = useState(0);
  const [selectedAddress, setSelectedAddress] = useState<AddressResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [propertyData, setPropertyData] = useState<PropertyData>(initialPropertyData);
  const [household, setHousehold] = useState<HouseholdData>({ bedLinens: 0, cats: 0, children: 0, largeDogs: 0, smallDogs: 0 });
  const [cleaningProfile, setCleaningProfile] = useState("normal");
  const [organizationProfile, setOrganizationProfile] = useState("normal");
  const [serviceId, setServiceId] = useState("regular_cleaning");
  const [frequencyId, setFrequencyId] = useState("one_time");
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [pricingRules, setPricingRules] = useState<CleaningPricingRules>(defaultCleaningPricingRules);
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [finalPrice, setFinalPrice] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [savedQuoteId, setSavedQuoteId] = useState("");
  const [calculationModal, setCalculationModal] = useState<{ title: string; components: PricingComponent[]; total: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      const [savedRules, savedClients] = await Promise.all([
        readRemoteRecords<Partial<CleaningPricingRules>>(pricingRulesStorageKey, []),
        readRemoteRecords<ClientSummary>(clientStorageKey, [])
      ]);

      if (cancelled) {
        return;
      }

      setPricingRules(mergePricingRules(savedRules[0]));
      setClients(savedClients);
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (addressQuery.trim().length < 3 || selectedAddress?.formatted === addressQuery) {
      setAddressResults([]);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/address-search?q=${encodeURIComponent(addressQuery)}`, { signal: controller.signal });
        const data = await response.json() as { results: AddressResult[] };
        setAddressResults(data.results ?? []);
        setHighlightedResult(0);
      } catch {
        setAddressResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [addressQuery, selectedAddress?.formatted]);

  const selectedClient = clients.find((client) => client.id === selectedClientId);
  const pricingInput = useMemo<CleaningPricingInput>(() => ({
    cleaningProfile,
    extraIds,
    frequencyId,
    household,
    organizationProfile,
    property: {
      basement: propertyData.basement,
      bathrooms: propertyData.bathrooms,
      bedrooms: propertyData.bedrooms,
      distanceMiles: numberValue(propertyData.distanceMiles),
      floors: propertyData.floors,
      kitchens: propertyData.kitchens,
      squareFeet: numberValue(propertyData.squareFeet)
    },
    serviceId
  }), [cleaningProfile, extraIds, frequencyId, household, organizationProfile, propertyData, serviceId]);
  const result = useMemo(() => calculateCleaningPrice(pricingInput, pricingRules), [pricingInput, pricingRules]);
  const effectiveFinalPrice = numberValue(finalPrice) || result.recommendedPrice;

  const recurringComparison = useMemo(() => pricingRules.frequencies
    .filter((frequency) => ["weekly", "every_2_weeks", "every_3_weeks", "every_4_weeks", "monthly"].includes(frequency.id) && frequency.active)
    .map((frequency) => ({
      frequency,
      result: calculateCleaningPrice({ ...pricingInput, frequencyId: frequency.id, serviceId: "regular_cleaning" }, pricingRules)
    })), [pricingInput, pricingRules]);

  const oneTimeRecommendations = useMemo(() => pricingRules.services
    .filter((service) => service.active && service.oneTime)
    .map((service) => ({
      result: calculateCleaningPrice({ ...pricingInput, frequencyId: "one_time", serviceId: service.id }, pricingRules),
      service
    })), [pricingInput, pricingRules]);

  function selectAddress(address: AddressResult) {
    setSelectedAddress(address);
    setAddressQuery(address.formatted);
    setAddressResults([]);
    rememberAddress(address);
    setPropertyData((current) => ({
      ...current,
      confidence: "verified",
      distanceCalculatedAt: "",
      distanceMiles: "",
      imageUrl: "",
      manuallyModified: false,
      providerRecordId: address.id,
      retrievedAt: todayIso(),
      source: "provider"
    }));
  }

  async function rememberAddress(address: AddressResult) {
    try {
      const response = await fetch(`/api/storage/${encodeURIComponent(addressMemoryStorageKey)}`, { cache: "no-store", credentials: "same-origin" });
      const payload = await response.json() as { records?: AddressResult[] };
      const records = Array.isArray(payload.records) ? payload.records : [];
      const nextRecords = [address, ...records.filter((record) => record.formatted !== address.formatted && record.id !== address.id)].slice(0, 100);
      await fetch(`/api/storage/${encodeURIComponent(addressMemoryStorageKey)}`, {
        body: JSON.stringify({ records: nextRecords }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
    } catch {
      // Address memory only improves autocomplete; manual entry remains available if it fails.
    }
  }

  function handleAddressKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (addressResults.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedResult((current) => Math.min(addressResults.length - 1, current + 1));
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedResult((current) => Math.max(0, current - 1));
    }

    if (event.key === "Enter") {
      event.preventDefault();
      selectAddress(addressResults[highlightedResult]);
    }
  }

  function fetchPropertyData() {
    setPropertyData((current) => ({
      ...current,
      confidence: selectedAddress ? "estimated" : "manual",
      manuallyModified: false,
      providerRecordId: selectedAddress?.id ?? "",
      retrievedAt: todayIso(),
      source: selectedAddress ? "provider" : "manual"
    }));
  }

  function calculateDistance() {
    if (!selectedAddress?.latitude || !selectedAddress?.longitude) {
      setPropertyData((current) => ({ ...current, distanceCalculatedAt: todayIso(), distanceMiles: current.distanceMiles || "0" }));
      return;
    }

    const companyLat = 27.3364;
    const companyLon = -82.5307;
    const miles = haversineMiles(companyLat, companyLon, Number(selectedAddress.latitude), Number(selectedAddress.longitude));
    setPropertyData((current) => ({ ...current, distanceCalculatedAt: todayIso(), distanceMiles: String(Math.round(miles * 10) / 10) }));
  }

  function selectClient(clientId: string) {
    setSelectedClientId(clientId);
    const client = clients.find((item) => item.id === clientId);
    const address = client?.addresses?.find((item) => item.primary) ?? client?.addresses?.[0];
    if (!address) {
      return;
    }

    const formatted = address.formatted || [address.street, address.city, address.state, address.postalCode].filter(Boolean).join(", ");
    const nextAddress: AddressResult = {
      city: address.city ?? "",
      country: "United States",
      formatted,
      id: `client_${clientId}`,
      latitude: address.latitude,
      longitude: address.longitude,
      postalCode: address.postalCode ?? "",
      state: address.state ?? "",
      street: address.street ?? ""
    };
    selectAddress(nextAddress);
    if (client?.property) {
      setPropertyData((current) => ({ ...current, squareFeet: String(numberValue(client.property ?? "")) || current.squareFeet }));
    }
  }

  function saveQuote(status: PricingQuote["status"], openProposal = false) {
    const selectedService = pricingRules.services.find((service) => service.id === serviceId);
    const selectedFrequency = pricingRules.frequencies.find((frequency) => frequency.id === frequencyId);
    const selectedExtras = pricingRules.extras.filter((extra) => extraIds.includes(extra.id));
    const quote: PricingQuote = {
      address: selectedAddress,
      clientId: selectedClientId || undefined,
      createdAt: new Date().toISOString(),
      customerName: clientDisplayName(selectedClient),
      customerEmail: selectedClient?.email,
      customerPhone: selectedClient?.phone,
      estimateDate: todayIso(),
      expirationDate: dateOffsetIso(14),
      finalPrice: effectiveFinalPrice,
      frequency: selectedFrequency?.label ?? frequencyId,
      id: `quote_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      lineItems: [
        {
          description: selectedService?.name ?? serviceId,
          id: "line_service",
          quantity: 1,
          rate: effectiveFinalPrice,
          type: "service"
        },
        ...selectedExtras.map((extra) => ({
          description: extra.name,
          id: `line_extra_${extra.id}`,
          quantity: 1,
          rate: 0,
          type: "extra" as const
        }))
      ],
      number: `EST-${Date.now().toString().slice(-6)}`,
      pricingSnapshot: buildPricingSnapshot(pricingInput, result, effectiveFinalPrice, overrideReason, pricingRules),
      publicToken: createPublicToken(),
      recommendedPrice: result.recommendedPrice,
      serviceAddress: selectedAddress?.formatted ?? "",
      serviceName: selectedService?.name ?? serviceId,
      source: "pricing_calculator",
      status
    };

    readRemoteRecords<PricingQuote>(quoteStorageKey, []).then((quotes) => {
      writeLocalRecords(quoteStorageKey, [quote, ...quotes]);
      setSavedQuoteId(quote.id);
      auditQuote(quote);
      if (openProposal) {
        const locale = pathname?.split("/").filter(Boolean)[0] || "pt";
        router.push(`/${locale}/proposals`);
      }
    });
  }

  function updateProperty<K extends keyof PropertyData>(key: K, value: PropertyData[K]) {
    setPropertyData((current) => ({ ...current, [key]: value, manuallyModified: true }));
  }

  const currentStepIndex = steps.indexOf(activeStep);

  return (
    <div className="grid gap-5">
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-secondary">{labels.title}</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">{labels.subtitle}</h2>
            </div>
            <Badge tone={savedQuoteId ? "green" : "blue"}>{savedQuoteId ? labels.quoteSaved : labels.pricingRulesNote}</Badge>
          </div>
          <div className="grid gap-2 md:grid-cols-4">
            {steps.map((step, index) => {
              const stepLabel = step === "property" ? labels.propertyStep : step === "details" ? labels.detailsStep : step === "review" ? labels.reviewStep : labels.pricingStep;
              const active = step === activeStep;
              return (
                <button className={`rounded-xl border px-4 py-3 text-left transition ${active ? "border-green-200 bg-green-50 text-teal-800 shadow-sm" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"}`} key={step} onClick={() => setActiveStep(step)} type="button">
                  <span className={`inline-grid h-6 w-6 place-items-center rounded-full text-xs font-black ${active ? "bg-secondary text-white" : "bg-slate-100 text-slate-500"}`}>{index + 1}</span>
                  <span className="ml-2 text-sm font-black">{stepLabel}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <main className="grid gap-5">
          {activeStep === "property" ? (
            <PropertyStep
              addressQuery={addressQuery}
              addressResults={addressResults}
              clients={clients}
              highlightedResult={highlightedResult}
              isSearching={isSearching}
              labels={labels}
              onAddressKeyDown={handleAddressKeyDown}
              onCalculateDistance={calculateDistance}
              onFetchPropertyData={fetchPropertyData}
              onSelectAddress={selectAddress}
              onSelectClient={selectClient}
              onSetAddressQuery={(value) => { setSelectedAddress(null); setAddressQuery(value); }}
              onUpdateProperty={updateProperty}
              propertyData={propertyData}
              selectedAddress={selectedAddress}
              selectedClientId={selectedClientId}
            />
          ) : null}

          {activeStep === "details" ? (
            <DetailsStep
              cleaningProfile={cleaningProfile}
              extraIds={extraIds}
              household={household}
              labels={labels}
              onSetCleaningProfile={setCleaningProfile}
              onSetExtraIds={setExtraIds}
              onSetFrequency={setFrequencyId}
              onSetHousehold={setHousehold}
              onSetOrganizationProfile={setOrganizationProfile}
              onSetService={setServiceId}
              organizationProfile={organizationProfile}
              pricingRules={pricingRules}
              frequencyId={frequencyId}
              serviceId={serviceId}
            />
          ) : null}

          {activeStep === "review" ? (
            <ReviewStep
              household={household}
              labels={labels}
              onEditDetails={() => setActiveStep("details")}
              onEditProperty={() => setActiveStep("property")}
              pricingRules={pricingRules}
              propertyData={propertyData}
              selectedAddress={selectedAddress}
              selectedExtras={result.selectedExtras}
              selectedFrequency={result.selectedFrequency}
              selectedService={result.selectedService}
            />
          ) : null}

          {activeStep === "pricing" ? (
            <PricingStep
              effectiveFinalPrice={effectiveFinalPrice}
              finalPrice={finalPrice}
              labels={labels}
              onCreateEstimate={() => saveQuote("draft", true)}
              onSaveQuote={() => saveQuote("draft")}
              onSetCalculationModal={setCalculationModal}
              onSetFinalPrice={setFinalPrice}
              onSetOverrideReason={setOverrideReason}
              oneTimeRecommendations={oneTimeRecommendations}
              overrideReason={overrideReason}
              recurringComparison={recurringComparison}
              result={result}
            />
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button disabled={currentStepIndex === 0} onClick={() => setActiveStep(steps[Math.max(0, currentStepIndex - 1)])} type="button" variant="outline">
              <ArrowLeft className="h-4 w-4" />
              {labels.back}
            </Button>
            <Button disabled={currentStepIndex === steps.length - 1} onClick={() => setActiveStep(steps[Math.min(steps.length - 1, currentStepIndex + 1)])} type="button">
              {labels.next}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </main>

        <aside className="xl:sticky xl:top-5 xl:self-start">
          <RecommendedPanel
            effectiveFinalPrice={effectiveFinalPrice}
            labels={labels}
            onOpenCalculation={() => setCalculationModal({ components: result.components, title: result.selectedService?.name ?? labels.calculationBreakdown, total: result.recommendedPrice })}
            result={result}
          />
        </aside>
      </div>

      {calculationModal ? (
        <Modal onClose={() => setCalculationModal(null)} title={calculationModal.title}>
          <CalculationRows components={calculationModal.components} currencyCode={pricingRules.currency} total={calculationModal.total} />
        </Modal>
      ) : null}
    </div>
  );
}

function PropertyStep(props: {
  addressQuery: string;
  addressResults: AddressResult[];
  clients: ClientSummary[];
  highlightedResult: number;
  isSearching: boolean;
  labels: CalculatorLabels;
  onAddressKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onCalculateDistance: () => void;
  onFetchPropertyData: () => void;
  onSelectAddress: (address: AddressResult) => void;
  onSelectClient: (clientId: string) => void;
  onSetAddressQuery: (value: string) => void;
  onUpdateProperty: <K extends keyof PropertyData>(key: K, value: PropertyData[K]) => void;
  propertyData: PropertyData;
  selectedAddress: AddressResult | null;
  selectedClientId: string;
}) {
  const { labels, propertyData } = props;

  return (
    <Card>
      <CardContent className="grid gap-5">
        <SectionTitle description={labels.manualAddress} icon={<MapPin className="h-5 w-5" />} title={labels.propertyAddress} />
        <div className="grid gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
          <Select label={labels.customer} onChange={props.onSelectClient} value={props.selectedClientId}>
            <option value="">{labels.noCustomer}</option>
            {props.clients.map((client) => <option key={client.id} value={client.id}>{clientDisplayName(client)}</option>)}
          </Select>
          <div className="relative">
            <Input
              autoComplete="off"
              label={labels.addressInput}
              onChange={(event) => props.onSetAddressQuery(event.target.value)}
              onKeyDown={props.onAddressKeyDown}
              value={props.addressQuery}
            />
            {props.isSearching ? <Loader2 className="absolute bottom-3 right-3 h-4 w-4 animate-spin text-primary" /> : null}
            {props.addressResults.length > 0 ? (
              <div className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                {props.addressResults.map((address, index) => (
                  <button className={`w-full rounded-lg p-3 text-left text-sm font-bold transition ${index === props.highlightedResult ? "bg-green-50 text-teal-800" : "text-slate-700 hover:bg-slate-50"}`} key={address.id} onClick={() => props.onSelectAddress(address)} type="button">
                    {address.formatted}
                  </button>
                ))}
              </div>
            ) : props.addressQuery.length >= 3 && !props.isSearching && !props.selectedAddress ? (
              <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm font-bold text-slate-500 ring-1 ring-slate-100">{labels.noResults}</p>
            ) : null}
          </div>
        </div>

        <div className={`rounded-xl border p-4 text-sm font-black ${props.selectedAddress ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
          {props.selectedAddress ? <CheckCircle2 className="mr-2 inline h-4 w-4" /> : <Search className="mr-2 inline h-4 w-4" />}
          {props.selectedAddress ? `${labels.verifiedAddress}: ${props.selectedAddress.formatted}` : labels.propertyDataProviderUnavailable}
        </div>

        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
              <p className="text-sm font-black text-slate-950">{labels.propertyImage}</p>
              <Badge tone="blue">{propertyData.confidence}</Badge>
            </div>
            {propertyData.imageUrl ? (
              <img alt={labels.propertyImage} className="h-56 w-full object-cover" src={propertyData.imageUrl} />
            ) : (
              <div className="grid h-56 place-items-center p-5 text-center">
                <Home className="h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm font-bold text-slate-500">{labels.imageUnavailable}</p>
              </div>
            )}
          </div>

          <div className="grid gap-4">
            <div className="flex flex-wrap gap-2">
              <Button onClick={props.onFetchPropertyData} type="button" variant="outline">
                <Sparkles className="h-4 w-4" />
                {labels.fetchPropertyData}
              </Button>
              <Button onClick={props.onCalculateDistance} type="button" variant="outline">
                <Route className="h-4 w-4" />
                {labels.calculateDistance}
              </Button>
            </div>
            <p className="rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-600">{labels.propertyDataManual}</p>
            <div className="grid gap-3 md:grid-cols-3">
              <Input label={labels.squareFeet} inputMode="numeric" value={propertyData.squareFeet} onChange={(event) => props.onUpdateProperty("squareFeet", event.target.value)} />
              <Counter label={labels.bedrooms} value={propertyData.bedrooms} onChange={(value) => props.onUpdateProperty("bedrooms", value)} />
              <Counter label={labels.bathrooms} value={propertyData.bathrooms} onChange={(value) => props.onUpdateProperty("bathrooms", value)} />
              <Counter label={labels.kitchens} value={propertyData.kitchens} onChange={(value) => props.onUpdateProperty("kitchens", value)} />
              <Counter label={labels.floors} value={propertyData.floors} onChange={(value) => props.onUpdateProperty("floors", value)} />
              <ToggleButton label={labels.basement} offLabel={labels.no} onChange={(value) => props.onUpdateProperty("basement", value)} onLabel={labels.yes} value={propertyData.basement} />
              <Input label={labels.yearBuilt} value={propertyData.yearBuilt} onChange={(event) => props.onUpdateProperty("yearBuilt", event.target.value)} />
              <Input label={labels.propertyType} value={propertyData.propertyType} onChange={(event) => props.onUpdateProperty("propertyType", event.target.value)} />
              <Input label={labels.lotSize} value={propertyData.lotSize} onChange={(event) => props.onUpdateProperty("lotSize", event.target.value)} />
              <Input label={labels.estimatedValue} value={propertyData.estimatedValue} onChange={(event) => props.onUpdateProperty("estimatedValue", event.target.value)} />
              <Input label={labels.distance} value={propertyData.distanceMiles} onChange={(event) => props.onUpdateProperty("distanceMiles", event.target.value)} />
              <ReadonlyDetail label={labels.dataSource} value={propertyData.source} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailsStep({ cleaningProfile, extraIds, household, labels, onSetCleaningProfile, onSetExtraIds, onSetFrequency, onSetHousehold, onSetOrganizationProfile, onSetService, organizationProfile, pricingRules, frequencyId, serviceId }: {
  cleaningProfile: string;
  extraIds: string[];
  household: HouseholdData;
  labels: CalculatorLabels;
  onSetCleaningProfile: (value: string) => void;
  onSetExtraIds: (value: string[]) => void;
  onSetFrequency: (value: string) => void;
  onSetHousehold: (value: HouseholdData) => void;
  onSetOrganizationProfile: (value: string) => void;
  onSetService: (value: string) => void;
  organizationProfile: string;
  pricingRules: CleaningPricingRules;
  frequencyId: string;
  serviceId: string;
}) {
  function updateHousehold(key: keyof HouseholdData, value: number) {
    onSetHousehold({ ...household, [key]: value });
  }

  return (
    <Card>
      <CardContent className="grid gap-5">
        <SectionTitle description={labels.priceNote} icon={<Calculator className="h-5 w-5" />} title={labels.detailsStep} />
        <div className="grid gap-3 md:grid-cols-5">
          <Counter label={labels.children} value={household.children} onChange={(value) => updateHousehold("children", value)} />
          <Counter label={labels.cats} value={household.cats} onChange={(value) => updateHousehold("cats", value)} />
          <Counter label={labels.smallDogs} value={household.smallDogs} onChange={(value) => updateHousehold("smallDogs", value)} />
          <Counter label={labels.largeDogs} value={household.largeDogs} onChange={(value) => updateHousehold("largeDogs", value)} />
          <Counter label={labels.bedLinens} value={household.bedLinens} onChange={(value) => updateHousehold("bedLinens", value)} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Select label={labels.cleaningProfile} onChange={onSetCleaningProfile} value={cleaningProfile}>
            {profileOptions(labels).map((profile) => <option key={profile.id} value={profile.id}>{profile.label}</option>)}
          </Select>
          <Select label={labels.organizationProfile} onChange={onSetOrganizationProfile} value={organizationProfile}>
            {organizationOptions(labels).map((profile) => <option key={profile.id} value={profile.id}>{profile.label}</option>)}
          </Select>
          <Select label={labels.serviceType} onChange={onSetService} value={serviceId}>
            {pricingRules.services.filter((service) => service.active).map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
          </Select>
          <Select label={labels.frequency} onChange={onSetFrequency} value={frequencyId}>
            {pricingRules.frequencies.filter((frequency) => frequency.active).map((frequency) => <option key={frequency.id} value={frequency.id}>{frequency.label}</option>)}
          </Select>
        </div>
        <div>
          <p className="mb-3 text-sm font-black text-slate-950">{labels.extraServices}</p>
          <div className="flex flex-wrap gap-2">
            {pricingRules.extras.filter((extra) => extra.active).map((extra) => {
              const selected = extraIds.includes(extra.id);
              return (
                <button className={`rounded-full border px-4 py-2 text-sm font-black transition ${selected ? "border-green-200 bg-green-50 text-teal-800" : "border-slate-200 bg-white text-slate-600 hover:border-green-200"}`} key={extra.id} onClick={() => onSetExtraIds(selected ? extraIds.filter((id) => id !== extra.id) : [...extraIds, extra.id])} type="button">
                  {extra.name} +{currency(extra.price, pricingRules.currency)}
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewStep({ household, labels, onEditDetails, onEditProperty, pricingRules, propertyData, selectedAddress, selectedExtras, selectedFrequency, selectedService }: {
  household: HouseholdData;
  labels: CalculatorLabels;
  onEditDetails: () => void;
  onEditProperty: () => void;
  pricingRules: CleaningPricingRules;
  propertyData: PropertyData;
  selectedAddress: AddressResult | null;
  selectedExtras: Array<{ id: string; name: string; price: number }>;
  selectedFrequency?: { label: string };
  selectedService?: { name: string };
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <ReviewCard action={labels.editProperty} onAction={onEditProperty} title={labels.propertyReview}>
        <ReadonlyDetail label={labels.propertyAddress} value={selectedAddress?.formatted || "-"} />
        <ReadonlyDetail label={labels.squareFeet} value={propertyData.squareFeet || "-"} />
        <ReadonlyDetail label={labels.bedrooms} value={String(propertyData.bedrooms)} />
        <ReadonlyDetail label={labels.bathrooms} value={String(propertyData.bathrooms)} />
        <ReadonlyDetail label={labels.kitchens} value={String(propertyData.kitchens)} />
        <ReadonlyDetail label={labels.floors} value={String(propertyData.floors)} />
        <ReadonlyDetail label={labels.basement} value={propertyData.basement ? labels.yes : labels.no} />
        <ReadonlyDetail label={labels.distance} value={propertyData.distanceMiles ? `${propertyData.distanceMiles} mi` : "-"} />
      </ReviewCard>
      <ReviewCard action={labels.editCleaningDetails} onAction={onEditDetails} title={labels.householdReview}>
        <ReadonlyDetail label={labels.children} value={String(household.children)} />
        <ReadonlyDetail label={labels.cats} value={String(household.cats)} />
        <ReadonlyDetail label={labels.smallDogs} value={String(household.smallDogs)} />
        <ReadonlyDetail label={labels.largeDogs} value={String(household.largeDogs)} />
        <ReadonlyDetail label={labels.bedLinens} value={String(household.bedLinens)} />
      </ReviewCard>
      <ReviewCard action={labels.editCleaningDetails} onAction={onEditDetails} title={labels.serviceReview}>
        <ReadonlyDetail label={labels.serviceType} value={selectedService?.name} />
        <ReadonlyDetail label={labels.frequency} value={selectedFrequency?.label} />
        <ReadonlyDetail label={labels.extraServices} value={selectedExtras.length ? selectedExtras.map((extra) => `${extra.name} ${currency(extra.price, pricingRules.currency)}`).join(", ") : labels.noExtrasSelected} />
      </ReviewCard>
    </div>
  );
}

function PricingStep({ effectiveFinalPrice, finalPrice, labels, onCreateEstimate, onSaveQuote, onSetCalculationModal, onSetFinalPrice, onSetOverrideReason, oneTimeRecommendations, overrideReason, recurringComparison, result }: {
  effectiveFinalPrice: number;
  finalPrice: string;
  labels: CalculatorLabels;
  onCreateEstimate: () => void;
  onSaveQuote: () => void;
  onSetCalculationModal: (value: { title: string; components: PricingComponent[]; total: number }) => void;
  onSetFinalPrice: (value: string) => void;
  onSetOverrideReason: (value: string) => void;
  oneTimeRecommendations: Array<{ service: { name: string }; result: ReturnType<typeof calculateCleaningPrice> }>;
  overrideReason: string;
  recurringComparison: Array<{ frequency: { label: string }; result: ReturnType<typeof calculateCleaningPrice> }>;
  result: ReturnType<typeof calculateCleaningPrice>;
}) {
  return (
    <div className="grid gap-5">
      <Card>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <SectionTitle description={labels.priceNote} icon={<FileText className="h-5 w-5" />} title={labels.pricingStep} />
          <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
            <Input label={labels.finalPrice} inputMode="decimal" onChange={(event) => onSetFinalPrice(event.target.value)} placeholder={currency(result.recommendedPrice, result.currency)} value={finalPrice} />
            <Input label={labels.overrideReason} onChange={(event) => onSetOverrideReason(event.target.value)} value={overrideReason} />
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-700">{labels.recommendedPrice}</p>
            <p className="mt-2 text-4xl font-black text-slate-950">{currency(result.recommendedPrice, result.currency)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{labels.finalPrice}</p>
            <p className="mt-2 text-4xl font-black text-slate-950">{currency(effectiveFinalPrice, result.currency)}</p>
          </div>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button onClick={onSaveQuote} type="button" variant="outline"><Save className="h-4 w-4" />{labels.saveQuote}</Button>
            <Button onClick={onCreateEstimate} type="button"><FileText className="h-4 w-4" />{labels.createEstimate}</Button>
            <Button onClick={() => onSetCalculationModal({ components: result.components, title: labels.calculationBreakdown, total: result.recommendedPrice })} type="button" variant="outline">{labels.viewCalculation}</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <RecommendationList labels={labels} title={labels.recurringComparison} items={recurringComparison.map((item) => ({ components: item.result.components, name: item.frequency.label, price: item.result.recommendedPrice }))} />
        <RecommendationList labels={labels} title={labels.oneTimeRecommendations} items={oneTimeRecommendations.map((item) => ({ components: item.result.components, name: item.service.name, price: item.result.recommendedPrice }))} />
      </div>
    </div>
  );
}

function RecommendedPanel({ effectiveFinalPrice, labels, onOpenCalculation, result }: { effectiveFinalPrice: number; labels: CalculatorLabels; onOpenCalculation: () => void; result: ReturnType<typeof calculateCleaningPrice> }) {
  const confidenceLabel = result.confidence === "verified" ? labels.confidenceVerified : result.confidence === "estimated" ? labels.confidenceEstimated : labels.confidenceNeedsReview;

  return (
    <Card className="border-green-200 bg-white shadow-sm">
      <CardContent className="grid gap-4">
        <Badge tone="green">{labels.recommendedPrice}</Badge>
        <div>
          <p className="text-5xl font-black tracking-tight text-slate-950">{currency(effectiveFinalPrice, result.currency)}</p>
          <p className="mt-3 text-sm font-bold text-slate-500">{labels.estimatedLabor}: {result.estimatedLaborHours}h</p>
        </div>
        <div className="grid gap-2">
          <ReadonlyDetail label={labels.confidence} value={confidenceLabel} />
          <ReadonlyDetail label={labels.serviceType} value={result.selectedService?.name} />
          <ReadonlyDetail label={labels.frequency} value={result.selectedFrequency?.label} />
        </div>
        <Button onClick={onOpenCalculation} type="button" variant="outline">{labels.viewCalculation}</Button>
      </CardContent>
    </Card>
  );
}

function RecommendationList({ items, labels, title }: { items: Array<{ name: string; price: number; components: PricingComponent[] }>; labels: CalculatorLabels; title: string }) {
  return (
    <Card>
      <CardContent className="grid gap-3">
        <h3 className="text-base font-black text-slate-950">{title}</h3>
        {items.map((item) => (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3" key={item.name}>
            <span className="text-sm font-black text-slate-700">{item.name}</span>
            <span className="text-sm font-black text-slate-950">{currency(item.price)}</span>
          </div>
        ))}
        <p className="text-xs font-semibold text-slate-500">{labels.pricingRulesNote}</p>
      </CardContent>
    </Card>
  );
}

function CalculationRows({ components, currencyCode, total }: { components: PricingComponent[]; currencyCode: string; total: number }) {
  return (
    <div className="grid gap-2">
      {components.map((component) => (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 bg-white p-3 text-sm" key={component.key}>
          <span className="font-bold text-slate-600">{component.label}</span>
          <span className={`font-black ${component.amount < 0 ? "text-green-700" : "text-slate-950"}`}>{component.amount < 0 ? "-" : "+"}{currency(Math.abs(component.amount), currencyCode)}</span>
        </div>
      ))}
      <div className="mt-2 flex items-center justify-between rounded-xl bg-green-50 p-4 text-sm ring-1 ring-green-100">
        <span className="font-black text-teal-800">Recommended</span>
        <span className="text-xl font-black text-slate-950">{currency(total, currencyCode)}</span>
      </div>
    </div>
  );
}

function SectionTitle({ description, icon, title }: { description: string; icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-green-50 text-secondary ring-1 ring-green-100">{icon}</span>
      <div>
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function Select({ children, label, onChange, value }: { children: React.ReactNode; label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="grid gap-1.5 text-xs font-bold text-slate-600">
      {label}
      <select className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-cyan-100" value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}

function Counter({ label, onChange, value }: { label: string; onChange: (value: number) => void; value: number }) {
  return (
    <label className="grid gap-1.5 text-xs font-bold text-slate-600">
      {label}
      <div className="flex h-11 items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
        <button className="grid h-full w-10 place-items-center text-slate-500 hover:bg-slate-50" onClick={() => onChange(Math.max(0, value - 1))} type="button"><Minus className="h-4 w-4" /></button>
        <input className="h-full min-w-0 flex-1 border-x border-slate-100 text-center text-sm font-black outline-none" min={0} onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))} type="number" value={value} />
        <button className="grid h-full w-10 place-items-center text-slate-500 hover:bg-slate-50" onClick={() => onChange(value + 1)} type="button"><Plus className="h-4 w-4" /></button>
      </div>
    </label>
  );
}

function ToggleButton({ label, offLabel, onChange, onLabel, value }: { label: string; offLabel: string; onChange: (value: boolean) => void; onLabel: string; value: boolean }) {
  return (
    <div className="grid gap-1.5 text-xs font-bold text-slate-600">
      {label}
      <div className="grid h-11 grid-cols-2 rounded-lg border border-slate-200 bg-white p-1">
        <button className={`rounded-md text-sm font-black ${value ? "bg-secondary text-white" : "text-slate-500"}`} onClick={() => onChange(true)} type="button">{onLabel}</button>
        <button className={`rounded-md text-sm font-black ${!value ? "bg-slate-100 text-slate-700" : "text-slate-500"}`} onClick={() => onChange(false)} type="button">{offLabel}</button>
      </div>
    </div>
  );
}

function ReadonlyDetail({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-slate-900">{value || "-"}</p>
    </div>
  );
}

function ReviewCard({ action, children, onAction, title }: { action: string; children: React.ReactNode; onAction: () => void; title: string }) {
  return (
    <Card>
      <CardContent className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-black text-slate-950">{title}</h3>
          <Button onClick={onAction} type="button" variant="outline">{action}</Button>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function profileOptions(labels: CalculatorLabels) {
  return ["veryClean", "clean", "normal", "dirty", "veryDirty"].map((id) => ({ id, label: labels.profiles[id] ?? id }));
}

function organizationOptions(labels: CalculatorLabels) {
  return ["veryOrganized", "organized", "normal", "disorganized", "veryDisorganized"].map((id) => ({ id, label: labels.profiles[id] ?? id }));
}

function clientDisplayName(client?: ClientSummary) {
  return client?.displayName || client?.name || "-";
}

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const earthRadiusMiles = 3958.8;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(a));
}

function auditQuote(quote: PricingQuote) {
  fetch("/api/audit", {
    body: JSON.stringify({
      events: [
        normalizeAuditEvent({
          action: quote.finalPrice !== quote.recommendedPrice ? "pricing_overridden" : "quote_saved",
          actorDisplayNameSnapshot: readCookie("fastclean_user_name") || readCookie("fastclean_user_email") || "FastClean user",
          actorRoleSnapshot: readCookie("fastclean_role") || "owner",
          actorUserId: readCookie("fastclean_user_email") || readCookie("fastclean_session"),
          changeSummary: `Pricing quote saved for ${quote.customerName || quote.address?.formatted || "new customer"}.`,
          entityDisplayNameSnapshot: quote.customerName || quote.address?.formatted || quote.id,
          entityId: quote.id,
          entityType: "quote",
          metadata: { pricingSnapshot: quote.pricingSnapshot, status: quote.status },
          newValue: quote,
          source: "app",
          tenantId: readCookie("fastclean_session") || "tenant_raisa_cleaning"
        })
      ]
    }),
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    method: "POST"
  }).catch(() => undefined);
}
