export type AdjustmentMode = "fixed" | "percent";

export type PricingAdjustment = {
  mode: AdjustmentMode;
  value: number;
};

export type PricingServiceRule = {
  id: string;
  name: string;
  active: boolean;
  fixedAdjustment: number;
  includedTasks?: Record<"kitchen" | "bathrooms" | "livingAreas", string[]>;
  multiplier: number;
  minimumPrice: number;
  oneTime: boolean;
};

export type PricingExtraRule = {
  id: string;
  name: string;
  active: boolean;
  customerVisible?: boolean;
  price: number;
  laborHours: number;
};

export type PricingFrequencyRule = {
  id: string;
  label: string;
  recurrenceCode: "ONCE" | "W" | "2W" | "3W" | "4W" | "M" | "CUSTOM";
  active: boolean;
  adjustment: PricingAdjustment;
};

export type CleaningPricingRules = {
  version: string;
  currency: string;
  basePrice: number;
  includedSquareFeet: number;
  additionalSqftRate: number;
  bedroomPrice: number;
  bathroomPrice: number;
  kitchenPrice: number;
  floorPrice: number;
  basementPrice: number;
  household: {
    child: number;
    cat: number;
    smallDog: number;
    largeDog: number;
    bedLinenChange: number;
  };
  cleaningProfiles: Record<string, PricingAdjustment>;
  organizationProfiles: Record<string, PricingAdjustment>;
  services: PricingServiceRule[];
  extras: PricingExtraRule[];
  frequencies: PricingFrequencyRule[];
  travel: {
    includedMiles: number;
    pricePerMileAfterIncluded: number;
    minimumTravelCharge: number;
  };
  labor: {
    baseHours: number;
    sqftPerLaborHour: number;
    bedroomHours: number;
    bathroomHours: number;
    kitchenHours: number;
    floorHours: number;
    basementHours: number;
    childHours: number;
    catHours: number;
    smallDogHours: number;
    largeDogHours: number;
    bedLinenHours: number;
  };
  minimumPrice: number;
  rounding: 1 | 5 | 10;
};

export type CleaningPricingInput = {
  property: {
    squareFeet: number;
    bedrooms: number;
    bathrooms: number;
    kitchens: number;
    floors: number;
    basement: boolean;
    distanceMiles?: number;
  };
  household: {
    children: number;
    cats: number;
    smallDogs: number;
    largeDogs: number;
    bedLinens: number;
  };
  cleaningProfile: string;
  organizationProfile: string;
  serviceId: string;
  frequencyId: string;
  extraIds: string[];
};

export type PricingComponent = {
  key: string;
  label: string;
  amount: number;
  kind: "base" | "add" | "discount" | "multiplier" | "minimum" | "rounding";
};

export type CleaningPricingResult = {
  pricingRuleVersion: string;
  currency: string;
  recommendedPrice: number;
  rawPrice: number;
  estimatedLaborHours: number;
  confidence: "verified" | "estimated" | "needs_review";
  components: PricingComponent[];
  selectedService?: PricingServiceRule;
  selectedFrequency?: PricingFrequencyRule;
  selectedExtras: PricingExtraRule[];
};

export const defaultCleaningPricingRules: CleaningPricingRules = {
  version: "pricing-v1",
  currency: "USD",
  basePrice: 120,
  includedSquareFeet: 1000,
  additionalSqftRate: 0.07,
  bedroomPrice: 12,
  bathroomPrice: 18,
  kitchenPrice: 18,
  floorPrice: 10,
  basementPrice: 25,
  household: {
    bedLinenChange: 8,
    cat: 6,
    child: 4,
    largeDog: 12,
    smallDog: 8
  },
  cleaningProfiles: {
    veryClean: { mode: "percent", value: -5 },
    clean: { mode: "percent", value: 0 },
    normal: { mode: "percent", value: 0 },
    dirty: { mode: "percent", value: 15 },
    veryDirty: { mode: "percent", value: 30 }
  },
  organizationProfiles: {
    veryOrganized: { mode: "percent", value: -5 },
    organized: { mode: "percent", value: 0 },
    normal: { mode: "percent", value: 0 },
    disorganized: { mode: "percent", value: 10 },
    veryDisorganized: { mode: "percent", value: 25 }
  },
  services: [
    {
      active: true,
      fixedAdjustment: 0,
      id: "regular_cleaning",
      includedTasks: {
        bathrooms: ["Toilets", "Showers", "Bathtubs", "Mirrors", "Countertops", "Sinks", "Fixtures", "Floors"],
        kitchen: ["Countertops", "Sink", "Faucet", "Exterior appliances", "Stovetop", "Microwave exterior", "Cabinet exterior spot cleaning", "Floors"],
        livingAreas: ["Dusting", "Vacuuming", "Mopping", "Mirrors", "Accessible surfaces", "Make beds", "Empty trash"]
      },
      multiplier: 1,
      minimumPrice: 120,
      name: "Regular Cleaning",
      oneTime: false
    },
    { active: true, fixedAdjustment: 45, id: "deep_cleaning", multiplier: 1.25, minimumPrice: 180, name: "Deep Cleaning", oneTime: true },
    { active: true, fixedAdjustment: 65, id: "first_cleaning", multiplier: 1.35, minimumPrice: 190, name: "First Cleaning", oneTime: true },
    { active: true, fixedAdjustment: 90, id: "heavy_duty_cleaning", multiplier: 1.55, minimumPrice: 240, name: "Heavy Duty Cleaning", oneTime: true },
    { active: true, fixedAdjustment: 55, id: "move_in_cleaning", multiplier: 1.3, minimumPrice: 190, name: "Move-In Cleaning", oneTime: true },
    { active: true, fixedAdjustment: 75, id: "move_out_cleaning", multiplier: 1.45, minimumPrice: 220, name: "Move-Out Cleaning", oneTime: true },
    { active: true, fixedAdjustment: 25, id: "airbnb_turnover", multiplier: 1.1, minimumPrice: 140, name: "Airbnb / Turnover", oneTime: false },
    { active: true, fixedAdjustment: 120, id: "post_construction", multiplier: 1.75, minimumPrice: 300, name: "Post-Construction Cleaning", oneTime: true },
    { active: true, fixedAdjustment: 0, id: "custom", multiplier: 1, minimumPrice: 120, name: "Custom", oneTime: true }
  ],
  extras: [
    { active: true, customerVisible: true, id: "inside_oven", laborHours: 0.45, name: "Inside Oven", price: 40 },
    { active: true, customerVisible: true, id: "inside_refrigerator", laborHours: 0.4, name: "Inside Refrigerator", price: 35 },
    { active: true, customerVisible: true, id: "interior_windows", laborHours: 0.75, name: "Interior Windows", price: 55 },
    { active: true, customerVisible: true, id: "laundry", laborHours: 0.5, name: "Laundry", price: 30 },
    { active: true, customerVisible: true, id: "baseboards", laborHours: 0.65, name: "Baseboards", price: 45 },
    { active: true, customerVisible: true, id: "blinds", laborHours: 0.5, name: "Blinds", price: 35 },
    { active: true, customerVisible: true, id: "inside_cabinets", laborHours: 0.75, name: "Inside Cabinets", price: 55 },
    { active: true, customerVisible: true, id: "dishes", laborHours: 0.35, name: "Dishes", price: 25 },
    { active: true, customerVisible: true, id: "organization", laborHours: 1, name: "Organization", price: 70 }
  ],
  frequencies: [
    { active: true, adjustment: { mode: "percent", value: 0 }, id: "one_time", label: "One Time", recurrenceCode: "ONCE" },
    { active: true, adjustment: { mode: "percent", value: -15 }, id: "weekly", label: "Weekly", recurrenceCode: "W" },
    { active: true, adjustment: { mode: "percent", value: -10 }, id: "every_2_weeks", label: "Every 2 Weeks", recurrenceCode: "2W" },
    { active: true, adjustment: { mode: "percent", value: -6 }, id: "every_3_weeks", label: "Every 3 Weeks", recurrenceCode: "3W" },
    { active: true, adjustment: { mode: "percent", value: -3 }, id: "every_4_weeks", label: "Every 4 Weeks", recurrenceCode: "4W" },
    { active: true, adjustment: { mode: "percent", value: 0 }, id: "monthly", label: "Monthly", recurrenceCode: "M" },
    { active: true, adjustment: { mode: "percent", value: 0 }, id: "custom", label: "Custom", recurrenceCode: "CUSTOM" }
  ],
  labor: {
    baseHours: 1.25,
    basementHours: 0.35,
    bathroomHours: 0.28,
    bedroomHours: 0.18,
    bedLinenHours: 0.12,
    catHours: 0.06,
    childHours: 0.04,
    floorHours: 0.12,
    kitchenHours: 0.25,
    largeDogHours: 0.12,
    smallDogHours: 0.08,
    sqftPerLaborHour: 650
  },
  minimumPrice: 120,
  rounding: 5,
  travel: {
    includedMiles: 10,
    minimumTravelCharge: 0,
    pricePerMileAfterIncluded: 2
  }
};

export function mergePricingRules(savedRules?: Partial<CleaningPricingRules>): CleaningPricingRules {
  if (!savedRules) {
    return defaultCleaningPricingRules;
  }

  return {
    ...defaultCleaningPricingRules,
    ...savedRules,
    cleaningProfiles: { ...defaultCleaningPricingRules.cleaningProfiles, ...savedRules.cleaningProfiles },
    extras: Array.isArray(savedRules.extras) ? savedRules.extras : defaultCleaningPricingRules.extras,
    frequencies: Array.isArray(savedRules.frequencies) ? savedRules.frequencies : defaultCleaningPricingRules.frequencies,
    household: { ...defaultCleaningPricingRules.household, ...savedRules.household },
    labor: { ...defaultCleaningPricingRules.labor, ...savedRules.labor },
    organizationProfiles: { ...defaultCleaningPricingRules.organizationProfiles, ...savedRules.organizationProfiles },
    services: Array.isArray(savedRules.services) ? savedRules.services : defaultCleaningPricingRules.services,
    travel: { ...defaultCleaningPricingRules.travel, ...savedRules.travel }
  };
}

export function calculateCleaningPrice(input: CleaningPricingInput, rules: CleaningPricingRules = defaultCleaningPricingRules): CleaningPricingResult {
  const components: PricingComponent[] = [];
  const selectedService = rules.services.find((service) => service.id === input.serviceId) ?? rules.services[0];
  const selectedFrequency = rules.frequencies.find((frequency) => frequency.id === input.frequencyId) ?? rules.frequencies[0];
  const selectedExtras = rules.extras.filter((extra) => input.extraIds.includes(extra.id) && extra.active);

  addComponent(components, { amount: rules.basePrice, key: "base", kind: "base", label: "Base price" });
  const extraSquareFeet = Math.max(0, input.property.squareFeet - rules.includedSquareFeet);
  addComponent(components, { amount: extraSquareFeet * rules.additionalSqftRate, key: "squareFeet", kind: "add", label: "Property size" });
  addComponent(components, { amount: input.property.bedrooms * rules.bedroomPrice, key: "bedrooms", kind: "add", label: "Bedrooms" });
  addComponent(components, { amount: input.property.bathrooms * rules.bathroomPrice, key: "bathrooms", kind: "add", label: "Bathrooms" });
  addComponent(components, { amount: input.property.kitchens * rules.kitchenPrice, key: "kitchens", kind: "add", label: "Kitchens" });
  addComponent(components, { amount: input.property.floors * rules.floorPrice, key: "floors", kind: "add", label: "Floors" });
  addComponent(components, { amount: input.property.basement ? rules.basementPrice : 0, key: "basement", kind: "add", label: "Basement" });
  addComponent(components, { amount: input.household.children * rules.household.child, key: "children", kind: "add", label: "Children" });
  addComponent(components, { amount: input.household.cats * rules.household.cat, key: "cats", kind: "add", label: "Cats" });
  addComponent(components, { amount: input.household.smallDogs * rules.household.smallDog, key: "smallDogs", kind: "add", label: "Small dogs" });
  addComponent(components, { amount: input.household.largeDogs * rules.household.largeDog, key: "largeDogs", kind: "add", label: "Large dogs" });
  addComponent(components, { amount: input.household.bedLinens * rules.household.bedLinenChange, key: "bedLinens", kind: "add", label: "Bed linens" });

  let subtotal = sumComponents(components);
  const cleaningAdjustment = applyAdjustment(subtotal, rules.cleaningProfiles[input.cleaningProfile]);
  addComponent(components, { amount: cleaningAdjustment, key: "cleaningProfile", kind: cleaningAdjustment < 0 ? "discount" : "add", label: "Cleaning profile" });
  subtotal += cleaningAdjustment;

  const organizationAdjustment = applyAdjustment(subtotal, rules.organizationProfiles[input.organizationProfile]);
  addComponent(components, { amount: organizationAdjustment, key: "organizationProfile", kind: organizationAdjustment < 0 ? "discount" : "add", label: "Organization profile" });
  subtotal += organizationAdjustment;

  const serviceMultiplierAdjustment = selectedService ? subtotal * (selectedService.multiplier - 1) : 0;
  addComponent(components, { amount: serviceMultiplierAdjustment, key: "serviceMultiplier", kind: serviceMultiplierAdjustment < 0 ? "discount" : "multiplier", label: selectedService?.name ?? "Service type" });
  subtotal += serviceMultiplierAdjustment;
  addComponent(components, { amount: selectedService?.fixedAdjustment ?? 0, key: "serviceFixed", kind: "add", label: "Service adjustment" });

  for (const extra of selectedExtras) {
    addComponent(components, { amount: extra.price, key: `extra_${extra.id}`, kind: "add", label: extra.name });
  }

  const travelMiles = Math.max(0, (input.property.distanceMiles ?? 0) - rules.travel.includedMiles);
  const travelCharge = travelMiles > 0 ? Math.max(rules.travel.minimumTravelCharge, travelMiles * rules.travel.pricePerMileAfterIncluded) : 0;
  addComponent(components, { amount: travelCharge, key: "travel", kind: "add", label: "Travel" });

  subtotal = sumComponents(components);
  const frequencyAdjustment = applyAdjustment(subtotal, selectedFrequency?.adjustment);
  addComponent(components, { amount: frequencyAdjustment, key: "frequency", kind: frequencyAdjustment < 0 ? "discount" : "add", label: selectedFrequency?.label ?? "Frequency" });

  const rawPrice = sumComponents(components);
  const effectiveMinimum = Math.max(rules.minimumPrice, selectedService?.minimumPrice ?? 0);
  const minimumAdjustment = Math.max(0, effectiveMinimum - rawPrice);
  addComponent(components, { amount: minimumAdjustment, key: "minimum", kind: "minimum", label: "Minimum price" });

  const beforeRounding = sumComponents(components);
  const rounded = roundPrice(beforeRounding, rules.rounding);
  addComponent(components, { amount: rounded - beforeRounding, key: "rounding", kind: "rounding", label: "Rounding" });

  return {
    confidence: input.property.squareFeet > 0 && input.property.bathrooms > 0 ? "estimated" : "needs_review",
    components,
    currency: rules.currency,
    estimatedLaborHours: estimateLaborHours(input, rules, selectedExtras),
    pricingRuleVersion: rules.version,
    rawPrice,
    recommendedPrice: Math.max(0, sumComponents(components)),
    selectedExtras,
    selectedFrequency,
    selectedService
  };
}

export function buildPricingSnapshot(input: CleaningPricingInput, result: CleaningPricingResult, finalPrice: number, overrideReason: string, rules: CleaningPricingRules = defaultCleaningPricingRules) {
  const selectedExtrasTotal = result.selectedExtras.reduce((sum, extra) => sum + extra.price, 0);
  const recurringVisitPrice = Math.max(0, finalPrice - selectedExtrasTotal);

  return {
    calculatedAt: new Date().toISOString(),
    components: result.components,
    currency: result.currency,
    estimatedLaborHours: result.estimatedLaborHours,
    finalPrice,
    firstVisitPrice: finalPrice,
    input,
    overrideReason,
    pricingRuleVersion: result.pricingRuleVersion,
    recurringVisitPrice,
    rulesSnapshot: rules,
    rawPrice: result.rawPrice,
    recommendedPrice: result.recommendedPrice
  };
}

function addComponent(components: PricingComponent[], component: PricingComponent) {
  if (Math.abs(component.amount) < 0.01 && component.key !== "base") {
    return;
  }

  components.push(component);
}

function sumComponents(components: PricingComponent[]) {
  return components.reduce((total, component) => total + component.amount, 0);
}

function applyAdjustment(subtotal: number, adjustment?: PricingAdjustment) {
  if (!adjustment) {
    return 0;
  }

  return adjustment.mode === "percent" ? subtotal * (adjustment.value / 100) : adjustment.value;
}

function roundPrice(price: number, increment: number) {
  return Math.round(price / increment) * increment;
}

function estimateLaborHours(input: CleaningPricingInput, rules: CleaningPricingRules, extras: PricingExtraRule[]) {
  const labor = rules.labor;
  const squareFeetHours = input.property.squareFeet > 0 ? input.property.squareFeet / labor.sqftPerLaborHour : 0;
  const total = labor.baseHours
    + squareFeetHours
    + input.property.bedrooms * labor.bedroomHours
    + input.property.bathrooms * labor.bathroomHours
    + input.property.kitchens * labor.kitchenHours
    + input.property.floors * labor.floorHours
    + (input.property.basement ? labor.basementHours : 0)
    + input.household.children * labor.childHours
    + input.household.cats * labor.catHours
    + input.household.smallDogs * labor.smallDogHours
    + input.household.largeDogs * labor.largeDogHours
    + input.household.bedLinens * labor.bedLinenHours
    + extras.reduce((hours, extra) => hours + extra.laborHours, 0);

  return Math.round(Math.max(1.5, total) * 4) / 4;
}
