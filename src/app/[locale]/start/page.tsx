import { SelfServiceSignup } from "@/modules/sales/self-service-signup";
import { getDictionary, createTranslator } from "@/lib/i18n/dictionaries";

export default async function StartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = createTranslator(getDictionary(locale));

  return (
    <SelfServiceSignup
      locale={locale}
      labels={{
        title: t("sales.title"),
        subtitle: t("sales.subtitle"),
        planStep: t("sales.planStep"),
        companyStep: t("sales.companyStep"),
        paymentStep: t("sales.paymentStep"),
        choosePlan: t("sales.choosePlan"),
        selected: t("sales.selected"),
        companyName: t("sales.companyName"),
        ownerName: t("sales.ownerName"),
        email: t("auth.email"),
        phone: t("clients.phone"),
        cardName: t("sales.cardName"),
        cardNumber: t("sales.cardNumber"),
        expiration: t("sales.expiration"),
        cvc: t("sales.cvc"),
        couponCode: t("sales.couponCode"),
        discountApplied: t("sales.discountApplied"),
        startTrial: t("sales.startTrial"),
        secureCheckout: t("sales.secureCheckout"),
        readyToday: t("sales.readyToday"),
        trialNote: t("sales.trialNote"),
        starterName: t("sales.starterName"),
        starterDescription: t("sales.starterDescription"),
        professionalName: t("sales.professionalName"),
        professionalDescription: t("sales.professionalDescription"),
        businessName: t("sales.businessName"),
        businessDescription: t("sales.businessDescription"),
        perMonth: t("sales.perMonth"),
        requiredError: t("sales.requiredError"),
        features: [
          t("sales.featureScheduling"),
          t("sales.featureClients"),
          t("sales.featureInvoices")
        ]
      }}
    />
  );
}
