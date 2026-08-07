import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";

const sourcePath = new URL("../src/lib/address/address-autocomplete.ts", import.meta.url);
const source = readFileSync(sourcePath, "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022
  }
});
const runtimePath = join(mkdtempSync(join(tmpdir(), "fastclean-address-tests-")), "address-autocomplete.mjs");
writeFileSync(runtimePath, output.outputText);

const {
  buildGoogleAutocompleteRequest,
  buildLocalSearchQueries,
  buildNominatimViewbox,
  addressMatchesQuery,
  formatAddressSuggestion,
  formatVisibleAddress,
  memoryRecordToAddress,
  rankAddressSuggestions,
  stateCode
} = await import(runtimePath);

const sarasotaConfig = {
  allowInternationalSearch: false,
  countryCode: "us",
  latitude: 27.3364,
  longitude: -82.5307,
  searchRadiusMiles: 45,
  serviceAreaCities: ["Sarasota", "Bradenton", "Lakewood Ranch", "Venice", "North Port"],
  serviceAreaState: "FL",
  tenantId: "tenant_raisa_cleaning"
};

const localMolly = {
  city: "Sarasota",
  country: "United States",
  countryCode: "us",
  formatted: "866 Molly Circle, Sarasota, Florida, 34232, United States",
  id: "local",
  latitude: "27.2709",
  longitude: "-82.4807",
  postalCode: "34232",
  provider: "nominatim",
  resultType: "house",
  state: "Florida",
  street: "866 Molly Circle"
};

const farMolly = {
  city: "Molly",
  country: "United States",
  countryCode: "us",
  formatted: "866 Molly Road, Tennessee, United States",
  id: "far",
  latitude: "36.1627",
  longitude: "-86.7816",
  postalCode: "37000",
  provider: "nominatim",
  resultType: "house",
  state: "Tennessee",
  street: "866 Molly Road"
};

const genericRoad = {
  city: "Johnson City",
  country: "United States",
  countryCode: "us",
  formatted: "Car Mol Drive, Johnson City, Tennessee, 37601, United States",
  id: "generic-road",
  latitude: "36.3705",
  longitude: "-82.4016",
  postalCode: "37601",
  provider: "nominatim",
  resultType: "road",
  state: "Tennessee",
  street: "Car Mol Drive"
};

const argentina = {
  city: "Molina",
  country: "Argentina",
  countryCode: "ar",
  formatted: "866 Molina, Argentina",
  id: "ar",
  latitude: "-34.6",
  longitude: "-58.38",
  postalCode: "",
  provider: "nominatim",
  resultType: "house",
  state: "",
  street: "866 Molina"
};

assert.equal(stateCode("Florida", "us"), "FL", "US states are abbreviated");

const formatted = formatAddressSuggestion(localMolly);
assert.equal(formatted.primaryText, "866 Molly Circle", "primary line is the street address");
assert.equal(formatted.secondaryText, "Sarasota, FL 34232", "secondary line is city/state ZIP");
assert.equal(formatted.formatted, "866 Molly Circle, Sarasota, FL 34232", "verbose provider hierarchy is removed");
assert.equal(
  formatVisibleAddress("866 Molly Circle, Belspur, Sarasota County, Florida, 34232, United States"),
  "866 Molly Circle, Sarasota, FL 34232",
  "customer-facing address removes hamlet/county/country from raw provider strings"
);
const rememberedMolly = memoryRecordToAddress({ formatted: "866 Molly Circle, Sarasota, FL 34232" });
assert.equal(addressMatchesQuery(rememberedMolly, "866 mol"), true, "remembered local addresses match partial street prefixes");

const ranked = rankAddressSuggestions([genericRoad, farMolly, localMolly, argentina], "866 mol", sarasotaConfig);
assert.equal(ranked[0].id, "local", "Sarasota result ranks above unrelated states");
assert.equal(ranked.some((result) => result.id === "ar"), false, "US company excludes international results");
assert.ok(ranked.some((result) => result.id === "far"), "broader US fallback remains allowed");
assert.equal(ranked.some((result) => result.id === "generic-road"), false, "generic roads without the typed house number are excluded");

const internationalConfig = { ...sarasotaConfig, allowInternationalSearch: true, countryCode: "br" };
const internationalRanked = rankAddressSuggestions([argentina], "866 mol", internationalConfig);
assert.equal(internationalRanked.length, 1, "international companies can support international search");

const queries = buildLocalSearchQueries("866 mol", sarasotaConfig);
assert.deepEqual(queries, ["866 mol, Sarasota, FL", "866 mol, FL", "866 mol"], "local biased queries are generated before broad fallback");

const viewbox = buildNominatimViewbox(sarasotaConfig);
assert.equal(typeof viewbox, "string", "service-area viewbox is generated for provider bias");

const googleBody = buildGoogleAutocompleteRequest("866 mol", sarasotaConfig);
assert.deepEqual(googleBody.includedRegionCodes, ["us"], "Google request restricts US companies to the US");
assert.deepEqual(googleBody.includedPrimaryTypes, ["street_address", "premise", "subpremise"], "Google request prioritizes address-like place types");
assert.equal(googleBody.locationBias?.circle.center.latitude, sarasotaConfig.latitude, "Google request uses company latitude");
assert.equal(googleBody.locationBias?.circle.center.longitude, sarasotaConfig.longitude, "Google request uses company longitude");
assert.ok((googleBody.locationBias?.circle.radius ?? 0) > 70000, "Google request uses service radius in meters");

const manualLike = rankAddressSuggestions([], "866 mol", sarasotaConfig);
assert.deepEqual(manualLike, [], "empty provider results still allow caller manual-entry fallback");

console.log("Address autocomplete tests passed.");
