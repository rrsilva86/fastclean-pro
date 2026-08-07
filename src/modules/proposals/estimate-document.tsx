"use client";

import { Bath, BedDouble, CalendarDays, ClipboardCheck, CookingPot, Home, Mail, Phone, ShieldCheck, Sparkles, Tag, UserRound, XCircle } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
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

export type EstimateDocumentData = {
  availableExtras: PricingExtraRule[];
  company: ReturnType<typeof safeCompany>;
  estimate: EstimateRecord;
  extras: PricingExtraRule[];
  firstTotal: number;
  frequency?: PricingFrequencyRule;
  labels: EstimateDocumentLabels;
  propertyItems: string[];
  recurringTotal: number;
  rules: CleaningPricingRules;
  serviceName: string;
  tasks: Record<"kitchen" | "bathrooms" | "livingAreas", string[]>;
};

export function buildEstimateDocumentData(estimate: EstimateRecord, labels: EstimateDocumentLabels, settings?: EstimateDocumentSettings): EstimateDocumentData {
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

  return { availableExtras, company, estimate, extras, firstTotal, frequency, labels, propertyItems, recurringTotal, rules, serviceName, tasks };
}

export function EstimateDocument({ data, printable = true, showOverflowWarning = false }: { data: EstimateDocumentData; printable?: boolean; showOverflowWarning?: boolean }) {
  const [overflowPages, setOverflowPages] = useState<string[]>([]);
  const documentRef = useRef<HTMLDivElement>(null);
  const accentStyle = { "--estimate-accent": data.company.accentColor } as CSSProperties;

  useEffect(() => {
    if (!showOverflowWarning) {
      return;
    }

    const measure = () => {
      const pages = Array.from(documentRef.current?.querySelectorAll<HTMLElement>(".estimate-page") ?? []);
      setOverflowPages(pages.filter((page) => page.scrollHeight > page.clientHeight + 2).map((page) => page.dataset.estimatePage ?? "?"));
    };

    measure();
    const observer = new ResizeObserver(measure);
    const pages = Array.from(documentRef.current?.querySelectorAll<HTMLElement>(".estimate-page") ?? []);
    pages.forEach((page) => observer.observe(page));
    return () => observer.disconnect();
  }, [showOverflowWarning]);

  return (
    <div className={`estimate-document ${printable ? "estimate-document-printable" : "estimate-document-preview-only"} mx-auto grid w-[8.5in] max-w-none gap-6 text-[#0f2540]`} ref={documentRef} style={accentStyle}>
      <EstimatePrintStyles />
      <EstimatePage1 {...data} />
      <EstimatePage2 {...data} />
      {showOverflowWarning && overflowPages.length > 0 ? (
        <div className="estimate-overflow-warning print:hidden">
          Estimate content exceeds the supported two-page layout. Review page {overflowPages.join(", ")} content before sending.
        </div>
      ) : null}
    </div>
  );
}

function EstimatePage1({ availableExtras, company, estimate, extras, firstTotal, frequency, labels, propertyItems, recurringTotal, rules, serviceName }: EstimateDocumentData) {
  return (
    <section className="estimate-page estimate-page-1" data-estimate-page="1">
      <DocumentHeader company={company} estimate={estimate} labels={labels} />
      <div className="document-card-grid grid grid-cols-3 gap-3">
        <DocumentCard icon={<UserRound />} title={labels.customer}>
          <p className="line-clamp-2 font-bold">{estimate.customerName}</p>
          {addressLines(estimate.serviceAddress).map((line) => <p className="line-clamp-2" key={line}>{line}</p>)}
        </DocumentCard>
        <DocumentCard icon={<Home />} title={labels.propertyDetails}>
          <ul className="list-disc space-y-1 pl-4">{propertyItems.slice(0, 6).map((item) => <li key={item}>{item}</li>)}</ul>
        </DocumentCard>
        <DocumentCard icon={<ClipboardCheck />} title={labels.selectedServiceSummary}>
          <DocumentFact label={labels.docSelectedCleaning} value={serviceName} />
          <DocumentFact label={labels.docSelectedFrequency} value={frequency?.label || estimate.frequency} />
          <DocumentFact label={labels.docEstimatedDuration} value={estimate.estimatedLaborHours ? `${estimate.estimatedLaborHours} ${labels.docHours}` : ""} />
        </DocumentCard>
      </div>
      <div className="document-plan-grid grid grid-cols-[1.25fr_0.85fr] gap-3">
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
          {extras.length > 0 ? extras.slice(0, 5).map((extra) => <PriceLine key={extra.id} label={extra.name} value={extra.price} />) : <p className="muted">{labels.docNoAddons}</p>}
        </section>
      </div>
      <section className="document-panel document-optional-addons">
        <h3>{labels.docOptionalAddons}</h3>
        <div className="grid grid-cols-2 gap-x-4">
          {availableExtras.slice(0, 10).map((extra) => <PriceLine key={extra.id} icon={<Sparkles />} label={extra.name} value={extra.price} />)}
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
  );
}

function EstimatePage2({ availableExtras, company, estimate, extras, firstTotal, frequency, labels, recurringTotal, serviceName, tasks }: EstimateDocumentData) {
  return (
    <section className="estimate-page estimate-page-2" data-estimate-page="2">
      <header className="document-page-two-header">
        <CompanyBrand company={company} compact />
        <h2>{labels.docWhatsIncluded}</h2>
      </header>
      <section className="document-panel">
        <h3 className="centered-title">{labels.docStandardCleaningIncludes}</h3>
        <div className="document-task-grid grid grid-cols-3 gap-3">
          <TaskCard icon={<CookingPot />} title={labels.docKitchen} tasks={tasks.kitchen.slice(0, 8)} />
          <TaskCard icon={<Bath />} title={labels.docBathroomsTitle} tasks={tasks.bathrooms.slice(0, 8)} />
          <TaskCard icon={<BedDouble />} title={labels.docBedroomsLiving} tasks={tasks.livingAreas.slice(0, 8)} />
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
          {extras.slice(0, 5).map((extra) => <PriceLine key={extra.id} label={extra.name} value={extra.price} />)}
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
      .estimate-document { box-sizing: border-box; flex-shrink: 0; font-family: Inter, Arial, Helvetica, sans-serif; }
      .estimate-document *, .estimate-document *::before, .estimate-document *::after { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .estimate-document { justify-items: center; width: 8.5in; max-width: none; }
      .estimate-page { box-sizing: border-box; display: flex; flex-shrink: 0; flex-direction: column; gap: 0.12in; width: 8.5in; height: 11in; padding: 0.34in; background: white; box-shadow: 0 12px 38px rgba(15, 23, 42, 0.14); break-after: page; page-break-after: always; overflow: hidden; }
      .estimate-page-2 { break-before: page; page-break-before: always; }
      .estimate-page:last-child { break-after: auto; page-break-after: auto; }
      .document-header, .document-card, .document-panel, .document-total, .document-page-two-header, .document-exclusions, .document-estimate-summary, .document-footer, .task-card { break-inside: avoid; page-break-inside: avoid; }
      .document-header { display: grid; grid-template-columns: 1fr 2.42in; gap: 0.22in; border-bottom: 1px solid #cbd5e1; padding-bottom: 0.13in; }
      .document-info h1, .document-page-two-header h2 { font-family: Georgia, "Times New Roman", serif; font-size: 29px; font-weight: 900; text-transform: uppercase; color: #10233f; }
      .document-info { border: 1px solid #cbd5e1; border-radius: 8px; padding: 0.1in; align-self: start; }
      .document-fact { display: grid; grid-template-columns: auto 1fr auto; gap: 7px; align-items: center; border-bottom: 1px solid #e2e8f0; padding: 5px 0; font-size: 11px; }
      .document-fact:last-child { border-bottom: 0; }
      .document-fact svg, .document-card svg, .document-estimate-summary svg { color: var(--estimate-accent); width: 18px; height: 18px; }
      .document-card, .document-panel { border: 1px solid #d5dee8; border-radius: 7px; background: linear-gradient(145deg, #fff, #f8fafc); padding: 0.105in; font-size: 11px; line-height: 1.35; }
      .document-card-grid { min-height: 1.12in; }
      .document-plan-grid { min-height: 1.68in; }
      .document-card h3, .document-panel h3, .document-estimate-summary h3 { display: flex; align-items: center; gap: 7px; margin: 0 0 7px; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #10233f; }
      .document-card h3 span { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 999px; background: color-mix(in srgb, var(--estimate-accent) 12%, white); }
      .document-table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
      .document-table th, .document-table td { border: 1px solid #dbe4ee; padding: 5px 7px; }
      .document-table th { background: #f1f5f9; font-size: 10px; text-transform: uppercase; }
      .selected-row td { background: color-mix(in srgb, var(--estimate-accent) 14%, white); color: #0f5f63; font-weight: 900; }
      .selected-row span { display: block; font-size: 8.5px; text-transform: uppercase; color: #0f766e; }
      .price-line { display: flex; align-items: center; justify-content: space-between; gap: 10px; border-bottom: 1px solid #e2e8f0; padding: 5px 0; font-size: 11px; }
      .price-line span { display: inline-flex; align-items: center; gap: 7px; }
      .price-line:last-child { border-bottom: 0; }
      .muted { color: #64748b; font-weight: 700; }
      .document-optional-addons { flex: 1; min-height: 1.7in; }
      .document-total { display: grid; grid-template-columns: 1fr 2.55in; gap: 0.18in; margin-top: auto; border: 1px solid var(--estimate-accent); border-radius: 8px; padding: 0.13in; background: linear-gradient(135deg, color-mix(in srgb, var(--estimate-accent) 8%, white), #fff); }
      .document-grand-total, .document-summary-total { text-align: center; color: #10233f; }
      .document-terms { display: -webkit-box; margin-top: 6px; overflow: hidden; color: #64748b; font-size: 9px; font-weight: 700; line-height: 1.3; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
      .document-grand-total span, .document-summary-total span, .document-summary-total em { display: block; font-size: 11px; font-weight: 900; text-transform: uppercase; font-style: normal; }
      .document-grand-total strong, .document-summary-total strong { display: block; margin-top: 6px; font-family: Georgia, "Times New Roman", serif; font-size: 38px; color: var(--estimate-accent); }
      .document-summary-total b { display: block; margin-top: 4px; font-size: 22px; color: var(--estimate-accent); }
      .document-page-two-header { display: grid; grid-template-columns: 1fr 3.55in; align-items: start; gap: 0.22in; border-bottom: 1px solid #cbd5e1; padding-bottom: 0.13in; }
      .centered-title { justify-content: center; }
      .task-card { border: 1px solid #dbe4ee; border-radius: 7px; padding: 0.1in; background: #fbfdff; min-height: 2.18in; font-size: 10.5px; }
      .task-card > span { display: grid; place-items: center; width: 0.5in; height: 0.5in; margin: 0 auto 7px; border: 1px solid var(--estimate-accent); border-radius: 999px; color: var(--estimate-accent); }
      .task-card h4 { margin: 0 0 7px; text-align: center; color: #10233f; font-weight: 900; }
      .task-card ul { margin: 0; padding-left: 16px; line-height: 1.42; }
      .document-exclusions { border: 1px solid #f3b8b8; border-radius: 7px; background: #fff7f5; padding: 0.1in; }
      .document-exclusions h3 { display: flex; justify-content: center; gap: 7px; margin-bottom: 7px; color: #7f1d1d; font-size: 11px; font-weight: 900; text-transform: uppercase; }
      .mini-extra { display: grid; place-items: center; gap: 4px; min-height: 0.52in; border-right: 1px solid #f2c9c3; color: #9f2d25; text-align: center; font-size: 8.8px; font-weight: 800; line-height: 1.15; }
      .document-estimate-summary { display: grid; grid-template-columns: 1fr 2.45in; gap: 0.16in; border: 1px solid var(--estimate-accent); border-radius: 8px; padding: 0.13in; }
      .document-footer { display: grid; grid-template-columns: 1fr 1fr; gap: 0.18in; margin-top: auto; background: #eef6f8; padding: 0.12in; color: #37536c; font-size: 10.5px; font-weight: 700; }
      .document-footer p { display: flex; align-items: center; gap: 10px; margin: 0; }
      .line-clamp-2 { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
      .estimate-overflow-warning { width: 8.5in; border: 1px solid #f59e0b; border-radius: 8px; background: #fffbeb; color: #92400e; padding: 12px 14px; font-size: 12px; font-weight: 900; }
      @media print {
        @page { size: Letter portrait; margin: 0; }
        html, body { width: 8.5in !important; min-width: 8.5in !important; margin: 0 !important; padding: 0 !important; background: white !important; overflow: visible !important; }
        body * { visibility: hidden !important; }
        .estimate-document-preview-only { display: none !important; }
        .estimate-print-root, .estimate-print-root *, .estimate-document-printable, .estimate-document-printable * { visibility: visible !important; }
        .estimate-print-root { display: grid !important; justify-content: center !important; position: absolute !important; inset: 0 auto auto 0 !important; width: 8.5in !important; height: auto !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; background: white !important; transform: none !important; contain: none !important; }
        .estimate-document-printable { display: block !important; width: 8.5in !important; max-width: none !important; margin: 0 !important; gap: 0 !important; transform: none !important; overflow: visible !important; }
        .estimate-page { width: 8.5in !important; height: 11in !important; min-height: 11in !important; max-height: 11in !important; margin: 0 !important; box-shadow: none !important; overflow: hidden !important; break-after: page !important; page-break-after: always !important; }
        .estimate-page-1 { break-after: page !important; page-break-after: always !important; }
        .estimate-page-2 { break-before: page !important; page-break-before: always !important; break-after: auto !important; page-break-after: auto !important; }
        .estimate-page:last-child { break-after: auto !important; page-break-after: auto !important; }
      }
      @media screen and (max-width: 860px) {
        .estimate-document { max-width: 100%; }
        .estimate-page { width: 8.5in; height: 11in; padding: 0.34in; }
      }
    `}</style>
  );
}
