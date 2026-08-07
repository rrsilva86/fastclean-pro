"use client";

import { Bath, BedDouble, CalendarDays, ClipboardCheck, CookingPot, Home, Mail, Phone, ShieldCheck, Sparkles, Tag, UserRound, XCircle } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { appBranding } from "@/config/branding";
import { formatVisibleAddress } from "@/lib/address/address-autocomplete";
import { defaultCleaningPricingRules, type CleaningPricingRules, type PricingExtraRule, type PricingFrequencyRule } from "@/lib/pricing/cleaning-pricing";
import type { EstimateRecord } from "@/modules/proposals/proposals-manager";

type EstimateDocumentLabels = Record<string, string>;

export type EstimateDocumentSettings = {
  accentColor?: string;
  companyDisplayName?: string;
  companyEmail?: string;
  companyLocation?: string;
  companyPhone?: string;
  companyWebsite?: string;
  defaultValidityDays?: number;
  estimateTerms?: string;
  footerMessage?: string;
  logoUrl?: string;
  tagline?: string;
};

const fallbackAccent = "#0F8B8D";
const currency = new Intl.NumberFormat("en-US", { currency: "USD", style: "currency" });

function money(value: number) {
  return currency.format(Number.isFinite(value) ? value : 0);
}

function subtotal(estimate: EstimateRecord) {
  return estimate.lineItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.rate || 0), 0);
}

function estimateTotal(estimate: EstimateRecord) {
  return Math.max(0, subtotal(estimate) - Number(estimate.discount || 0) + Number(estimate.tax || 0) + Number(estimate.additionalCharges || 0));
}

function snapshot(estimate: EstimateRecord) {
  return (estimate.pricingSnapshot ?? {}) as Record<string, unknown>;
}

function rulesSnapshot(estimate: EstimateRecord): CleaningPricingRules {
  const candidate = snapshot(estimate).rulesSnapshot;
  if (candidate && typeof candidate === "object") {
    return { ...defaultCleaningPricingRules, ...(candidate as Partial<CleaningPricingRules>) };
  }
  return defaultCleaningPricingRules;
}

function pricingInput(estimate: EstimateRecord) {
  const input = snapshot(estimate).input;
  return input && typeof input === "object" ? input as { property?: Record<string, unknown>; household?: Record<string, unknown>; serviceId?: string; frequencyId?: string; extraIds?: string[] } : {};
}

function selectedFrequency(estimate: EstimateRecord, rules: CleaningPricingRules) {
  const input = pricingInput(estimate);
  return rules.frequencies.find((frequency) => frequency.id === input.frequencyId) ?? rules.frequencies.find((frequency) => frequency.label === estimate.frequency);
}

function selectedServiceName(estimate: EstimateRecord, rules: CleaningPricingRules) {
  const input = pricingInput(estimate);
  return rules.services.find((service) => service.id === input.serviceId)?.name || estimate.serviceName;
}

function selectedExtras(estimate: EstimateRecord, rules: CleaningPricingRules) {
  const input = pricingInput(estimate);
  const ids = new Set(input.extraIds ?? []);
  const lineNames = new Set(estimate.lineItems.filter((item) => item.type === "extra").map((item) => item.description));
  return rules.extras.filter((extra) => ids.has(extra.id) || lineNames.has(extra.name));
}

function optionalExtras(estimate: EstimateRecord, rules: CleaningPricingRules) {
  const selected = new Set(selectedExtras(estimate, rules).map((extra) => extra.id));
  return rules.extras.filter((extra) => extra.active && extra.customerVisible !== false && !selected.has(extra.id)).slice(0, 10);
}

function planOptions(estimate: EstimateRecord, rules: CleaningPricingRules) {
  const selected = selectedFrequency(estimate, rules);
  const base = recurringPrice(estimate);
  return rules.frequencies
    .filter((frequency) => frequency.active && frequency.id !== "custom")
    .slice(0, 6)
    .map((frequency) => ({
      frequency,
      price: estimatePlanPrice(base, frequency, selected),
      selected: selected?.id === frequency.id || estimate.frequency === frequency.label
    }));
}

function estimatePlanPrice(base: number, frequency: PricingFrequencyRule, selected?: PricingFrequencyRule) {
  if (!selected || selected.adjustment.value === frequency.adjustment.value) {
    return base;
  }
  const selectedFactor = selected.adjustment.mode === "percent" ? 1 + selected.adjustment.value / 100 : 1;
  const frequencyFactor = frequency.adjustment.mode === "percent" ? 1 + frequency.adjustment.value / 100 : 1;
  return Math.max(0, Math.round((base / Math.max(0.01, selectedFactor)) * frequencyFactor));
}

function firstVisitPrice(estimate: EstimateRecord) {
  if (estimate.firstVisitPrice !== undefined) {
    return Number(estimate.firstVisitPrice);
  }

  return estimateTotal(estimate);
}

function recurringPrice(estimate: EstimateRecord) {
  if (estimate.recurringVisitPrice !== undefined) {
    return Number(estimate.recurringVisitPrice);
  }

  const recurringFromSnapshot = snapshot(estimate).recurringVisitPrice;
  if (typeof recurringFromSnapshot === "number") {
    return recurringFromSnapshot;
  }

  const extrasTotal = selectedExtras(estimate, rulesSnapshot(estimate)).reduce((sum, extra) => sum + extra.price, 0);
  return Math.max(0, Number(estimate.finalPrice || estimate.recommendedPrice || estimateTotal(estimate)) - extrasTotal);
}

function propertyDetails(estimate: EstimateRecord, labels: EstimateDocumentLabels) {
  const input = pricingInput(estimate);
  const property = input.property ?? {};
  const household = input.household ?? {};
  return [
    property.bedrooms ? `${property.bedrooms} ${labels.docBedrooms}` : "",
    property.bathrooms ? `${property.bathrooms} ${labels.docBathrooms}` : "",
    property.squareFeet ? `${labels.docApprox} ${Number(property.squareFeet).toLocaleString("en-US")} sq ft` : "",
    property.floors ? `${property.floors} ${labels.docFloors}` : "",
    property.basement ? labels.docBasement : "",
    Number(household.cats || 0) + Number(household.smallDogs || 0) + Number(household.largeDogs || 0) > 0 ? labels.docPets : labels.docNoPets
  ].filter(Boolean);
}

function serviceTasks(estimate: EstimateRecord, rules: CleaningPricingRules) {
  const input = pricingInput(estimate);
  const service = rules.services.find((item) => item.id === input.serviceId) ?? rules.services[0];
  return service.includedTasks ?? defaultCleaningPricingRules.services[0].includedTasks ?? { bathrooms: [], kitchen: [], livingAreas: [] };
}

function addressLines(address: string) {
  const parts = formatVisibleAddress(address).split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 1) {
    return [address].filter(Boolean);
  }
  return [parts[0], parts.slice(1).join(", ")];
}

function safeCompany(settings?: EstimateDocumentSettings) {
  return {
    accentColor: settings?.accentColor || fallbackAccent,
    companyDisplayName: settings?.companyDisplayName || "FastClean Pro",
    companyEmail: settings?.companyEmail || "",
    companyLocation: settings?.companyLocation || "",
    companyPhone: settings?.companyPhone || "",
    companyWebsite: settings?.companyWebsite || "",
    estimateTerms: settings?.estimateTerms || "",
    footerMessage: settings?.footerMessage || "",
    logoUrl: settings?.logoUrl || "",
    tagline: settings?.tagline || "Professional Residential Cleaning"
  };
}

function formatDate(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function slug(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
}

export function estimatePdfFileName(estimate: EstimateRecord) {
  return `Estimate_${slug(estimate.number)}_${slug(estimate.customerName || "Customer")}.pdf`;
}

export function EstimateDocument({ estimate, labels, settings }: { estimate: EstimateRecord; labels: EstimateDocumentLabels; settings?: EstimateDocumentSettings }) {
  const company = safeCompany(settings);
  const rules = rulesSnapshot(estimate);
  const frequency = selectedFrequency(estimate, rules);
  const serviceName = selectedServiceName(estimate, rules);
  const extras = selectedExtras(estimate, rules);
  const availableExtras = optionalExtras(estimate, rules);
  const tasks = serviceTasks(estimate, rules);
  const propertyItems = propertyDetails(estimate, labels);
  const firstTotal = firstVisitPrice(estimate);
  const recurringTotal = recurringPrice(estimate);
  const accentStyle = { "--estimate-accent": company.accentColor } as CSSProperties;

  return (
    <div className="estimate-document mx-auto grid max-w-[8.5in] gap-6 text-[#0f2540]" style={accentStyle}>
      <EstimatePrintStyles />
      <section className="estimate-page">
        <DocumentHeader company={company} estimate={estimate} labels={labels} />
        <div className="grid grid-cols-3 gap-3">
          <DocumentCard icon={<UserRound />} title={labels.customer}>
            <p className="font-bold">{estimate.customerName}</p>
            {addressLines(estimate.serviceAddress).map((line) => <p key={line}>{line}</p>)}
          </DocumentCard>
          <DocumentCard icon={<Home />} title={labels.propertyDetails}>
            <ul className="list-disc space-y-1 pl-4">{propertyItems.map((item) => <li key={item}>{item}</li>)}</ul>
          </DocumentCard>
          <DocumentCard icon={<ClipboardCheck />} title={labels.selectedServiceSummary}>
            <DocumentFact label={labels.docSelectedCleaning} value={serviceName} />
            <DocumentFact label={labels.docSelectedFrequency} value={frequency?.label || estimate.frequency} />
            <DocumentFact label={labels.docEstimatedDuration} value={estimate.estimatedLaborHours ? `${estimate.estimatedLaborHours} ${labels.docHours}` : ""} />
          </DocumentCard>
        </div>
        <div className="mt-3 grid grid-cols-[1.25fr_0.85fr] gap-3">
          <section className="document-panel">
            <h3>{labels.docCleaningPlanOptions}</h3>
            <table className="document-table">
              <thead><tr><th>{labels.docPlanOptions}</th><th>{labels.price}</th></tr></thead>
              <tbody>
                {planOptions(estimate, rules).map(({ frequency: option, price, selected }) => (
                  <tr className={selected ? "selected-row" : ""} key={option.id}>
                    <td>{selected ? "★ " : ""}{option.label}{selected ? <span>{labels.docRecommendedSelected}</span> : null}</td>
                    <td>{money(price)} {option.recurrenceCode === "ONCE" ? "" : labels.docPerVisit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="document-panel">
            <h3>{labels.docSelectedAddons}</h3>
            {extras.length > 0 ? extras.map((extra) => <PriceLine key={extra.id} label={extra.name} value={extra.price} />) : <p className="muted">{labels.docNoAddons}</p>}
          </section>
        </div>
        <section className="document-panel mt-3">
          <h3>{labels.docOptionalAddons}</h3>
          <div className="grid grid-cols-2 gap-x-4">
            {availableExtras.map((extra) => <PriceLine key={extra.id} icon={<Sparkles />} label={extra.name} value={extra.price} />)}
          </div>
        </section>
        <section className="document-total">
          <div>
            <PriceLine label={labels.docInitialCleaning} value={firstTotal} />
            <PriceLine label={`${labels.docRecurringCleaning} ${frequency?.label || estimate.frequency}`} suffix={labels.docPerVisit} value={recurringTotal} />
            <p className="document-terms">{estimate.terms || company.estimateTerms}</p>
          </div>
          <div className="document-grand-total">
            <span>{labels.docTotalFirstVisit}</span>
            <strong>{money(firstTotal)}</strong>
          </div>
        </section>
      </section>

      <section className="estimate-page page-two">
        <header className="document-page-two-header">
          <CompanyBrand company={company} compact />
          <h2>{labels.docWhatsIncluded}</h2>
        </header>
        <section className="document-panel">
          <h3 className="centered-title">{labels.docStandardCleaningIncludes}</h3>
          <div className="grid grid-cols-3 gap-3">
            <TaskCard icon={<CookingPot />} title={labels.docKitchen} tasks={tasks.kitchen} />
            <TaskCard icon={<Bath />} title={labels.docBathroomsTitle} tasks={tasks.bathrooms} />
            <TaskCard icon={<BedDouble />} title={labels.docBedroomsLiving} tasks={tasks.livingAreas} />
          </div>
        </section>
        <section className="document-exclusions">
          <h3><XCircle className="h-4 w-4" />{labels.docServicesNotIncluded}</h3>
          <div className="grid grid-cols-5 gap-2">
            {availableExtras.slice(0, 10).map((extra) => <MiniExtra key={extra.id} extra={extra} />)}
          </div>
        </section>
        <section className="document-estimate-summary">
          <div>
            <h3><ClipboardCheck className="h-4 w-4" />{labels.docYourEstimate}</h3>
            <PriceLine label={labels.docSelectedCleaning} textValue={serviceName} />
            <PriceLine label={labels.frequency} textValue={frequency?.label || estimate.frequency} />
            <PriceLine label={labels.docBasePrice} value={recurringTotal} />
            {extras.map((extra) => <PriceLine key={extra.id} label={extra.name} value={extra.price} />)}
          </div>
          <div className="document-summary-total">
            <span>{labels.docTotalFirstVisit}</span>
            <strong>{money(firstTotal)}</strong>
            <em>{labels.docRecurringCleaning}</em>
            <b>{money(recurringTotal)} {labels.docPerVisit}</b>
          </div>
        </section>
        <footer className="document-footer">
          <p><ShieldCheck className="h-5 w-5" />{company.footerMessage || labels.docFooterThanks}</p>
          <p>{labels.docFooterTrust}</p>
        </footer>
      </section>
    </div>
  );
}

function CompanyBrand({ compact = false, company }: { compact?: boolean; company: ReturnType<typeof safeCompany> }) {
  const logoSource = company.logoUrl || appBranding.logoPath;

  return (
    <div className="flex items-start gap-3">
      <div className={`${compact ? "h-14 w-14" : "h-20 w-20"} grid shrink-0 place-items-center rounded-full text-white`} style={{ backgroundColor: company.accentColor }}>
        <img alt="" className="h-full w-full rounded-full object-cover" src={logoSource} />
      </div>
      <div>
        <p className={`${compact ? "text-2xl" : "text-3xl"} font-black leading-none`}>{company.companyDisplayName}</p>
        <p className="mt-1 text-lg font-semibold text-[color:var(--estimate-accent)]">{company.tagline}</p>
        {company.companyLocation ? <p className="mt-1 text-sm">{company.companyLocation}</p> : null}
        <div className="mt-3 space-y-1 text-sm">
          {company.companyPhone ? <p><Phone className="mr-2 inline h-4 w-4" />{company.companyPhone}</p> : null}
          {company.companyEmail ? <p><Mail className="mr-2 inline h-4 w-4" />{company.companyEmail}</p> : null}
        </div>
      </div>
    </div>
  );
}

function DocumentHeader({ company, estimate, labels }: { company: ReturnType<typeof safeCompany>; estimate: EstimateRecord; labels: EstimateDocumentLabels }) {
  return (
    <header className="document-header">
      <CompanyBrand company={company} />
      <div className="document-info">
        <h1>{labels.estimate}</h1>
        <DocumentFact icon={<ClipboardCheck />} label={labels.estimateNumber} value={estimate.number} />
        <DocumentFact icon={<CalendarDays />} label={labels.date} value={formatDate(estimate.estimateDate)} />
        <DocumentFact icon={<CalendarDays />} label={labels.expiration} value={formatDate(estimate.expirationDate)} />
      </div>
    </header>
  );
}

function DocumentCard({ children, icon, title }: { children: ReactNode; icon: ReactNode; title: string }) {
  return <section className="document-card"><h3><span>{icon}</span>{title}</h3><div>{children}</div></section>;
}

function DocumentFact({ icon, label, value }: { icon?: ReactNode; label: string; value?: string }) {
  if (!value) return null;
  return <div className="document-fact">{icon ? <span>{icon}</span> : null}<b>{label}</b><span>{value}</span></div>;
}

function PriceLine({ icon, label, suffix, textValue, value }: { icon?: ReactNode; label: string; suffix?: string; textValue?: string; value?: number }) {
  return <div className="price-line"><span>{icon}{label}</span><strong>{textValue ?? `${money(value ?? 0)}${suffix ? ` ${suffix}` : ""}`}</strong></div>;
}

function TaskCard({ icon, tasks, title }: { icon: ReactNode; tasks: string[]; title: string }) {
  return <div className="task-card"><span>{icon}</span><h4>{title}</h4><ul>{tasks.map((task) => <li key={task}>{task}</li>)}</ul></div>;
}

function MiniExtra({ extra }: { extra: PricingExtraRule }) {
  return <div className="mini-extra"><Tag className="h-5 w-5" /><span>{extra.name}</span></div>;
}

function EstimatePrintStyles() {
  return (
    <style>{`
      .estimate-document { font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
      .estimate-page { width: 8.5in; min-height: 11in; padding: 0.32in; background: white; box-shadow: 0 12px 38px rgba(15, 23, 42, 0.14); page-break-after: always; overflow: hidden; }
      .estimate-page:last-child { page-break-after: auto; }
      .document-header { display: grid; grid-template-columns: 1fr 2.6in; gap: 0.25in; border-bottom: 1px solid #cbd5e1; padding-bottom: 0.18in; }
      .document-info h1, .document-page-two-header h2 { font-family: Georgia, serif; font-size: 31px; font-weight: 900; text-transform: uppercase; color: #10233f; }
      .document-info { border: 1px solid #cbd5e1; border-radius: 8px; padding: 0.12in; align-self: start; }
      .document-fact { display: grid; grid-template-columns: auto 1fr auto; gap: 8px; align-items: center; border-bottom: 1px solid #e2e8f0; padding: 7px 0; font-size: 12px; }
      .document-fact:last-child { border-bottom: 0; }
      .document-fact svg, .document-card svg, .document-estimate-summary svg { color: var(--estimate-accent); width: 18px; height: 18px; }
      .document-card, .document-panel { border: 1px solid #d5dee8; border-radius: 7px; background: linear-gradient(145deg, #fff, #f8fafc); padding: 0.13in; font-size: 12px; }
      .document-card h3, .document-panel h3, .document-estimate-summary h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 10px; font-size: 13px; font-weight: 900; text-transform: uppercase; color: #10233f; }
      .document-card h3 span { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 999px; background: color-mix(in srgb, var(--estimate-accent) 12%, white); }
      .document-table { width: 100%; border-collapse: collapse; font-size: 12px; }
      .document-table th, .document-table td { border: 1px solid #dbe4ee; padding: 7px 9px; }
      .document-table th { background: #f1f5f9; font-size: 11px; text-transform: uppercase; }
      .selected-row td { background: color-mix(in srgb, var(--estimate-accent) 14%, white); color: #0f5f63; font-weight: 900; }
      .selected-row span { display: block; font-size: 10px; text-transform: uppercase; color: #0f766e; }
      .price-line { display: flex; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid #e2e8f0; padding: 7px 0; font-size: 12px; }
      .price-line span { display: inline-flex; align-items: center; gap: 7px; }
      .price-line:last-child { border-bottom: 0; }
      .muted { color: #64748b; font-weight: 700; }
      .document-total { display: grid; grid-template-columns: 1fr 2.7in; gap: 0.2in; margin-top: 0.12in; border: 1px solid var(--estimate-accent); border-radius: 8px; padding: 0.16in; background: linear-gradient(135deg, color-mix(in srgb, var(--estimate-accent) 8%, white), #fff); }
      .document-grand-total, .document-summary-total { text-align: center; color: #10233f; }
      .document-terms { margin-top: 8px; color: #64748b; font-size: 10px; font-weight: 700; line-height: 1.35; }
      .document-grand-total span, .document-summary-total span, .document-summary-total em { display: block; font-size: 13px; font-weight: 900; text-transform: uppercase; font-style: normal; }
      .document-grand-total strong, .document-summary-total strong { display: block; margin-top: 8px; font-family: Georgia, serif; font-size: 44px; color: var(--estimate-accent); }
      .document-summary-total b { display: block; margin-top: 4px; font-size: 25px; color: var(--estimate-accent); }
      .page-two { page-break-before: always; }
      .document-page-two-header { display: grid; grid-template-columns: 1fr 3.7in; align-items: start; gap: 0.25in; border-bottom: 1px solid #cbd5e1; padding-bottom: 0.18in; }
      .centered-title { justify-content: center; }
      .task-card { border: 1px solid #dbe4ee; border-radius: 7px; padding: 0.12in; background: #fbfdff; min-height: 2.35in; font-size: 12px; }
      .task-card > span { display: grid; place-items: center; width: 0.58in; height: 0.58in; margin: 0 auto 8px; border: 1px solid var(--estimate-accent); border-radius: 999px; color: var(--estimate-accent); }
      .task-card h4 { margin: 0 0 8px; text-align: center; color: #10233f; font-weight: 900; }
      .task-card ul { margin: 0; padding-left: 18px; line-height: 1.55; }
      .document-exclusions { margin-top: 0.18in; border: 1px solid #f3b8b8; border-radius: 7px; background: #fff7f5; padding: 0.12in; }
      .document-exclusions h3 { display: flex; justify-content: center; gap: 8px; color: #7f1d1d; font-size: 13px; font-weight: 900; text-transform: uppercase; }
      .mini-extra { display: grid; place-items: center; gap: 5px; min-height: 0.62in; border-right: 1px solid #f2c9c3; color: #9f2d25; text-align: center; font-size: 10px; font-weight: 800; }
      .document-estimate-summary { display: grid; grid-template-columns: 1fr 2.55in; gap: 0.18in; margin-top: 0.18in; border: 1px solid var(--estimate-accent); border-radius: 8px; padding: 0.16in; }
      .document-footer { display: grid; grid-template-columns: 1fr 1fr; gap: 0.2in; margin-top: 0.18in; background: #eef6f8; padding: 0.14in; color: #37536c; font-size: 12px; font-weight: 700; }
      .document-footer p { display: flex; align-items: center; gap: 10px; margin: 0; }
      @media print {
        @page { size: Letter portrait; margin: 0; }
        body { background: white !important; }
        body * { visibility: hidden !important; }
        .estimate-document, .estimate-document * { visibility: visible !important; }
        .estimate-document { position: absolute; left: 0; top: 0; }
        .estimate-document { display: block; max-width: none; }
        .estimate-page { width: 8.5in; height: 11in; min-height: 11in; box-shadow: none; margin: 0; page-break-after: always; break-after: page; }
        .estimate-page:last-child { page-break-after: auto; break-after: auto; }
      }
      @media (max-width: 860px) {
        .estimate-document { max-width: 100%; }
        .estimate-page { width: 100%; min-height: auto; padding: 18px; }
        .estimate-page .grid { grid-template-columns: 1fr !important; }
        .document-header, .document-page-two-header, .document-total, .document-estimate-summary, .document-footer { grid-template-columns: 1fr !important; }
      }
    `}</style>
  );
}
