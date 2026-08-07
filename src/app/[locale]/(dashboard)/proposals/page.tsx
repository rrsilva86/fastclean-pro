import { createTranslator, getDictionary } from "@/lib/i18n/dictionaries";
import { ProposalsManager } from "@/modules/proposals/proposals-manager";

type TranslationTree = string | { [key: string]: TranslationTree };

function flattenLabels(value: { [key: string]: TranslationTree }, prefix = ""): Record<string, string> {
  return Object.entries(value).reduce<Record<string, string>>((labels, [key, nestedValue]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (typeof nestedValue === "string") {
      labels[nextKey] = nestedValue;
      return labels;
    }
    return { ...labels, ...flattenLabels(nestedValue, nextKey) };
  }, {});
}

export default async function ProposalsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);
  const t = createTranslator(dictionary);

  return (
    <ProposalsManager
      labels={{
        ...flattenLabels(dictionary.proposals),
        actions: t("common.actions"),
        amount: t("common.amount"),
        cancel: t("common.cancel"),
        customer: t("common.client"),
        date: t("common.date"),
        delete: t("common.delete"),
        email: t("proposals.email"),
        phone: t("proposals.phone"),
        saveChanges: t("common.saveChanges"),
        status: t("common.status"),
        total: t("proposals.total")
      }}
    />
  );
}
