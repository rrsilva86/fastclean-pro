import { PageHeader } from "@/components/layout/page-header";
import { createTranslator, getDictionary } from "@/lib/i18n/dictionaries";
import { SystemSettingsManager } from "@/modules/settings/system-settings-manager";

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = createTranslator(getDictionary(locale));

  return (
    <div className="grid gap-6">
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />
      <SystemSettingsManager
        labels={{
          appointmentDefaults: t("settings.appointmentDefaults"),
          appointmentEmailEnabled: t("settings.appointmentEmailEnabled"),
          appointmentSmsEnabled: t("settings.appointmentSmsEnabled"),
          arrivalSmsEnabled: t("settings.arrivalSmsEnabled"),
          clientDefaults: t("settings.clientDefaults"),
          defaultEmailOptIn: t("settings.defaultEmailOptIn"),
          defaultJoinedDateToday: t("settings.defaultJoinedDateToday"),
          defaultSmsOptIn: t("settings.defaultSmsOptIn"),
          departureSmsEnabled: t("settings.departureSmsEnabled"),
          invoiceEmailEnabled: t("settings.invoiceEmailEnabled"),
          saved: t("settings.saved"),
          saveSettings: t("settings.saveSettings")
        }}
      />
    </div>
  );
}
