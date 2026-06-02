import { PlatformAdminManager } from "@/modules/admin/platform-admin-manager";
import { createTranslator, getDictionary } from "@/lib/i18n/dictionaries";

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = createTranslator(getDictionary(locale));

  return (
    <PlatformAdminManager
      labels={{
        title: t("admin.title"),
        subtitle: t("admin.subtitle"),
        companies: t("admin.companies"),
        activeSubscriptions: t("admin.activeSubscriptions"),
        complimentaryAccounts: t("admin.complimentaryAccounts"),
        monthlyRevenue: t("admin.monthlyRevenue"),
        company: t("admin.company"),
        owner: t("admin.owner"),
        email: t("admin.email"),
        phone: t("admin.phone"),
        plan: t("admin.plan"),
        billingStatus: t("admin.billingStatus"),
        discount: t("admin.discount"),
        actions: t("admin.actions"),
        details: t("admin.details"),
        activatedAt: t("admin.activatedAt"),
        couponCode: t("admin.couponCode"),
        dataSummary: t("admin.dataSummary"),
        clients: t("admin.clients"),
        appointments: t("admin.appointments"),
        employees: t("admin.employees"),
        teams: t("admin.teams"),
        blockCompany: t("admin.blockCompany"),
        unblockCompany: t("admin.unblockCompany"),
        deleteCompany: t("admin.deleteCompany"),
        resetCompanyData: t("admin.resetCompanyData"),
        suspended: t("admin.suspended"),
        markComplimentary: t("admin.markComplimentary"),
        removeComplimentary: t("admin.removeComplimentary"),
        discountPercent: t("admin.discountPercent"),
        save: t("admin.save"),
        empty: t("admin.empty")
      }}
    />
  );
}
