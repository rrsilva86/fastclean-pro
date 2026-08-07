import { createTranslator, getDictionary } from "@/lib/i18n/dictionaries";
import { InvoicesManager } from "@/modules/invoices/invoices-manager";

export default async function InvoicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);
  const t = createTranslator(dictionary);

  return (
    <InvoicesManager
      labels={{
        ...dictionary.invoices,
        amount: t("common.amount"),
        cancel: t("common.cancel"),
        customer: t("common.client"),
        date: t("common.date"),
        delete: t("common.delete"),
        saveChanges: t("common.saveChanges"),
        status: t("common.status"),
        viewAll: t("common.viewAll")
      }}
    />
  );
}
