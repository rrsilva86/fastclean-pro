"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Calculator,
  CreditCard,
  LockKeyhole,
  Mail,
  Menu,
  MessageSquareText,
  PlugZap,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
  Zap
} from "lucide-react";
import { Button, Card, CardContent, CardHeader, Input } from "@/components/design-system";
import { appUserAccounts, changeUserEmail, changeUserPassword } from "@/lib/auth/app-users";
import { normalizeAuditEvent } from "@/lib/audit/audit-events";
import { buildScopedStorageKey, syncRemoteRecords, writeLocalRecords } from "@/lib/storage/local-records";
import { defaultAppointmentMessageTemplates, type AppointmentMessageTemplates } from "@/lib/highlevel/message-templates";
import { BackupAuditPanel, type BackupAuditLabels } from "@/modules/settings/backup-audit-panel";
import { defaultCleaningPricingRules, mergePricingRules, type CleaningPricingRules } from "@/lib/pricing/cleaning-pricing";
import type { EstimateDocumentSettings } from "@/modules/proposals/estimate-document";

type SystemSettings = {
  defaultJoinedDateToday: boolean;
  defaultSmsOptIn: boolean;
  defaultEmailOptIn: boolean;
  appointmentSmsEnabled: boolean;
  appointmentEmailEnabled: boolean;
  arrivalSmsEnabled: boolean;
  departureSmsEnabled: boolean;
  invoiceEmailEnabled: boolean;
  appointmentMessageTemplates: AppointmentMessageTemplates;
  documentSettings: EstimateDocumentSettings;
  pricingRules: CleaningPricingRules;
};

type SettingsSection = "whatsNew" | "account" | "security" | "company" | "pricing" | "billing" | "automations" | "integrations" | "messages" | "backupAudit";

export type SystemSettingsLabels = {
  title: string;
  subtitle: string;
  navigationTitle: string;
  mobileNavigation: string;
  closeNavigation: string;
  whatsNew: string;
  account: string;
  security: string;
  myCompany: string;
  pricing: string;
  plansBilling: string;
  automations: string;
  integrations: string;
  messages: string;
  backupAudit: string;
  backupAuditLabels: BackupAuditLabels;
  whatsNewTitle: string;
  whatsNewDescription: string;
  whatsNewBilling: string;
  whatsNewBillingDescription: string;
  whatsNewMobile: string;
  whatsNewMobileDescription: string;
  whatsNewInvoices: string;
  whatsNewInvoicesDescription: string;
  accountTitle: string;
  accountDescription: string;
  profileInformation: string;
  userName: string;
  loginEmail: string;
  role: string;
  plan: string;
  tenant: string;
  company: string;
  session: string;
  currentUser: string;
  activePlan: string;
  ownerAccess: string;
  permissionsSummary: string;
  securityTitle: string;
  securityDescription: string;
  currentLoginEmail: string;
  newLoginEmail: string;
  changeEmail: string;
  emailUpdated: string;
  emailInvalid: string;
  emailInUse: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  changePassword: string;
  passwordUpdated: string;
  passwordMismatch: string;
  passwordTooShort: string;
  currentPasswordInvalid: string;
  myCompanyTitle: string;
  myCompanyDescription: string;
  clientDefaults: string;
  defaultJoinedDateToday: string;
  defaultSmsOptIn: string;
  defaultEmailOptIn: string;
  documentAccentColor: string;
  documentCompanyDisplayName: string;
  documentCompanyEmail: string;
  documentCompanyLocation: string;
  documentCompanyPhone: string;
  documentEstimateLayout: string;
  documentEstimateTerms: string;
  documentFooterMessage: string;
  documentTagline: string;
  pricingTitle: string;
  pricingDescription: string;
  pricingGeneral: string;
  pricingProperty: string;
  pricingHousehold: string;
  pricingServices: string;
  pricingExtras: string;
  pricingFrequency: string;
  pricingTravelLabor: string;
  pricingMinimumRounding: string;
  pricingBasePrice: string;
  pricingIncludedSqft: string;
  pricingAdditionalSqftRate: string;
  pricingBedroomPrice: string;
  pricingBathroomPrice: string;
  pricingKitchenPrice: string;
  pricingFloorPrice: string;
  pricingBasementPrice: string;
  pricingChildPrice: string;
  pricingCatPrice: string;
  pricingSmallDogPrice: string;
  pricingLargeDogPrice: string;
  pricingBedLinenPrice: string;
  pricingIncludedMiles: string;
  pricingPricePerMile: string;
  pricingBaseLaborHours: string;
  pricingSqftPerLaborHour: string;
  pricingMinimumPrice: string;
  pricingRounding: string;
  pricingSaved: string;
  plansBillingTitle: string;
  plansBillingDescription: string;
  billingStatus: string;
  billingManagedByAdmin: string;
  includedModules: string;
  limits: string;
  currentPlanNote: string;
  automationsTitle: string;
  automationsDescription: string;
  appointmentDefaults: string;
  appointmentSmsEnabled: string;
  appointmentEmailEnabled: string;
  arrivalSmsEnabled: string;
  departureSmsEnabled: string;
  invoiceEmailEnabled: string;
  integrationsTitle: string;
  integrationsDescription: string;
  highLevelSmsTest: string;
  highLevelSmsTestDescription: string;
  highLevelTestName: string;
  highLevelTestPhone: string;
  highLevelTestEmail: string;
  highLevelTestMessage: string;
  highLevelTestNamePlaceholder: string;
  highLevelTestPhonePlaceholder: string;
  highLevelTestEmailPlaceholder: string;
  highLevelTestMessageDefault: string;
  sendHighLevelTestSms: string;
  highLevelSmsSent: string;
  highLevelSmsMissingConfig: string;
  highLevelSmsFailed: string;
  messagesTitle: string;
  messagesDescription: string;
  messageTemplates: string;
  messageTemplatesDescription: string;
  appointmentNoticeTemplate: string;
  arrivalNoticeTemplate: string;
  departureNoticeTemplate: string;
  invoiceNoticeTemplate: string;
  templateVariables: string;
  saveSettings: string;
  saved: string;
  noChangesLost: string;
};

const storageKey = "fastclean_system_settings";
const pricingRulesStorageKey = "fastclean_pricing_rules";
const defaultSettings: SystemSettings = {
  defaultJoinedDateToday: true,
  defaultSmsOptIn: false,
  defaultEmailOptIn: false,
  appointmentSmsEnabled: true,
  appointmentEmailEnabled: true,
  arrivalSmsEnabled: true,
  departureSmsEnabled: true,
  invoiceEmailEnabled: true,
  appointmentMessageTemplates: defaultAppointmentMessageTemplates,
  documentSettings: {
    accentColor: "#0F8B8D",
    companyDisplayName: "Raisa Pugliese Cleaning Services",
    companyEmail: "",
    companyLocation: "Sarasota, FL",
    companyPhone: "",
    estimateTerms: "Estimate is valid until the expiration date above. Final scope may change if property conditions differ from the information provided.",
    footerMessage: "Thank you for the opportunity to serve your home!",
    tagline: "Professional Residential Cleaning"
  },
  pricingRules: defaultCleaningPricingRules
};

const sectionIcons: Record<SettingsSection, typeof Sparkles> = {
  whatsNew: Sparkles,
  account: UserRound,
  security: LockKeyhole,
  company: Building2,
  pricing: Calculator,
  billing: CreditCard,
  automations: Zap,
  integrations: PlugZap,
  messages: MessageSquareText
  ,
  backupAudit: ShieldCheck
};

function settingFromStorage() {
  if (typeof window === "undefined") {
    return defaultSettings;
  }

  try {
    const savedSettings = JSON.parse(window.localStorage.getItem(buildScopedStorageKey(storageKey)) ?? "{}") as Partial<SystemSettings>;
    return {
      ...defaultSettings,
      ...savedSettings,
      appointmentMessageTemplates: {
        ...defaultAppointmentMessageTemplates,
        ...savedSettings.appointmentMessageTemplates
      },
      documentSettings: {
        ...defaultSettings.documentSettings,
        ...savedSettings.documentSettings
      },
      pricingRules: mergePricingRules(savedSettings.pricingRules)
    } as SystemSettings;
  } catch {
    return defaultSettings;
  }
}

function readCookie(name: string) {
  if (typeof document === "undefined") {
    return "";
  }

  return decodeURIComponent(
    document.cookie
      .split("; ")
      .find((item) => item.startsWith(`${name}=`))
      ?.split("=")[1] ?? ""
  );
}

function readCurrentUserEmail() {
  return readCookie("fastclean_user_email");
}

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-cyan-200">
      <span>{label}</span>
      <input className="h-5 w-5 accent-secondary" checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
    </label>
  );
}

export function SystemSettingsManager({ labels }: { labels: SystemSettingsLabels }) {
  const [activeSection, setActiveSection] = useState<SettingsSection>("whatsNew");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [saved, setSaved] = useState(false);
  const [smsTestStatus, setSmsTestStatus] = useState<"idle" | "sending" | "sent" | "failed" | "missing_config">("idle");
  const [passwordStatus, setPasswordStatus] = useState<"idle" | "saved" | "mismatch" | "short" | "invalid">("idle");
  const [emailStatus, setEmailStatus] = useState<"idle" | "saved" | "invalid" | "in_use" | "password_invalid">("idle");
  const [currentLoginEmail, setCurrentLoginEmail] = useState("");
  const [securityForm, setSecurityForm] = useState({
    currentPassword: "",
    newLoginEmail: "",
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    setSettings(settingFromStorage());
    setCurrentLoginEmail(readCurrentUserEmail());
  }, []);

  const currentAccount = useMemo(() => {
    const email = currentLoginEmail.toLowerCase();
    return appUserAccounts.find((account) => account.email.toLowerCase() === email) ?? appUserAccounts.find((account) => account.sessionToken === readCookie("fastclean_session"));
  }, [currentLoginEmail]);

  const sections = useMemo<Array<{ id: SettingsSection; label: string; description: string }>>(() => [
    { description: labels.whatsNewDescription, id: "whatsNew", label: labels.whatsNew },
    { description: labels.accountDescription, id: "account", label: labels.account },
    { description: labels.securityDescription, id: "security", label: labels.security },
    { description: labels.myCompanyDescription, id: "company", label: labels.myCompany },
    { description: labels.pricingDescription, id: "pricing", label: labels.pricing },
    { description: labels.plansBillingDescription, id: "billing", label: labels.plansBilling },
    { description: labels.automationsDescription, id: "automations", label: labels.automations },
    { description: labels.integrationsDescription, id: "integrations", label: labels.integrations },
    { description: labels.messagesDescription, id: "messages", label: labels.messages },
    { description: labels.backupAuditLabels.backupAuditDescription, id: "backupAudit", label: labels.backupAudit }
  ], [labels]);

  const activeMeta = sections.find((section) => section.id === activeSection) ?? sections[0];

  function updateSetting(key: keyof SystemSettings, value: boolean) {
    setSettings((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  function updateDocumentSetting(key: keyof EstimateDocumentSettings, value: string) {
    setSettings((current) => ({ ...current, documentSettings: { ...current.documentSettings, [key]: value } }));
    setSaved(false);
  }

  function updateTemplate(key: keyof AppointmentMessageTemplates, value: string) {
    setSettings((current) => ({
      ...current,
      appointmentMessageTemplates: {
        ...current.appointmentMessageTemplates,
        [key]: value
      }
    }));
    setSaved(false);
  }

  function updatePricingRules(rules: CleaningPricingRules) {
    setSettings((current) => ({ ...current, pricingRules: rules }));
    setSaved(false);
  }

  function saveSettings() {
    const previousSettings = settingFromStorage();
    window.localStorage.setItem(buildScopedStorageKey(storageKey), JSON.stringify(settings));
    syncRemoteRecords(storageKey, [settings]);
    writeLocalRecords(pricingRulesStorageKey, [settings.pricingRules]);
    setSaved(true);
    fetch("/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        events: [
          normalizeAuditEvent({
            action: "updated",
            actorDisplayNameSnapshot: readCookie("fastclean_user_name") || readCurrentUserEmail() || "FastClean user",
            actorRoleSnapshot: readCookie("fastclean_role") || "owner",
            actorUserId: readCurrentUserEmail() || readCookie("fastclean_session"),
            changeSummary: "System settings updated.",
            entityDisplayNameSnapshot: "System settings",
            entityId: "fastclean_system_settings",
            entityType: "settings",
            metadata: { previousSettings, settings },
            newValue: settings,
            previousValue: previousSettings,
            source: "app",
            tenantId: readCookie("fastclean_session") || "tenant_raisa_cleaning"
          })
        ]
      })
    }).catch(() => undefined);
  }

  function updateSecurityField(key: keyof typeof securityForm, value: string) {
    setSecurityForm((current) => ({ ...current, [key]: value }));
  }

  async function handlePasswordChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const currentPassword = securityForm.currentPassword;
    const nextPassword = securityForm.newPassword;
    const confirmPassword = securityForm.confirmPassword;

    if (nextPassword.length < 8) {
      setPasswordStatus("short");
      return;
    }

    if (nextPassword !== confirmPassword) {
      setPasswordStatus("mismatch");
      return;
    }

    const result = await changeUserPassword(readCurrentUserEmail(), currentPassword, nextPassword);
    if (!result.ok) {
      setPasswordStatus("invalid");
      return;
    }

    setSecurityForm((current) => ({ ...current, newPassword: "", confirmPassword: "" }));
    setPasswordStatus("saved");
    auditSecurityChange("Password changed.", "password");
  }

  async function handleEmailChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextEmail = securityForm.newLoginEmail;
    const currentPassword = securityForm.currentPassword;
    const previousEmail = readCurrentUserEmail();
    const result = await changeUserEmail(previousEmail, currentPassword, nextEmail);

    if (!result.ok) {
      setEmailStatus(result.reason === "email_in_use" ? "in_use" : result.reason === "invalid_email" ? "invalid" : "password_invalid");
      return;
    }

    document.cookie = `fastclean_user_email=${encodeURIComponent(result.email)}; path=/; max-age=86400; SameSite=Lax`;
    setCurrentLoginEmail(result.email);
    setSecurityForm((current) => ({ ...current, newLoginEmail: "" }));
    setEmailStatus("saved");
    auditSecurityChange("Login email changed.", "email", previousEmail, result.email);
  }

  function auditSecurityChange(summary: string, fieldName: string, previousValue?: string, newValue?: string) {
    fetch("/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        events: [
          normalizeAuditEvent({
            action: "login_security_changed",
            actorDisplayNameSnapshot: readCookie("fastclean_user_name") || readCurrentUserEmail() || "FastClean user",
            actorRoleSnapshot: readCookie("fastclean_role") || "owner",
            actorUserId: readCurrentUserEmail() || readCookie("fastclean_session"),
            changeSummary: summary,
            entityDisplayNameSnapshot: readCurrentUserEmail() || "Current user",
            entityId: readCurrentUserEmail() || "current_user",
            entityType: "permissions",
            fieldName,
            metadata: {},
            newValue: fieldName === "password" ? "[masked]" : newValue,
            previousValue: fieldName === "password" ? "[masked]" : previousValue,
            source: "app",
            tenantId: readCookie("fastclean_session") || "tenant_raisa_cleaning"
          })
        ]
      })
    }).catch(() => undefined);
  }

  async function sendTestSms(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSmsTestStatus("sending");

    const response = await fetch("/api/highlevel/test-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(formData.get("highLevelTestName") ?? ""),
        phone: String(formData.get("highLevelTestPhone") ?? ""),
        email: String(formData.get("highLevelTestEmail") ?? ""),
        message: String(formData.get("highLevelTestMessage") ?? "")
      })
    });

    if (response.ok) {
      setSmsTestStatus("sent");
      return;
    }

    const payload = await response.json().catch(() => ({})) as { reason?: string };
    setSmsTestStatus(payload.reason === "highlevel_environment_not_configured" ? "missing_config" : "failed");
  }

  function selectSection(section: SettingsSection) {
    setActiveSection(section);
    setMobileNavOpen(false);
  }

  const showSaveAction = activeSection === "company" || activeSection === "pricing" || activeSection === "automations" || activeSection === "messages";

  return (
    <div className="-m-4 min-h-[calc(100vh-5rem)] bg-slate-50 px-4 py-4 sm:-m-6 sm:px-6 lg:-m-8 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <SettingsSidebar activeSection={activeSection} labels={labels} onSelect={selectSection} sections={sections} />
        </aside>

        <div className="grid gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-secondary">{labels.title}</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">{activeMeta.label}</h1>
              <p className="mt-1 max-w-2xl text-sm font-semibold text-slate-500">{activeMeta.description}</p>
            </div>
            <div className="flex items-center gap-2">
              {saved ? <StatusPill tone="green" label={labels.saved} /> : null}
              <Button className="lg:hidden" onClick={() => setMobileNavOpen(true)} type="button" variant="outline">
                <Menu className="h-4 w-4" />
                {labels.mobileNavigation}
              </Button>
              {showSaveAction ? (
                <Button onClick={saveSettings} type="button">
                  <Save className="h-4 w-4" />
                  {labels.saveSettings}
                </Button>
              ) : null}
            </div>
          </div>

          <main className="grid max-w-5xl gap-4">
            {activeSection === "whatsNew" ? <WhatsNewSection labels={labels} /> : null}
            {activeSection === "account" ? <AccountSection account={currentAccount} currentEmail={currentLoginEmail} labels={labels} /> : null}
            {activeSection === "security" ? (
              <SecuritySection
                currentLoginEmail={currentLoginEmail}
                emailStatus={emailStatus}
                labels={labels}
                onEmailChange={handleEmailChange}
                onPasswordChange={handlePasswordChange}
                onUpdateField={updateSecurityField}
                passwordStatus={passwordStatus}
                securityForm={securityForm}
              />
            ) : null}
            {activeSection === "company" ? <CompanySection labels={labels} settings={settings} updateDocumentSetting={updateDocumentSetting} updateSetting={updateSetting} /> : null}
            {activeSection === "pricing" ? <PricingSection labels={labels} rules={settings.pricingRules} updateRules={updatePricingRules} /> : null}
            {activeSection === "billing" ? <BillingSection account={currentAccount} labels={labels} /> : null}
            {activeSection === "automations" ? <AutomationsSection labels={labels} settings={settings} updateSetting={updateSetting} /> : null}
            {activeSection === "integrations" ? <IntegrationsSection labels={labels} onSendTestSms={sendTestSms} smsTestStatus={smsTestStatus} /> : null}
            {activeSection === "messages" ? <MessagesSection labels={labels} settings={settings} updateTemplate={updateTemplate} /> : null}
            {activeSection === "backupAudit" ? <BackupAuditPanel labels={labels.backupAuditLabels} /> : null}
          </main>
        </div>
      </div>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-950/40 lg:hidden" onClick={() => setMobileNavOpen(false)}>
          <div className="h-full w-[86vw] max-w-sm bg-white p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-black text-slate-950">{labels.navigationTitle}</p>
              <button className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500" onClick={() => setMobileNavOpen(false)} type="button" aria-label={labels.closeNavigation}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <SettingsNavigation activeSection={activeSection} labels={labels} onSelect={selectSection} sections={sections} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SettingsSidebar({ activeSection, labels, onSelect, sections }: { activeSection: SettingsSection; labels: SystemSettingsLabels; onSelect: (section: SettingsSection) => void; sections: Array<{ id: SettingsSection; label: string; description: string }> }) {
  return (
    <div className="sticky top-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-3 rounded-lg bg-gradient-to-br from-cyan-50 to-teal-50 p-3 ring-1 ring-cyan-100">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-secondary">{labels.navigationTitle}</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">{labels.noChangesLost}</p>
      </div>
      <SettingsNavigation activeSection={activeSection} labels={labels} onSelect={onSelect} sections={sections} />
    </div>
  );
}

function SettingsNavigation({ activeSection, labels, onSelect, sections }: { activeSection: SettingsSection; labels: SystemSettingsLabels; onSelect: (section: SettingsSection) => void; sections: Array<{ id: SettingsSection; label: string; description: string }> }) {
  return (
    <nav className="grid gap-1" aria-label={labels.navigationTitle}>
      {sections.map((section) => {
        const Icon = sectionIcons[section.id];
        const active = activeSection === section.id;
        return (
          <button
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-black transition ${active ? "bg-green-50 text-teal-700 ring-1 ring-green-100" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}
            key={section.id}
            onClick={() => onSelect(section.id)}
            type="button"
          >
            <span className={`grid h-8 w-8 place-items-center rounded-lg ${active ? "bg-white text-secondary shadow-sm" : "bg-slate-50 text-slate-500"}`}>
              <Icon className="h-4 w-4" />
            </span>
            <span>{section.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function SectionCard({ children, description, icon: Icon, title }: { children: React.ReactNode; description?: string; icon: typeof Sparkles; title: string }) {
  return (
    <Card>
      <CardHeader className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cyan-50 text-primary ring-1 ring-cyan-100">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-base font-black text-slate-950">{title}</h2>
          {description ? <p className="mt-1 text-sm font-semibold text-slate-500">{description}</p> : null}
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">{children}</CardContent>
    </Card>
  );
}

function WhatsNewSection({ labels }: { labels: SystemSettingsLabels }) {
  const items = [
    { description: labels.whatsNewInvoicesDescription, icon: MessageSquareText, title: labels.whatsNewInvoices },
    { description: labels.whatsNewMobileDescription, icon: ShieldCheck, title: labels.whatsNewMobile },
    { description: labels.whatsNewBillingDescription, icon: CreditCard, title: labels.whatsNewBilling }
  ];

  return (
    <SectionCard description={labels.whatsNewDescription} icon={Sparkles} title={labels.whatsNewTitle}>
      <div className="grid gap-3 md:grid-cols-3">
        {items.map((item) => (
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" key={item.title}>
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-green-50 text-secondary ring-1 ring-green-100">
              <item.icon className="h-4 w-4" />
            </span>
            <h3 className="mt-3 text-sm font-black text-slate-950">{item.title}</h3>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{item.description}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function AccountSection({ account, currentEmail, labels }: { account?: { companyName: string; name: string; planCode: string; role: string; sessionToken: string }; currentEmail: string; labels: SystemSettingsLabels }) {
  return (
    <SectionCard description={labels.accountDescription} icon={UserRound} title={labels.accountTitle}>
      <div className="grid gap-3 md:grid-cols-2">
        <Detail label={labels.userName} value={account?.name || labels.currentUser} />
        <Detail label={labels.loginEmail} value={currentEmail} />
        <Detail label={labels.role} value={account?.role || labels.ownerAccess} />
        <Detail label={labels.company} value={account?.companyName || readCookie("fastclean_company")} />
        <Detail label={labels.plan} value={account?.planCode || readCookie("fastclean_plan")} />
        <Detail label={labels.session} value={account?.sessionToken || readCookie("fastclean_session")} />
      </div>
      <div className="rounded-lg bg-slate-50 p-4 text-sm font-semibold text-slate-600 ring-1 ring-slate-100">{labels.permissionsSummary}</div>
    </SectionCard>
  );
}

function SecuritySection({
  currentLoginEmail,
  emailStatus,
  labels,
  onEmailChange,
  onPasswordChange,
  onUpdateField,
  passwordStatus,
  securityForm
}: {
  currentLoginEmail: string;
  emailStatus: "idle" | "saved" | "invalid" | "in_use" | "password_invalid";
  labels: SystemSettingsLabels;
  onEmailChange: (event: React.FormEvent<HTMLFormElement>) => void;
  onPasswordChange: (event: React.FormEvent<HTMLFormElement>) => void;
  onUpdateField: (key: "currentPassword" | "newLoginEmail" | "newPassword" | "confirmPassword", value: string) => void;
  passwordStatus: "idle" | "saved" | "mismatch" | "short" | "invalid";
  securityForm: { currentPassword: string; newLoginEmail: string; newPassword: string; confirmPassword: string };
}) {
  return (
    <SectionCard description={labels.securityDescription} icon={LockKeyhole} title={labels.securityTitle}>
      <Input label={labels.currentLoginEmail} name="currentLoginEmail" readOnly value={currentLoginEmail} />
      <Input autoComplete="current-password" label={labels.currentPassword} name="currentPassword" onChange={(event) => onUpdateField("currentPassword", event.target.value)} required type="password" value={securityForm.currentPassword} />
      <form className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_auto]" onSubmit={onEmailChange}>
        <Input autoComplete="email" label={labels.newLoginEmail} name="newLoginEmail" onChange={(event) => onUpdateField("newLoginEmail", event.target.value)} required type="email" value={securityForm.newLoginEmail} />
        <div className="flex items-end">
          <Button type="submit"><Mail className="h-4 w-4" />{labels.changeEmail}</Button>
        </div>
        <div className="md:col-span-2">
          {emailStatus === "saved" ? <StatusPill tone="green" label={labels.emailUpdated} /> : null}
          {emailStatus === "invalid" ? <StatusPill tone="yellow" label={labels.emailInvalid} /> : null}
          {emailStatus === "in_use" ? <StatusPill tone="yellow" label={labels.emailInUse} /> : null}
          {emailStatus === "password_invalid" ? <StatusPill tone="red" label={labels.currentPasswordInvalid} /> : null}
        </div>
      </form>
      <form className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-2" onSubmit={onPasswordChange}>
        <Input autoComplete="new-password" label={labels.newPassword} name="newPassword" onChange={(event) => onUpdateField("newPassword", event.target.value)} required type="password" value={securityForm.newPassword} />
        <Input autoComplete="new-password" label={labels.confirmPassword} name="confirmPassword" onChange={(event) => onUpdateField("confirmPassword", event.target.value)} required type="password" value={securityForm.confirmPassword} />
        <div className="flex flex-wrap items-center gap-3 md:col-span-2">
          <Button type="submit"><LockKeyhole className="h-4 w-4" />{labels.changePassword}</Button>
          {passwordStatus === "saved" ? <StatusPill tone="green" label={labels.passwordUpdated} /> : null}
          {passwordStatus === "mismatch" ? <StatusPill tone="yellow" label={labels.passwordMismatch} /> : null}
          {passwordStatus === "short" ? <StatusPill tone="yellow" label={labels.passwordTooShort} /> : null}
          {passwordStatus === "invalid" ? <StatusPill tone="red" label={labels.currentPasswordInvalid} /> : null}
        </div>
      </form>
    </SectionCard>
  );
}

function CompanySection({ labels, settings, updateDocumentSetting, updateSetting }: { labels: SystemSettingsLabels; settings: SystemSettings; updateDocumentSetting: (key: keyof EstimateDocumentSettings, value: string) => void; updateSetting: (key: keyof SystemSettings, value: boolean) => void }) {
  return (
    <SectionCard description={labels.myCompanyDescription} icon={Building2} title={labels.myCompanyTitle}>
      <h3 className="text-sm font-black text-slate-950">{labels.clientDefaults}</h3>
      <div className="grid gap-3">
        <Toggle checked={settings.defaultJoinedDateToday} label={labels.defaultJoinedDateToday} onChange={(value) => updateSetting("defaultJoinedDateToday", value)} />
        <Toggle checked={settings.defaultSmsOptIn} label={labels.defaultSmsOptIn} onChange={(value) => updateSetting("defaultSmsOptIn", value)} />
        <Toggle checked={settings.defaultEmailOptIn} label={labels.defaultEmailOptIn} onChange={(value) => updateSetting("defaultEmailOptIn", value)} />
      </div>
      <div className="mt-4 border-t border-slate-100 pt-4">
        <h3 className="text-sm font-black text-slate-950">{labels.documentEstimateLayout}</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Input label={labels.documentCompanyDisplayName} onChange={(event) => updateDocumentSetting("companyDisplayName", event.target.value)} value={settings.documentSettings.companyDisplayName ?? ""} />
          <Input label={labels.documentTagline} onChange={(event) => updateDocumentSetting("tagline", event.target.value)} value={settings.documentSettings.tagline ?? ""} />
          <Input label={labels.documentCompanyLocation} onChange={(event) => updateDocumentSetting("companyLocation", event.target.value)} value={settings.documentSettings.companyLocation ?? ""} />
          <Input label={labels.documentCompanyPhone} onChange={(event) => updateDocumentSetting("companyPhone", event.target.value)} value={settings.documentSettings.companyPhone ?? ""} />
          <Input label={labels.documentCompanyEmail} onChange={(event) => updateDocumentSetting("companyEmail", event.target.value)} type="email" value={settings.documentSettings.companyEmail ?? ""} />
          <Input label={labels.documentAccentColor} onChange={(event) => updateDocumentSetting("accentColor", event.target.value)} type="color" value={settings.documentSettings.accentColor ?? "#0F8B8D"} />
          <Input className="md:col-span-2" label={labels.documentEstimateTerms} onChange={(event) => updateDocumentSetting("estimateTerms", event.target.value)} value={settings.documentSettings.estimateTerms ?? ""} />
          <Input className="md:col-span-2" label={labels.documentFooterMessage} onChange={(event) => updateDocumentSetting("footerMessage", event.target.value)} value={settings.documentSettings.footerMessage ?? ""} />
        </div>
      </div>
    </SectionCard>
  );
}

function PricingSection({ labels, rules, updateRules }: { labels: SystemSettingsLabels; rules: CleaningPricingRules; updateRules: (rules: CleaningPricingRules) => void }) {
  function updateNumber(path: string, value: string) {
    const numericValue = Number(value) || 0;
    const [group, field] = path.split(".");

    if (!field) {
      updateRules({ ...rules, [path]: numericValue });
      return;
    }

    updateRules({
      ...rules,
      [group]: {
        ...(rules[group as keyof CleaningPricingRules] as Record<string, unknown>),
        [field]: numericValue
      }
    });
  }

  function updateRounding(value: string) {
    const rounding = Number(value) === 10 ? 10 : Number(value) === 1 ? 1 : 5;
    updateRules({ ...rules, rounding });
  }

  return (
    <SectionCard description={labels.pricingDescription} icon={Calculator} title={labels.pricingTitle}>
      <SettingsSubsection title={labels.pricingGeneral}>
        <NumberSetting label={labels.pricingBasePrice} onChange={(value) => updateNumber("basePrice", value)} value={rules.basePrice} />
        <NumberSetting label={labels.pricingIncludedSqft} onChange={(value) => updateNumber("includedSquareFeet", value)} value={rules.includedSquareFeet} />
        <NumberSetting label={labels.pricingAdditionalSqftRate} onChange={(value) => updateNumber("additionalSqftRate", value)} step="0.01" value={rules.additionalSqftRate} />
      </SettingsSubsection>
      <SettingsSubsection title={labels.pricingProperty}>
        <NumberSetting label={labels.pricingBedroomPrice} onChange={(value) => updateNumber("bedroomPrice", value)} value={rules.bedroomPrice} />
        <NumberSetting label={labels.pricingBathroomPrice} onChange={(value) => updateNumber("bathroomPrice", value)} value={rules.bathroomPrice} />
        <NumberSetting label={labels.pricingKitchenPrice} onChange={(value) => updateNumber("kitchenPrice", value)} value={rules.kitchenPrice} />
        <NumberSetting label={labels.pricingFloorPrice} onChange={(value) => updateNumber("floorPrice", value)} value={rules.floorPrice} />
        <NumberSetting label={labels.pricingBasementPrice} onChange={(value) => updateNumber("basementPrice", value)} value={rules.basementPrice} />
      </SettingsSubsection>
      <SettingsSubsection title={labels.pricingHousehold}>
        <NumberSetting label={labels.pricingChildPrice} onChange={(value) => updateNumber("household.child", value)} value={rules.household.child} />
        <NumberSetting label={labels.pricingCatPrice} onChange={(value) => updateNumber("household.cat", value)} value={rules.household.cat} />
        <NumberSetting label={labels.pricingSmallDogPrice} onChange={(value) => updateNumber("household.smallDog", value)} value={rules.household.smallDog} />
        <NumberSetting label={labels.pricingLargeDogPrice} onChange={(value) => updateNumber("household.largeDog", value)} value={rules.household.largeDog} />
        <NumberSetting label={labels.pricingBedLinenPrice} onChange={(value) => updateNumber("household.bedLinenChange", value)} value={rules.household.bedLinenChange} />
      </SettingsSubsection>
      <SettingsSubsection title={labels.pricingTravelLabor}>
        <NumberSetting label={labels.pricingIncludedMiles} onChange={(value) => updateNumber("travel.includedMiles", value)} value={rules.travel.includedMiles} />
        <NumberSetting label={labels.pricingPricePerMile} onChange={(value) => updateNumber("travel.pricePerMileAfterIncluded", value)} step="0.01" value={rules.travel.pricePerMileAfterIncluded} />
        <NumberSetting label={labels.pricingBaseLaborHours} onChange={(value) => updateNumber("labor.baseHours", value)} step="0.25" value={rules.labor.baseHours} />
        <NumberSetting label={labels.pricingSqftPerLaborHour} onChange={(value) => updateNumber("labor.sqftPerLaborHour", value)} value={rules.labor.sqftPerLaborHour} />
      </SettingsSubsection>
      <SettingsSubsection title={labels.pricingMinimumRounding}>
        <NumberSetting label={labels.pricingMinimumPrice} onChange={(value) => updateNumber("minimumPrice", value)} value={rules.minimumPrice} />
        <label className="grid gap-1.5 text-xs font-bold text-slate-600">
          {labels.pricingRounding}
          <select className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-primary focus:ring-4 focus:ring-cyan-100" onChange={(event) => updateRounding(event.target.value)} value={rules.rounding}>
            <option value={1}>$1</option>
            <option value={5}>$5</option>
            <option value={10}>$10</option>
          </select>
        </label>
      </SettingsSubsection>
      <div className="rounded-lg bg-green-50 p-3 text-sm font-black text-green-700 ring-1 ring-green-100">{labels.pricingSaved}</div>
    </SectionCard>
  );
}

function SettingsSubsection({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-black text-slate-950">{title}</h3>
      <div className="grid gap-3 md:grid-cols-3">{children}</div>
    </div>
  );
}

function NumberSetting({ label, onChange, step = "1", value }: { label: string; onChange: (value: string) => void; step?: string; value: number }) {
  return <Input label={label} onChange={(event) => onChange(event.target.value)} step={step} type="number" value={value} />;
}

function BillingSection({ account, labels }: { account?: { planCode: string }; labels: SystemSettingsLabels }) {
  return (
    <SectionCard description={labels.plansBillingDescription} icon={CreditCard} title={labels.plansBillingTitle}>
      <div className="grid gap-3 md:grid-cols-2">
        <Detail label={labels.activePlan} value={account?.planCode || readCookie("fastclean_plan")} />
        <Detail label={labels.billingStatus} value={labels.billingManagedByAdmin} />
        <Detail label={labels.includedModules} value={labels.currentPlanNote} />
        <Detail label={labels.limits} value={labels.currentPlanNote} />
      </div>
    </SectionCard>
  );
}

function AutomationsSection({ labels, settings, updateSetting }: { labels: SystemSettingsLabels; settings: SystemSettings; updateSetting: (key: keyof SystemSettings, value: boolean) => void }) {
  return (
    <SectionCard description={labels.automationsDescription} icon={Zap} title={labels.automationsTitle}>
      <h3 className="text-sm font-black text-slate-950">{labels.appointmentDefaults}</h3>
      <div className="grid gap-3">
        <Toggle checked={settings.appointmentSmsEnabled} label={labels.appointmentSmsEnabled} onChange={(value) => updateSetting("appointmentSmsEnabled", value)} />
        <Toggle checked={settings.appointmentEmailEnabled} label={labels.appointmentEmailEnabled} onChange={(value) => updateSetting("appointmentEmailEnabled", value)} />
        <Toggle checked={settings.arrivalSmsEnabled} label={labels.arrivalSmsEnabled} onChange={(value) => updateSetting("arrivalSmsEnabled", value)} />
        <Toggle checked={settings.departureSmsEnabled} label={labels.departureSmsEnabled} onChange={(value) => updateSetting("departureSmsEnabled", value)} />
        <Toggle checked={settings.invoiceEmailEnabled} label={labels.invoiceEmailEnabled} onChange={(value) => updateSetting("invoiceEmailEnabled", value)} />
      </div>
    </SectionCard>
  );
}

function IntegrationsSection({ labels, onSendTestSms, smsTestStatus }: { labels: SystemSettingsLabels; onSendTestSms: (event: React.FormEvent<HTMLFormElement>) => void; smsTestStatus: "idle" | "sending" | "sent" | "failed" | "missing_config" }) {
  return (
    <SectionCard description={labels.integrationsDescription} icon={PlugZap} title={labels.integrationsTitle}>
      <form className="grid gap-4 md:grid-cols-3" onSubmit={onSendTestSms}>
        <Input label={labels.highLevelTestName} name="highLevelTestName" placeholder={labels.highLevelTestNamePlaceholder} />
        <Input label={labels.highLevelTestPhone} name="highLevelTestPhone" placeholder={labels.highLevelTestPhonePlaceholder} required type="tel" />
        <Input label={labels.highLevelTestEmail} name="highLevelTestEmail" placeholder={labels.highLevelTestEmailPlaceholder} type="email" />
        <TextArea className="md:col-span-3" defaultValue={labels.highLevelTestMessageDefault} label={labels.highLevelTestMessage} name="highLevelTestMessage" required />
        <div className="flex flex-wrap items-center gap-3 md:col-span-3">
          <Button disabled={smsTestStatus === "sending"} type="submit">
            <Send className="h-4 w-4" />
            {labels.sendHighLevelTestSms}
          </Button>
          {smsTestStatus === "sent" ? <StatusPill tone="green" label={labels.highLevelSmsSent} /> : null}
          {smsTestStatus === "missing_config" ? <StatusPill tone="yellow" label={labels.highLevelSmsMissingConfig} /> : null}
          {smsTestStatus === "failed" ? <StatusPill tone="red" label={labels.highLevelSmsFailed} /> : null}
        </div>
      </form>
    </SectionCard>
  );
}

function MessagesSection({ labels, settings, updateTemplate }: { labels: SystemSettingsLabels; settings: SystemSettings; updateTemplate: (key: keyof AppointmentMessageTemplates, value: string) => void }) {
  return (
    <SectionCard description={labels.messageTemplatesDescription} icon={MessageSquareText} title={labels.messagesTitle}>
      <div className="rounded-lg bg-cyan-50 p-3 text-sm font-bold text-cyan-800 ring-1 ring-cyan-100">{labels.templateVariables}</div>
      <TemplateEditor label={labels.appointmentNoticeTemplate} value={settings.appointmentMessageTemplates.appointment} onChange={(value) => updateTemplate("appointment", value)} />
      <TemplateEditor label={labels.arrivalNoticeTemplate} value={settings.appointmentMessageTemplates.arrival} onChange={(value) => updateTemplate("arrival", value)} />
      <TemplateEditor label={labels.departureNoticeTemplate} value={settings.appointmentMessageTemplates.departure} onChange={(value) => updateTemplate("departure", value)} />
      <TemplateEditor label={labels.invoiceNoticeTemplate} value={settings.appointmentMessageTemplates.invoice} onChange={(value) => updateTemplate("invoice", value)} />
    </SectionCard>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 min-h-5 break-words text-sm font-black text-slate-900">{value || "-"}</p>
    </div>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "green" | "yellow" | "red" }) {
  const toneClass = tone === "green" ? "bg-green-50 text-green-700 ring-green-100" : tone === "yellow" ? "bg-yellow-50 text-yellow-700 ring-yellow-100" : "bg-red-50 text-red-700 ring-red-100";

  return <span className={`inline-flex rounded-lg px-3 py-2 text-xs font-black ring-1 ${toneClass}`}>{label}</span>;
}

function TextArea({ className = "", defaultValue, label, name, onChange, required, value }: { className?: string; defaultValue?: string; label: string; name?: string; onChange?: (value: string) => void; required?: boolean; value?: string }) {
  return (
    <label className={`grid gap-1.5 text-xs font-bold text-slate-600 ${className}`}>
      {label}
      <textarea
        className="min-h-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-cyan-100"
        defaultValue={defaultValue}
        name={name}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        required={required}
        value={value}
      />
    </label>
  );
}

function TemplateEditor({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return <TextArea label={label} onChange={onChange} value={value} />;
}
