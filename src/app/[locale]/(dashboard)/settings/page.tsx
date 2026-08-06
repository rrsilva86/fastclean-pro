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
          saveSettings: t("settings.saveSettings"),
          highLevelSmsTest: t("settings.highLevelSmsTest"),
          highLevelSmsTestDescription: t("settings.highLevelSmsTestDescription"),
          highLevelTestName: t("settings.highLevelTestName"),
          highLevelTestPhone: t("settings.highLevelTestPhone"),
          highLevelTestEmail: t("settings.highLevelTestEmail"),
          highLevelTestMessage: t("settings.highLevelTestMessage"),
          sendHighLevelTestSms: t("settings.sendHighLevelTestSms"),
          highLevelSmsSent: t("settings.highLevelSmsSent"),
          highLevelSmsMissingConfig: t("settings.highLevelSmsMissingConfig"),
          highLevelSmsFailed: t("settings.highLevelSmsFailed"),
          security: t("settings.security"),
          securityDescription: t("settings.securityDescription"),
          currentLoginEmail: t("settings.currentLoginEmail"),
          newLoginEmail: t("settings.newLoginEmail"),
          changeEmail: t("settings.changeEmail"),
          emailUpdated: t("settings.emailUpdated"),
          emailInvalid: t("settings.emailInvalid"),
          emailInUse: t("settings.emailInUse"),
          currentPassword: t("settings.currentPassword"),
          newPassword: t("settings.newPassword"),
          confirmPassword: t("settings.confirmPassword"),
          changePassword: t("settings.changePassword"),
          passwordUpdated: t("settings.passwordUpdated"),
          passwordMismatch: t("settings.passwordMismatch"),
          passwordTooShort: t("settings.passwordTooShort"),
          currentPasswordInvalid: t("settings.currentPasswordInvalid"),
          messageTemplates: t("settings.messageTemplates"),
          messageTemplatesDescription: t("settings.messageTemplatesDescription"),
          appointmentNoticeTemplate: t("settings.appointmentNoticeTemplate"),
          arrivalNoticeTemplate: t("settings.arrivalNoticeTemplate"),
          departureNoticeTemplate: t("settings.departureNoticeTemplate"),
          invoiceNoticeTemplate: t("settings.invoiceNoticeTemplate"),
          templateVariables: t("settings.templateVariables")
        }}
      />
    </div>
  );
}
