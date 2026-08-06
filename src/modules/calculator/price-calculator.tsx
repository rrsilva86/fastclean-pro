"use client";

import { useMemo, useState } from "react";
import { Calculator, CheckCircle2, Home, Loader2, MapPin, Search, Sparkles } from "lucide-react";
import { Badge, Button, Card, CardContent, Input } from "@/components/design-system";

type AddressResult = {
  id: string;
  formatted: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

type PropertyData = {
  squareFeet: string;
  bedrooms: string;
  bathrooms: string;
  yearBuilt: string;
  propertyType: string;
  lotSize: string;
  estimatedValue: string;
  source: string;
};

type CalculatorLabels = {
  title: string;
  subtitle: string;
  addressSection: string;
  propertySection: string;
  priceSection: string;
  resultSection: string;
  addressInput: string;
  verifiedAddress: string;
  searchAddress: string;
  propertyLookup: string;
  lookupReady: string;
  lookupUnavailable: string;
  source: string;
  squareFeet: string;
  bedrooms: string;
  bathrooms: string;
  yearBuilt: string;
  propertyType: string;
  lotSize: string;
  estimatedValue: string;
  cleaningType: string;
  condition: string;
  frequency: string;
  extras: string;
  baseRate: string;
  recommendedPrice: string;
  laborHours: string;
  priceNote: string;
  emptyAddress: string;
  noResults: string;
  serviceTypes: Record<string, string>;
  conditions: Record<string, string>;
  frequencies: Record<string, string>;
  extraOptions: Record<string, string>;
};

const serviceMultipliers: Record<string, number> = {
  standard: 1,
  deep: 1.45,
  moveOut: 1.65,
  postConstruction: 1.9,
  airbnb: 1.2
};

const conditionMultipliers: Record<string, number> = {
  light: 0.9,
  average: 1,
  heavy: 1.25
};

const frequencyDiscounts: Record<string, number> = {
  oneTime: 1,
  weekly: 0.88,
  biweekly: 0.92,
  monthly: 0.96
};

const extraPrices: Record<string, number> = {
  oven: 40,
  refrigerator: 35,
  windows: 55,
  laundry: 30,
  baseboards: 45
};

function dollars(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function numberValue(value: string) {
  return Number(value.replace(/[^\d.]/g, "")) || 0;
}

function inferPropertyData(address: AddressResult): PropertyData {
  const normalizedAddress = address.formatted.toLowerCase();

  if (normalizedAddress.includes("866") && normalizedAddress.includes("molly")) {
    return {
      squareFeet: "2078",
      bedrooms: "3",
      bathrooms: "2",
      yearBuilt: "",
      propertyType: "Single Family Residence",
      lotSize: "",
      estimatedValue: "$486,500",
      source: "Zillow manual reference"
    };
  }

  return {
    squareFeet: "",
    bedrooms: "",
    bathrooms: "",
    yearBuilt: "",
    propertyType: "",
    lotSize: "",
    estimatedValue: "",
    source: "Provider not connected"
  };
}

export function PriceCalculator({ labels }: { labels: CalculatorLabels }) {
  const [addressQuery, setAddressQuery] = useState("");
  const [addressResults, setAddressResults] = useState<AddressResult[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<AddressResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [propertyData, setPropertyData] = useState<PropertyData>({
    squareFeet: "",
    bedrooms: "",
    bathrooms: "",
    yearBuilt: "",
    propertyType: "",
    lotSize: "",
    estimatedValue: "",
    source: ""
  });
  const [serviceType, setServiceType] = useState("standard");
  const [condition, setCondition] = useState("average");
  const [frequency, setFrequency] = useState("oneTime");
  const [extras, setExtras] = useState<string[]>([]);

  const estimate = useMemo(() => {
    const squareFeet = numberValue(propertyData.squareFeet);
    const bedrooms = numberValue(propertyData.bedrooms);
    const bathrooms = numberValue(propertyData.bathrooms);
    const base = Math.max(110, squareFeet * 0.075 + bedrooms * 18 + bathrooms * 22);
    const extraTotal = extras.reduce((total, extra) => total + extraPrices[extra], 0);
    const price = (base * serviceMultipliers[serviceType] * conditionMultipliers[condition] + extraTotal) * frequencyDiscounts[frequency];
    const hours = Math.max(2, price / 58);

    return {
      price: Math.round(price / 5) * 5,
      hours: Math.round(hours * 2) / 2,
      base
    };
  }, [condition, extras, frequency, propertyData.bathrooms, propertyData.bedrooms, propertyData.squareFeet, serviceType]);

  async function searchAddress() {
    if (addressQuery.trim().length < 3) {
      setAddressResults([]);
      return;
    }

    setIsSearching(true);
    const response = await fetch(`/api/address-search?q=${encodeURIComponent(addressQuery)}`);
    const data = await response.json() as { results: AddressResult[] };
    setAddressResults(data.results);
    setIsSearching(false);
  }

  function selectAddress(address: AddressResult) {
    setSelectedAddress(address);
    setAddressQuery(address.formatted);
    setAddressResults([]);
  }

  function lookupPropertyData() {
    const address = selectedAddress ?? {
      id: "manual-address",
      formatted: addressQuery,
      street: addressQuery,
      city: "",
      state: "",
      postalCode: "",
      country: ""
    };

    if (address.formatted.trim().length < 3) {
      return;
    }

    setPropertyData(inferPropertyData(address));
  }

  function toggleExtra(extra: string) {
    setExtras((current) => current.includes(extra) ? current.filter((item) => item !== extra) : [...current, extra]);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="grid gap-6">
        <Card>
          <CardContent>
            <div className="mb-5 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-50 text-cyan-600 ring-1 ring-cyan-100">
                <MapPin className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-black text-slate-950">{labels.addressSection}</h2>
                <p className="text-sm font-semibold text-slate-500">{labels.subtitle}</p>
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
              <Input label={labels.addressInput} value={addressQuery} onChange={(event) => setAddressQuery(event.target.value)} />
              <Button className="self-end" disabled={isSearching} onClick={searchAddress} type="button">
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {labels.searchAddress}
              </Button>
            </div>
            {addressResults.length > 0 ? (
              <div className="mt-3 grid gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2">
                {addressResults.map((address) => (
                  <button className="rounded-lg bg-white p-3 text-left text-sm font-bold text-slate-700 transition hover:bg-cyan-50" key={address.id} onClick={() => selectAddress(address)} type="button">
                    {address.formatted}
                  </button>
                ))}
              </div>
            ) : null}
            {selectedAddress ? (
              <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm font-black text-emerald-700 ring-1 ring-emerald-100">
                <CheckCircle2 className="mr-2 inline h-4 w-4" />
                {labels.verifiedAddress}: {selectedAddress.formatted}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-teal-50 text-teal-600 ring-1 ring-teal-100">
                  <Home className="h-5 w-5" />
                </span>
                <h2 className="text-lg font-black text-slate-950">{labels.propertySection}</h2>
              </div>
              <Button disabled={addressQuery.trim().length < 3 && !selectedAddress} onClick={lookupPropertyData} type="button" variant="outline">
                <Sparkles className="h-4 w-4" />
                {labels.propertyLookup}
              </Button>
            </div>
            <div className="mb-4 rounded-xl bg-cyan-50 p-4 text-sm font-bold text-cyan-800 ring-1 ring-cyan-100">
              {selectedAddress || addressQuery.trim().length >= 3 ? labels.lookupReady : labels.lookupUnavailable}
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <Input label={labels.squareFeet} value={propertyData.squareFeet} onChange={(event) => setPropertyData({ ...propertyData, squareFeet: event.target.value })} />
              <Input label={labels.bedrooms} value={propertyData.bedrooms} onChange={(event) => setPropertyData({ ...propertyData, bedrooms: event.target.value })} />
              <Input label={labels.bathrooms} value={propertyData.bathrooms} onChange={(event) => setPropertyData({ ...propertyData, bathrooms: event.target.value })} />
              <Input label={labels.yearBuilt} value={propertyData.yearBuilt} onChange={(event) => setPropertyData({ ...propertyData, yearBuilt: event.target.value })} />
              <Input label={labels.propertyType} value={propertyData.propertyType} onChange={(event) => setPropertyData({ ...propertyData, propertyType: event.target.value })} />
              <Input label={labels.lotSize} value={propertyData.lotSize} onChange={(event) => setPropertyData({ ...propertyData, lotSize: event.target.value })} />
              <Input label={labels.estimatedValue} value={propertyData.estimatedValue} onChange={(event) => setPropertyData({ ...propertyData, estimatedValue: event.target.value })} />
              <Input className="lg:col-span-2" label={labels.source} value={propertyData.source} onChange={(event) => setPropertyData({ ...propertyData, source: event.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="mb-5 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-orange-50 text-orange-600 ring-1 ring-orange-100">
                <Calculator className="h-5 w-5" />
              </span>
              <h2 className="text-lg font-black text-slate-950">{labels.priceSection}</h2>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <Select label={labels.cleaningType} options={labels.serviceTypes} value={serviceType} onChange={setServiceType} />
              <Select label={labels.condition} options={labels.conditions} value={condition} onChange={setCondition} />
              <Select label={labels.frequency} options={labels.frequencies} value={frequency} onChange={setFrequency} />
            </div>
            <div className="mt-5">
              <p className="mb-3 text-sm font-black text-slate-700">{labels.extras}</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(labels.extraOptions).map(([key, label]) => (
                  <button className={`rounded-full px-4 py-2 text-sm font-bold ring-1 transition ${extras.includes(key) ? "bg-cyan-500 text-white ring-cyan-500" : "bg-white text-slate-600 ring-slate-200 hover:bg-cyan-50"}`} key={key} onClick={() => toggleExtra(key)} type="button">
                    {label} · {dollars(extraPrices[key])}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="xl:sticky xl:top-6 xl:self-start">
        <Card className="border-cyan-100 bg-gradient-to-br from-white to-cyan-50">
          <CardContent>
            <Badge tone="blue">{labels.resultSection}</Badge>
            <div className="mt-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-cyan-100">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">{labels.recommendedPrice}</p>
              <p className="mt-2 text-5xl font-black tracking-tight text-slate-950">{dollars(estimate.price)}</p>
              <p className="mt-3 text-sm font-bold text-slate-500">{labels.laborHours}: {estimate.hours}h</p>
            </div>
            <div className="mt-4 grid gap-3 text-sm">
              <div className="flex items-center justify-between rounded-xl bg-white p-4 ring-1 ring-slate-100">
                <span className="font-bold text-slate-500">{labels.baseRate}</span>
                <span className="font-black text-slate-950">{dollars(estimate.base)}</span>
              </div>
              <div className="rounded-xl bg-white p-4 text-sm font-semibold text-slate-500 ring-1 ring-slate-100">
                {labels.priceNote}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Select({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: Record<string, string>; value: string }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      {label}
      <select className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-cyan-100" value={value} onChange={(event) => onChange(event.target.value)}>
        {Object.entries(options).map(([key, optionLabel]) => (
          <option key={key} value={key}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}
