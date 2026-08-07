import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  addressMatchesQuery,
  buildLocalSearchQueries,
  buildGoogleAutocompleteRequest,
  buildNominatimViewbox,
  memoryRecordToAddress,
  rankAddressSuggestions,
  stateCode,
  type AddressMemoryRecord,
  type CompanyAddressSearchConfig,
  type ProviderAddressResult
} from "@/lib/address/address-autocomplete";
import { queryPostgres } from "@/lib/db/postgres";

export const runtime = "nodejs";

type NominatimAddress = {
  house_number?: string;
  road?: string;
  pedestrian?: string;
  hamlet?: string;
  neighbourhood?: string;
  suburb?: string;
  municipality?: string;
  county?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
  postcode?: string;
  country?: string;
  country_code?: string;
};

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  class?: string;
  type?: string;
  importance?: number;
  address?: NominatimAddress;
};

type GoogleAutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: {
      place?: string;
      placeId?: string;
      text?: { text?: string };
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
      types?: string[];
    };
  }>;
};

type GooglePlaceDetails = {
  id?: string;
  formattedAddress?: string;
  addressComponents?: Array<{
    longText?: string;
    shortText?: string;
    types?: string[];
  }>;
  location?: {
    latitude?: number;
    longitude?: number;
  };
};

const tenantSearchDefaults: Record<string, Partial<CompanyAddressSearchConfig>> = {
  tenant_raisa_cleaning: {
    countryCode: "us",
    latitude: 27.3364,
    longitude: -82.5307,
    searchRadiusMiles: 45,
    serviceAreaCities: ["Sarasota", "Bradenton", "Lakewood Ranch", "Venice", "North Port"],
    serviceAreaState: "FL"
  }
};

const tenantKnownAddressSeeds: Record<string, AddressMemoryRecord[]> = {
  tenant_raisa_cleaning: [
    {
      city: "Sarasota",
      country: "United States",
      countryCode: "us",
      formatted: "866 Molly Circle, Sarasota, FL 34232",
      id: "seed_866_molly_circle",
      latitude: "27.2709",
      longitude: "-82.4807",
      postalCode: "34232",
      provider: "nominatim",
      resultType: "stored_address",
      state: "FL",
      street: "866 Molly Circle"
    }
  ]
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 3) {
    return NextResponse.json({ results: [] });
  }

  const config = await getCompanyAddressSearchConfig(request);
  const rememberedResults = await searchRememberedAddresses(query, config);
  const googleResults = await searchGooglePlaces(query, config);
  const providerResults = googleResults.length > 0 ? [...rememberedResults, ...googleResults] : [...rememberedResults, ...await searchNominatim(query, config)];
  const rankedResults = rankAddressSuggestions(providerResults, query, config);

  return NextResponse.json({
    config: {
      countryCode: config.countryCode,
      locationBias: config.latitude !== undefined && config.longitude !== undefined,
      rememberedResults: rememberedResults.length,
      provider: googleResults.length > 0 ? "google_places" : "nominatim",
      searchRadiusMiles: config.searchRadiusMiles,
      serviceAreaCities: config.serviceAreaCities,
      serviceAreaState: config.serviceAreaState
    },
    results: rankedResults.map((result) => ({
      city: result.city,
      country: result.country,
      countryCode: result.countryCode,
      formatted: result.formatted,
      id: result.id,
      latitude: result.latitude,
      longitude: result.longitude,
      postalCode: result.postalCode,
      primaryText: result.primaryText,
      provider: result.provider,
      providerPlaceId: result.providerPlaceId,
      relevanceScore: result.relevanceScore,
      secondaryText: result.secondaryText,
      state: stateCode(result.state, result.countryCode || config.countryCode),
      street: result.street
    }))
  });
}

async function searchRememberedAddresses(query: string, config: CompanyAddressSearchConfig): Promise<ProviderAddressResult[]> {
  const defaultSeeds = config.serviceAreaCities.some((city) => city.toLowerCase() === "sarasota") ? tenantKnownAddressSeeds.tenant_raisa_cleaning : [];
  const records = [...(tenantKnownAddressSeeds[config.tenantId] ?? defaultSeeds), ...await readStoredAddressRecords(config.tenantId)];
  return records
    .map((record, index) => memoryRecordToAddress(record, index))
    .filter((address) => addressMatchesQuery(address, query));
}

async function readStoredAddressRecords(tenantId: string) {
  try {
    const result = await queryPostgres<{ records: AddressMemoryRecord[] }>(
      "select records from app_record_snapshots where tenant_key = $1 and collection_key = $2",
      [tenantId, "fastclean_address_memory"]
    );
    return Array.isArray(result.rows[0]?.records) ? result.rows[0].records : [];
  } catch {
    return [];
  }
}

async function getCompanyAddressSearchConfig(request: Request): Promise<CompanyAddressSearchConfig> {
  const cookieStore = await cookies();
  const tenantId = decodeURIComponent(cookieStore.get("fastclean_session")?.value ?? "tenant_raisa_cleaning");
  const url = new URL(request.url);
  const defaults = tenantSearchDefaults[tenantId] ?? {};
  const latitude = numberFrom(url.searchParams.get("lat")) ?? numberFrom(process.env.FASTCLEAN_COMPANY_LATITUDE) ?? defaults.latitude;
  const longitude = numberFrom(url.searchParams.get("lng")) ?? numberFrom(process.env.FASTCLEAN_COMPANY_LONGITUDE) ?? defaults.longitude;
  const searchRadiusMiles = numberFrom(url.searchParams.get("radiusMiles")) ?? numberFrom(process.env.FASTCLEAN_ADDRESS_SEARCH_RADIUS_MILES) ?? defaults.searchRadiusMiles ?? 50;
  const serviceAreaCities = parseList(url.searchParams.get("serviceAreaCities") || process.env.FASTCLEAN_SERVICE_AREA_CITIES) ?? defaults.serviceAreaCities ?? [];

  return {
    allowInternationalSearch: process.env.FASTCLEAN_ALLOW_INTERNATIONAL_ADDRESS_SEARCH === "true",
    countryCode: (url.searchParams.get("countryCode") || process.env.FASTCLEAN_COMPANY_COUNTRY_CODE || defaults.countryCode || "us").toLowerCase(),
    latitude,
    longitude,
    searchRadiusMiles,
    serviceAreaCities,
    serviceAreaState: url.searchParams.get("serviceAreaState") || process.env.FASTCLEAN_SERVICE_AREA_STATE || defaults.serviceAreaState,
    tenantId
  };
}

async function searchGooglePlaces(query: string, config: CompanyAddressSearchConfig): Promise<ProviderAddressResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return [];
  }

  const body = buildGoogleAutocompleteRequest(query, config);

  const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey
    },
    method: "POST",
    next: { revalidate: 60 }
  }).catch(() => undefined);

  if (!response?.ok) {
    return [];
  }

  const payload = await response.json() as GoogleAutocompleteResponse;
  const predictions = payload.suggestions?.map((suggestion) => suggestion.placePrediction).filter(Boolean) ?? [];
  const details = await Promise.all(predictions.slice(0, 6).map((prediction) => fetchGooglePlaceDetails(prediction?.placeId || prediction?.place?.replace("places/", "") || "", apiKey)));

  return predictions.map((prediction, index) => {
    const detail = details[index];
    if (detail) {
      return googleDetailsToAddress(detail, prediction?.placeId || prediction?.place || "");
    }

    return {
      city: "",
      country: config.countryCode === "us" ? "United States" : "",
      countryCode: config.countryCode,
      formatted: prediction?.text?.text ?? "",
      id: prediction?.placeId || prediction?.place || `google_${index}`,
      postalCode: "",
      provider: "google_places" as const,
      providerPlaceId: prediction?.placeId || prediction?.place,
      resultType: prediction?.types?.[0],
      state: "",
      street: prediction?.structuredFormat?.mainText?.text ?? prediction?.text?.text ?? ""
    };
  }).filter((result) => result.street || result.formatted);
}

async function fetchGooglePlaceDetails(placeId: string, apiKey: string) {
  if (!placeId) {
    return undefined;
  }

  const normalizedPlaceId = placeId.startsWith("places/") ? placeId : `places/${placeId}`;
  const response = await fetch(`https://places.googleapis.com/v1/${normalizedPlaceId}`, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "id,formattedAddress,addressComponents,location"
    },
    next: { revalidate: 86400 }
  }).catch(() => undefined);

  if (!response?.ok) {
    return undefined;
  }

  return response.json() as Promise<GooglePlaceDetails>;
}

async function searchNominatim(query: string, config: CompanyAddressSearchConfig): Promise<ProviderAddressResult[]> {
  const results: ProviderAddressResult[] = [];
  const queries = buildLocalSearchQueries(query, config);

  for (const localQuery of queries) {
    const localResults = await fetchNominatim(localQuery, config, true);
    results.push(...localResults);
    if (results.length >= 8 && localQuery !== query) {
      break;
    }
  }

  if (results.length < 4) {
    results.push(...await fetchNominatim(query, config, false));
  }

  return results;
}

async function fetchNominatim(query: string, config: CompanyAddressSearchConfig, localBias: boolean) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("dedupe", "1");
  url.searchParams.set("limit", localBias ? "8" : "12");

  if (!config.allowInternationalSearch && config.countryCode) {
    url.searchParams.set("countrycodes", config.countryCode.toLowerCase());
  }

  const viewbox = localBias ? buildNominatimViewbox(config) : undefined;
  if (viewbox) {
    url.searchParams.set("viewbox", viewbox);
    url.searchParams.set("bounded", "0");
  }

  const response = await fetch(url, {
    headers: {
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent": "FastCleanPro/1.0 (address autocomplete; contact: support@fastcleanpro.com)"
    },
    next: { revalidate: 3600 }
  }).catch(() => undefined);

  if (!response?.ok) {
    return [];
  }

  const payload = await response.json() as NominatimResult[];
  return payload.map((result) => nominatimToAddress(result, config));
}

function nominatimToAddress(result: NominatimResult, config: CompanyAddressSearchConfig): ProviderAddressResult {
  const address = result.address ?? {};
  const streetName = address.road ?? address.pedestrian ?? "";
  const street = [address.house_number, streetName].filter(Boolean).join(" ");
  const city = resolveNominatimCity(address, config);

  return {
    city,
    country: address.country ?? "",
    countryCode: address.country_code,
    formatted: result.display_name,
    id: String(result.place_id),
    importance: result.importance,
    latitude: result.lat,
    longitude: result.lon,
    postalCode: address.postcode ?? "",
    provider: "nominatim",
    providerPlaceId: String(result.place_id),
    resultType: result.type ?? result.class,
    state: address.state ?? "",
    street
  };
}

function resolveNominatimCity(address: NominatimAddress, config: CompanyAddressSearchConfig) {
  const postalCity = address.city ?? address.town ?? address.village ?? address.municipality;
  if (postalCity) {
    return postalCity;
  }

  const microLocality = address.hamlet ?? address.suburb ?? address.neighbourhood ?? "";
  const state = stateCode(address.state ?? "", "us");
  const serviceState = config.serviceAreaState ? stateCode(config.serviceAreaState, "us") : "";
  const primaryServiceCity = config.serviceAreaCities[0];
  const county = address.county?.toLowerCase() ?? "";

  if (microLocality && primaryServiceCity && serviceState && state === serviceState && county.includes(primaryServiceCity.toLowerCase())) {
    return primaryServiceCity;
  }

  return microLocality;
}

function googleDetailsToAddress(detail: GooglePlaceDetails, fallbackId: string): ProviderAddressResult {
  const getComponent = (type: string, mode: "longText" | "shortText" = "longText") => detail.addressComponents?.find((component) => component.types?.includes(type))?.[mode] ?? "";
  const streetNumber = getComponent("street_number");
  const route = getComponent("route");
  const street = [streetNumber, route].filter(Boolean).join(" ");
  const countryCode = getComponent("country", "shortText").toLowerCase();

  return {
    city: getComponent("locality") || getComponent("postal_town") || getComponent("administrative_area_level_3"),
    country: getComponent("country"),
    countryCode,
    formatted: detail.formattedAddress ?? street,
    id: detail.id || fallbackId,
    latitude: detail.location?.latitude !== undefined ? String(detail.location.latitude) : undefined,
    longitude: detail.location?.longitude !== undefined ? String(detail.location.longitude) : undefined,
    postalCode: getComponent("postal_code"),
    provider: "google_places",
    providerPlaceId: detail.id || fallbackId,
    resultType: "street_address",
    state: getComponent("administrative_area_level_1", "shortText"),
    street
  };
}

function numberFrom(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function parseList(value?: string | null) {
  if (!value) {
    return undefined;
  }

  return value.split(",").map((item) => item.trim()).filter(Boolean);
}
