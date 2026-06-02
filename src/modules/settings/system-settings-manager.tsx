"use client";

import { useEffect, useState } from "react";
import { Bell, CalendarDays, Save, UserRound } from "lucide-react";
import { Button, Card, CardContent, CardHeader } from "@/components/design-system";
import { buildScopedStorageKey } from "@/lib/storage/local-records";

type SystemSettings = {
  defaultJoinedDateToday: boolean;
  defaultSmsOptIn: boolean;
  defaultEmailOptIn: boolean;
  appointmentSmsEnabled: boolean;
  appointmentEmailEnabled: boolean;
  arrivalSmsEnabled: boolean;
  departureSmsEnabled: boolean;
  invoiceEmailEnabled: boolean;
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
  invoiceEmailEnabled: true
};

function settingFromStorage() {
  if (typeof window === "undefined") {
    return defaultSettings;
  }

  try {
    return { ...defaultSettings, ...JSON.parse(window.localStorage.getItem(buildScopedStorageKey(storageKey)) ?? "{}") } as SystemSettings;
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

  useEffect(() => {
    setSettings(settingFromStorage());
  }, []);

  function updateSetting(key: keyof SystemSettings, value: boolean) {
    setSettings((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  function saveSettings() {
    window.localStorage.setItem(buildScopedStorageKey(storageKey), JSON.stringify(settings));
    setSaved(true);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
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
