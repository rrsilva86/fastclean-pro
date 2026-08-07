import { getDictionary } from "@/lib/i18n/dictionaries";
import { PublicEstimatePage } from "@/modules/proposals/public-estimate-page";

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

export default async function LocalizedEstimatePublicPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  const dictionary = getDictionary(locale);

  return <PublicEstimatePage labels={flattenLabels(dictionary.proposals)} token={token} />;
}
