import { PageHeader } from "@/components/layout/page-header";
import { createTranslator, getDictionary } from "@/lib/i18n/dictionaries";
import { ClientsManager, type ClientsLabels } from "@/modules/clients/clients-manager";

export default async function ClientsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);
  const t = createTranslator(dictionary);
  const clientLabels = {
    ...dictionary.clients,
    cancel: t("common.cancel"),
    delete: t("common.delete"),
    details: t("common.details"),
    edit: t("common.edit"),
    saveChanges: t("common.saveChanges")
  } as ClientsLabels;

  return (
    <div className="grid gap-6">
      <PageHeader
        title={t("clients.title")}
        subtitle={t("clients.subtitle")}
      />
      <ClientsManager
        locale={locale}
        labels={clientLabels}
      />
    </div>
  );
}
