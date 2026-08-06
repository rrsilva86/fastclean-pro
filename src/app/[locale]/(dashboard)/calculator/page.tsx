import { PageHeader } from "@/components/layout/page-header";
import { createTranslator, getDictionary } from "@/lib/i18n/dictionaries";
import { PriceCalculator } from "@/modules/calculator/price-calculator";

export default async function CalculatorPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);
  const t = createTranslator(dictionary);

  return (
    <div className="grid gap-6">
      <PageHeader title={t("calculator.title")} subtitle={t("calculator.subtitle")} />
      <PriceCalculator labels={dictionary.calculator} />
    </div>
  );
}
