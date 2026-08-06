"use client";

import { useEffect, useState } from "react";
import { Bell, CalendarDays, LockKeyhole, Mail, MessageSquareText, Save, Send, UserRound } from "lucide-react";
import { Button, Card, CardContent, CardHeader, Input } from "@/components/design-system";
import { changeUserEmail, changeUserPassword } from "@/lib/auth/app-users";
import { buildScopedStorageKey } from "@/lib/storage/local-records";
import { defaultAppointmentMessageTemplates, type AppointmentMessageTemplates } from "@/lib/highlevel/message-templates";

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
};

export type SystemSettingsLabels = {
  appointmentEmailEnabled: string;
  appointmentSmsEnabled: string;
  appointmentDefaults: string;
  arrivalSmsEnabled: string;
  clientDefaults: string;
  defaultEmailOptIn: string;
  defaultJoinedDateToday: string;
  defaultSmsOptIn: string;
  departureSmsEnabled: string;
  invoiceEmailEnabled: string;
  saved: string;
  saveSettings: string;
  highLevelSmsTest: string;
  highLevelSmsTestDescription: string;
  highLevelTestName: string;
  highLevelTestPhone: string;
  highLevelTestEmail: string;
  highLevelTestMessage: string;
  sendHighLevelTestSms: string;
  highLevelSmsSent: string;
  highLevelSmsMissingConfig: string;
  highLevelSmsFailed: string;
  security: string;
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
  messageTemplates: string;
  messageTemplatesDescription: string;
  appointmentNoticeTemplate: string;
  arrivalNoticeTemplate: string;
  departureNoticeTemplate: string;
  invoiceNoticeTemplate: string;
  templateVariables: string;
};

const storageKey = "fastclean_system_settings";
const defaultSettings: SystemSettings = {
  defaultJoinedDateToday: true,
  defaultSmsOptIn: false,
  defaultEmailOptIn: false,
  appointmentSmsEnabled: true,
  appointmentEmailEnabled: true,
  arrivalSmsEnabled: true,
  departureSmsEnabled: true,
  invoiceEmailEnabled: true,
  appointmentMessageTemplates: defaultAppointmentMessageTemplates
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
      }
    } as SystemSettings;
  } catch {
    return defaultSettings;
  }
}

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-700 ring-1 ring-slate-100">
      <span>{label}</span>
      <input className="h-5 w-5 accent-primary" checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
    </label>
  );
}

export function SystemSettingsManager({ labels }: { labels: SystemSettingsLabels }) {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [saved, setSaved] = useState(false);
  const [smsTestStatus, setSmsTestStatus] = useState<"idle" | "sending" | "sent" | "failed" | "missing_config">("idle");
  const [passwordStatus, setPasswordStatus] = useState<"idle" | "saved" | "mismatch" | "short" | "invalid">("idle");
  const [emailStatus, setEmailStatus] = useState<"idle" | "saved" | "invalid" | "in_use" | "password_invalid">("idle");
  const [currentLoginEmail, setCurrentLoginEmail] = useState("");

  useEffect(() => {
    setSettings(settingFromStorage());
    setCurrentLoginEmail(readCurrentUserEmail());
  }, []);

  function updateSetting(key: keyof SystemSettings, value: boolean) {
    setSettings((current) => ({ ...current, [key]: value }));
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

  function saveSettings() {
    window.localStorage.setItem(buildScopedStorageKey(storageKey), JSON.stringify(settings));
    setSaved(true);
  }

  function readCurrentUserEmail() {
    if (typeof document === "undefined") {
      return "";
    }

    return decodeURIComponent(
      document.cookie
        .split("; ")
        .find((item) => item.startsWith("fastclean_user_email="))
        ?.split("=")[1] ?? ""
    );
  }

  async function handlePasswordChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const nextPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

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

    form.reset();
    setPasswordStatus("saved");
  }

  async function handleEmailChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const nextEmail = String(formData.get("newLoginEmail") ?? "");
    const currentPassword = String(formData.get("emailCurrentPassword") ?? "");
    const result = await changeUserEmail(readCurrentUserEmail(), currentPassword, nextEmail);

    if (!result.ok) {
      setEmailStatus(result.reason === "email_in_use" ? "in_use" : result.reason === "invalid_email" ? "invalid" : "password_invalid");
      return;
    }

    document.cookie = `fastclean_user_email=${encodeURIComponent(result.email)}; path=/; max-age=86400; SameSite=Lax`;
    setCurrentLoginEmail(result.email);
    form.reset();
    setEmailStatus("saved");
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

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="xl:col-span-2">
        <CardHeader className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-50 text-primary">
            <LockKeyhole className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-black text-slate-950">{labels.security}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">{labels.securityDescription}</p>
          </div>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 border-b border-slate-100 pb-5 lg:grid-cols-3" onSubmit={handleEmailChange}>
            <Input label={labels.currentLoginEmail} name="currentLoginEmail" readOnly value={currentLoginEmail} />
            <Input autoComplete="email" label={labels.newLoginEmail} name="newLoginEmail" required type="email" />
            <Input autoComplete="current-password" label={labels.currentPassword} name="emailCurrentPassword" required type="password" />
            <div className="flex flex-wrap items-center gap-3 lg:col-span-3">
              <Button type="submit">
                <Mail className="h-4 w-4" />
                {labels.changeEmail}
              </Button>
              {emailStatus === "saved" ? <StatusPill tone="green" label={labels.emailUpdated} /> : null}
              {emailStatus === "invalid" ? <StatusPill tone="yellow" label={labels.emailInvalid} /> : null}
              {emailStatus === "in_use" ? <StatusPill tone="yellow" label={labels.emailInUse} /> : null}
              {emailStatus === "password_invalid" ? <StatusPill tone="red" label={labels.currentPasswordInvalid} /> : null}
            </div>
          </form>
          <form className="grid gap-4 pt-5 lg:grid-cols-3" onSubmit={handlePasswordChange}>
            <Input autoComplete="current-password" label={labels.currentPassword} name="currentPassword" required type="password" />
            <Input autoComplete="new-password" label={labels.newPassword} name="newPassword" required type="password" />
            <Input autoComplete="new-password" label={labels.confirmPassword} name="confirmPassword" required type="password" />
            <div className="flex flex-wrap items-center gap-3 lg:col-span-3">
              <Button type="submit">
                <LockKeyhole className="h-4 w-4" />
                {labels.changePassword}
              </Button>
              {passwordStatus === "saved" ? <StatusPill tone="green" label={labels.passwordUpdated} /> : null}
              {passwordStatus === "mismatch" ? <StatusPill tone="yellow" label={labels.passwordMismatch} /> : null}
              {passwordStatus === "short" ? <StatusPill tone="yellow" label={labels.passwordTooShort} /> : null}
              {passwordStatus === "invalid" ? <StatusPill tone="red" label={labels.currentPasswordInvalid} /> : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-50 text-primary">
            <UserRound className="h-5 w-5" />
          </span>
          <h2 className="text-base font-black text-slate-950">{labels.clientDefaults}</h2>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Toggle checked={settings.defaultJoinedDateToday} label={labels.defaultJoinedDateToday} onChange={(value) => updateSetting("defaultJoinedDateToday", value)} />
          <Toggle checked={settings.defaultSmsOptIn} label={labels.defaultSmsOptIn} onChange={(value) => updateSetting("defaultSmsOptIn", value)} />
          <Toggle checked={settings.defaultEmailOptIn} label={labels.defaultEmailOptIn} onChange={(value) => updateSetting("defaultEmailOptIn", value)} />
        </CardContent>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-secondary">
            <MessageSquareText className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-black text-slate-950">{labels.messageTemplates}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">{labels.messageTemplatesDescription}</p>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="rounded-xl bg-cyan-50 p-3 text-sm font-bold text-cyan-800 ring-1 ring-cyan-100">{labels.templateVariables}</div>
          <TemplateEditor label={labels.appointmentNoticeTemplate} value={settings.appointmentMessageTemplates.appointment} onChange={(value) => updateTemplate("appointment", value)} />
          <TemplateEditor label={labels.arrivalNoticeTemplate} value={settings.appointmentMessageTemplates.arrival} onChange={(value) => updateTemplate("arrival", value)} />
          <TemplateEditor label={labels.departureNoticeTemplate} value={settings.appointmentMessageTemplates.departure} onChange={(value) => updateTemplate("departure", value)} />
          <TemplateEditor label={labels.invoiceNoticeTemplate} value={settings.appointmentMessageTemplates.invoice} onChange={(value) => updateTemplate("invoice", value)} />
        </CardContent>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-50 text-primary">
            <MessageSquareText className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-black text-slate-950">{labels.highLevelSmsTest}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">{labels.highLevelSmsTestDescription}</p>
          </div>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-3" onSubmit={sendTestSms}>
            <Input label={labels.highLevelTestName} name="highLevelTestName" placeholder="Rafael" />
            <Input label={labels.highLevelTestPhone} name="highLevelTestPhone" placeholder="+1 689 254 4334" required type="tel" />
            <Input label={labels.highLevelTestEmail} name="highLevelTestEmail" placeholder="optional@email.com" type="email" />
            <label className="grid gap-2 text-sm font-medium text-slate-700 lg:col-span-3">
              {labels.highLevelTestMessage}
              <textarea
                className="min-h-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-cyan-100"
                defaultValue="FastClean Pro SMS test."
                name="highLevelTestMessage"
                required
              />
            </label>
            <div className="flex flex-wrap items-center gap-3 lg:col-span-3">
              <Button disabled={smsTestStatus === "sending"} type="submit">
                <Send className="h-4 w-4" />
                {labels.sendHighLevelTestSms}
              </Button>
              {smsTestStatus === "sent" ? <StatusPill tone="green" label={labels.highLevelSmsSent} /> : null}
              {smsTestStatus === "missing_config" ? <StatusPill tone="yellow" label={labels.highLevelSmsMissingConfig} /> : null}
              {smsTestStatus === "failed" ? <StatusPill tone="red" label={labels.highLevelSmsFailed} /> : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-secondary">
            <CalendarDays className="h-5 w-5" />
          </span>
          <h2 className="text-base font-black text-slate-950">{labels.appointmentDefaults}</h2>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Toggle checked={settings.appointmentSmsEnabled} label={labels.appointmentSmsEnabled} onChange={(value) => updateSetting("appointmentSmsEnabled", value)} />
          <Toggle checked={settings.appointmentEmailEnabled} label={labels.appointmentEmailEnabled} onChange={(value) => updateSetting("appointmentEmailEnabled", value)} />
          <Toggle checked={settings.arrivalSmsEnabled} label={labels.arrivalSmsEnabled} onChange={(value) => updateSetting("arrivalSmsEnabled", value)} />
          <Toggle checked={settings.departureSmsEnabled} label={labels.departureSmsEnabled} onChange={(value) => updateSetting("departureSmsEnabled", value)} />
          <Toggle checked={settings.invoiceEmailEnabled} label={labels.invoiceEmailEnabled} onChange={(value) => updateSetting("invoiceEmailEnabled", value)} />
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3 xl:col-span-2">
        <Button onClick={saveSettings} type="button">
          <Save className="h-4 w-4" />
          {labels.saveSettings}
        </Button>
        {saved ? (
          <span className="inline-flex items-center gap-2 rounded-xl bg-green-50 px-4 py-2 text-sm font-black text-green-700 ring-1 ring-green-100">
            <Bell className="h-4 w-4" />
            {labels.saved}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "green" | "yellow" | "red" }) {
  const toneClass = tone === "green" ? "bg-green-50 text-green-700 ring-green-100" : tone === "yellow" ? "bg-yellow-50 text-yellow-700 ring-yellow-100" : "bg-red-50 text-red-700 ring-red-100";

  return <span className={`inline-flex rounded-xl px-4 py-2 text-sm font-black ring-1 ${toneClass}`}>{label}</span>;
}

function TemplateEditor({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      {label}
      <textarea
        className="min-h-20 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-cyan-100"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}
