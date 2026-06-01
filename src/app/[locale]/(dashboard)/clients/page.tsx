import { PageHeader } from "@/components/layout/page-header";
import { createTranslator, getDictionary } from "@/lib/i18n/dictionaries";
import { ClientsManager } from "@/modules/clients/clients-manager";

export default async function ClientsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = createTranslator(getDictionary(locale));

  return (
    <div className="grid gap-6">
      <PageHeader
        title={t("clients.title")}
        subtitle={t("clients.subtitle")}
      />
      <ClientsManager
        locale={locale}
        labels={{
          addAddress: t("clients.addAddress"),
          addClient: t("clients.addClient"),
          addressDetails: t("clients.addressDetails"),
          addressLabel: t("clients.addressLabel"),
          addressSearch: t("clients.addressSearch"),
          addressVerified: t("clients.addressVerified"),
          birthday: t("clients.birthday"),
          cancel: t("common.cancel"),
          city: t("clients.city"),
          communicationPreferences: t("clients.communicationPreferences"),
          delete: t("common.delete"),
          deleteClient: t("clients.deleteClient"),
          deleteClientConfirm: t("clients.deleteClientConfirm"),
          details: t("common.details"),
          edit: t("common.edit"),
          editClient: t("clients.editClient"),
          email: t("clients.email"),
          emailOptIn: t("clients.emailOptIn"),
          emptyTitle: t("clients.emptyTitle"),
          emptyDescription: t("clients.emptyDescription"),
          joinedDate: t("clients.joinedDate"),
          leadInformation: t("clients.leadInformation"),
          leadProfile: t("clients.leadProfile"),
          leadSource: t("clients.leadSource"),
          name: t("clients.name"),
          nickname: t("clients.nickname"),
          noSecondaryPayment: t("clients.noSecondaryPayment"),
          paymentInformation: t("clients.paymentInformation"),
          paymentNotes: t("clients.paymentNotes"),
          phone: t("clients.phone"),
          postalCode: t("clients.postalCode"),
          primaryPaymentMethod: t("clients.primaryPaymentMethod"),
          property: t("clients.property"),
          referralClient: t("clients.referralClient"),
          saveChanges: t("common.saveChanges"),
          saveClient: t("clients.saveClient"),
          searchAddress: t("clients.searchAddress"),
          secondaryPaymentMethod: t("clients.secondaryPaymentMethod"),
          selectAddress: t("clients.selectAddress"),
          smsOptIn: t("clients.smsOptIn"),
          state: t("clients.state"),
          street: t("clients.street"),
          tag: t("clients.tag"),
          viewProfile: t("clients.viewProfile")
        }}
      />
    </div>
  );
}
