export type CompanyAddressSearchConfig = {
  tenantId: string;
  countryCode: string;
  allowInternationalSearch: boolean;
  latitude?: number;
  longitude?: number;
  searchRadiusMiles: number;
  serviceAreaCities: string[];
  serviceAreaState?: string;
};

export type ProviderAddressResult = {
  provider: "google_places" | "nominatim";
  id: string;
  formatted: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  countryCode?: string;
  latitude?: string;
  longitude?: string;
  providerPlaceId?: string;
  resultType?: string;
  importance?: number;
};

export type AddressMemoryRecord = Partial<ProviderAddressResult> & {
  id?: string;
  formatted: string;
};

export type AddressSuggestion = ProviderAddressResult & {
  primaryText: string;
  secondaryText: string;
  relevanceScore: number;
};

export type GoogleAutocompleteRequestBody = {
  input: string;
  includedPrimaryTypes: string[];
  includeQueryPredictions: boolean;
  includedRegionCodes?: string[];
  locationBias?: {
    circle: {
      center: {
        latitude: number;
        longitude: number;
      };
      radius: number;
    };
  };
};

const usStateAbbreviations: Record<string, string> = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY"
};

const lowValueResultTypes = new Set(["administrative", "boundary", "city", "county", "state", "region"]);

export function stateCode(state: string, countryCode = "us") {
  if (countryCode.toLowerCase() !== "us") {
    return state;
  }

  const normalized = state.trim();
  if (normalized.length === 2) {
    return normalized.toUpperCase();
  }

  return usStateAbbreviations[normalized] ?? normalized;
}

export function formatAddressSuggestion(result: ProviderAddressResult) {
  const countryCode = result.countryCode || (result.country.toLowerCase().includes("united states") ? "us" : "");
  const state = stateCode(result.state, countryCode);
  const primaryText = result.street || firstAddressLine(result.formatted);
  const cityLine = [result.city, [state, result.postalCode].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const secondaryText = cityLine || conciseSecondaryLine(result.formatted);
  const formatted = [primaryText, secondaryText].filter(Boolean).join(", ");

  return {
    ...result,
    formatted,
    primaryText,
    secondaryText
  };
}

export function formatVisibleAddress(value: string) {
  const parts = value.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 2) {
    return value.trim();
  }

  const street = parts[0];
  const country = parts.at(-1) ?? "";
  const withoutCountry = country.toLowerCase().includes("united states") ? parts.slice(0, -1) : parts;
  const postalCodeIndex = withoutCountry.findIndex((part) => /^\d{5}(?:-\d{4})?$/.test(part));
  const postalCode = postalCodeIndex >= 0 ? withoutCountry[postalCodeIndex] : "";
  const statePart = postalCodeIndex > 1 ? withoutCountry[postalCodeIndex - 1] : withoutCountry.at(-1) ?? "";
  const state = stateCode(statePart, country.toLowerCase().includes("united states") ? "us" : "");
  const countyPart = withoutCountry.find((part) => /\bcounty\b/i.test(part));
  const directCity = withoutCountry[1] ?? "";
  const city = countyPart ? countyPart.replace(/\s+county\b/i, "").trim() : directCity;

  if (!street || !city || !state) {
    return value.trim();
  }

  return [street, [city, [state, postalCode].filter(Boolean).join(" ")].filter(Boolean).join(", ")].filter(Boolean).join(", ");
}

export function addressMatchesQuery(result: ProviderAddressResult, query: string) {
  const haystack = normalize(`${result.street} ${result.formatted} ${result.city} ${result.state} ${result.postalCode}`);
  const haystackTokens = haystack.split(" ").filter(Boolean);
  return normalize(query).split(" ").filter(Boolean).every((queryToken) => haystackTokens.some((token) => token.startsWith(queryToken)));
}

export function memoryRecordToAddress(record: AddressMemoryRecord, index = 0): ProviderAddressResult {
  const formatted = formatVisibleAddress(record.formatted);
  const parts = formatted.split(",").map((part) => part.trim()).filter(Boolean);
  const city = parts.length >= 3 ? parts[1] : "";
  const stateZip = parts.length >= 3 ? parts[2] : parts[1] ?? "";
  const stateZipMatch = stateZip.match(/^([A-Z]{2}|[A-Za-z ]+)\s*(\d{5}(?:-\d{4})?)?$/);

  return {
    city: record.city || city || "",
    country: record.country || "United States",
    countryCode: record.countryCode || "us",
    formatted,
    id: record.id || `memory_${index}`,
    latitude: record.latitude,
    longitude: record.longitude,
    postalCode: record.postalCode || stateZipMatch?.[2] || "",
    provider: record.provider || "nominatim",
    providerPlaceId: record.providerPlaceId,
    resultType: record.resultType || "stored_address",
    state: record.state || stateZipMatch?.[1] || "",
    street: record.street || parts[0] || formatted
  };
}

export function rankAddressSuggestions(results: ProviderAddressResult[], query: string, config: CompanyAddressSearchConfig): AddressSuggestion[] {
  const seen = new Set<string>();
  const queryHouseNumber = query.match(/^\s*(\d+)/)?.[1];
  return results
    .map((result) => formatAddressSuggestion(result))
    .filter((result) => {
      const countryCode = (result.countryCode || (result.country.toLowerCase().includes("united states") ? "us" : "")).toLowerCase();
      if (!config.allowInternationalSearch && config.countryCode.toLowerCase() === "us" && countryCode && countryCode !== "us") {
        return false;
      }

      const key = `${result.primaryText}|${result.secondaryText}`.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      if (queryHouseNumber && result.street && !result.street.match(new RegExp(`^${queryHouseNumber}\\b`)) && isGenericRoadResult(result)) {
        return false;
      }
      return true;
    })
    .map((result) => ({ ...result, relevanceScore: scoreAddressResult(result, query, config) }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 8);
}

export function scoreAddressResult(result: ProviderAddressResult, query: string, config: CompanyAddressSearchConfig) {
  const normalizedQuery = normalize(query);
  const haystack = normalize(`${result.street} ${result.city} ${result.state} ${result.postalCode} ${result.formatted}`);
  const state = stateCode(result.state, result.countryCode || "us");
  let score = 0;

  if (result.street) score += 80;
  if (/\d/.test(result.street)) score += 40;
  if (haystack.includes(normalizedQuery)) score += 35;
  if (result.provider === "google_places") score += 25;
  if (result.resultType === "stored_address" || result.id.startsWith("seed_")) score += 60;
  if ((result.countryCode || "").toLowerCase() === config.countryCode.toLowerCase()) score += 20;
  if (config.serviceAreaState && state === stateCode(config.serviceAreaState)) score += 45;
  if (config.serviceAreaCities.some((city) => normalize(city) === normalize(result.city))) score += 85;
  if (result.importance) score += Math.min(20, result.importance * 10);
  if (result.resultType && lowValueResultTypes.has(result.resultType)) score -= 120;
  if (!result.street) score -= 60;

  const distance = distanceFromCompany(result, config);
  if (distance !== undefined) {
    if (distance <= config.searchRadiusMiles) score += 80;
    else if (distance <= config.searchRadiusMiles * 2) score += 35;
    else if (distance <= config.searchRadiusMiles * 4) score += 10;
    else score -= Math.min(80, distance / 30);
  }

  return Math.round(score * 100) / 100;
}

export function buildNominatimViewbox(config: CompanyAddressSearchConfig) {
  if (config.latitude === undefined || config.longitude === undefined) {
    return undefined;
  }

  const latDelta = config.searchRadiusMiles / 69;
  const lonDelta = config.searchRadiusMiles / Math.max(1, 69 * Math.cos(config.latitude * Math.PI / 180));
  const left = config.longitude - lonDelta;
  const right = config.longitude + lonDelta;
  const top = config.latitude + latDelta;
  const bottom = config.latitude - latDelta;
  return `${left},${top},${right},${bottom}`;
}

export function buildLocalSearchQueries(query: string, config: CompanyAddressSearchConfig) {
  const trimmed = query.trim();
  const hasStateOrCity = config.serviceAreaCities.some((city) => normalize(trimmed).includes(normalize(city))) || (config.serviceAreaState && normalize(trimmed).includes(normalize(config.serviceAreaState)));
  if (hasStateOrCity) {
    return [trimmed];
  }

  const localSuffix = [config.serviceAreaCities[0], config.serviceAreaState].filter(Boolean).join(", ");
  const regionalSuffix = config.serviceAreaState || "";
  return Array.from(new Set([
    localSuffix ? `${trimmed}, ${localSuffix}` : trimmed,
    regionalSuffix ? `${trimmed}, ${regionalSuffix}` : trimmed,
    trimmed
  ]));
}

export function buildGoogleAutocompleteRequest(query: string, config: CompanyAddressSearchConfig): GoogleAutocompleteRequestBody {
  const body: GoogleAutocompleteRequestBody = {
    includeQueryPredictions: false,
    includedPrimaryTypes: ["street_address", "premise", "subpremise"],
    input: query
  };

  if (!config.allowInternationalSearch && config.countryCode) {
    body.includedRegionCodes = [config.countryCode.toLowerCase()];
  }

  if (config.latitude !== undefined && config.longitude !== undefined) {
    body.locationBias = {
      circle: {
        center: { latitude: config.latitude, longitude: config.longitude },
        radius: Math.round(config.searchRadiusMiles * 1609.344)
      }
    };
  }

  return body;
}

function firstAddressLine(formatted: string) {
  return formatted.split(",").map((part) => part.trim()).find(Boolean) ?? formatted;
}

function conciseSecondaryLine(formatted: string) {
  const parts = formatted.split(",").map((part) => part.trim()).filter(Boolean);
  return parts.slice(1, 3).join(", ");
}

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function isGenericRoadResult(result: ProviderAddressResult) {
  const type = (result.resultType ?? "").toLowerCase();
  return !/^\d+\b/.test(result.street) && (type.includes("road") || type.includes("street") || type.includes("residential") || type.includes("tertiary") || type.includes("secondary") || type.includes("primary") || type === "house");
}

function distanceFromCompany(result: ProviderAddressResult, config: CompanyAddressSearchConfig) {
  if (config.latitude === undefined || config.longitude === undefined || !result.latitude || !result.longitude) {
    return undefined;
  }

  const latitude = Number(result.latitude);
  const longitude = Number(result.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return undefined;
  }

  return haversineMiles(config.latitude, config.longitude, latitude, longitude);
}

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const earthRadiusMiles = 3958.8;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(a));
}
