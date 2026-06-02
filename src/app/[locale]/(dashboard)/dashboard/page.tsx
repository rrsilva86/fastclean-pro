import { createTranslator, getDictionary } from "@/lib/i18n/dictionaries";
import { DashboardManager } from "@/modules/dashboard/dashboard-manager";

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = createTranslator(getDictionary(locale));

  return (
    <DashboardManager
      labels={{
        actionQueue: t("dashboard.actionQueue"),
        canceled: t("dashboard.canceled"),
        clientsWithoutNextCleaning: t("dashboard.clientsWithoutNextCleaning"),
        collectedRevenue: t("dashboard.collectedRevenue"),
        completed: t("dashboard.completed"),
        emptyDescription: t("dashboard.emptyDescription"),
        emptyTitle: t("dashboard.emptyTitle"),
        estimatedProfit: t("dashboard.estimatedProfit"),
        expenseBreakdown: t("dashboard.expenseBreakdown"),
        expenseBreakdownDescription: t("dashboard.expenseBreakdownDescription"),
        fixedPayrollExpense: t("dashboard.fixedPayrollExpense"),
        forecast: t("dashboard.forecast"),
        forecastBasedOnScheduledCleanings: t("dashboard.forecastBasedOnScheduledCleanings"),
        hourlyPayrollExpense: t("dashboard.hourlyPayrollExpense"),
        inProgress: t("dashboard.inProgress"),
        jobsToday: t("dashboard.jobsToday"),
        monthlyFinancialForecast: t("dashboard.monthlyFinancialForecast"),
        monthlyFinancialForecastDescription: t("dashboard.monthlyFinancialForecastDescription"),
        monthlyGoal: t("dashboard.monthlyGoal"),
        newLeads: t("dashboard.newLeads"),
        outstandingRevenue: t("dashboard.outstandingRevenue"),
        overdueInvoices: t("dashboard.overdueInvoices"),
        payrollExpenseForecast: t("dashboard.payrollExpenseForecast"),
        pendingPayroll: t("dashboard.pendingPayroll"),
        percentagePayrollExpense: t("dashboard.percentagePayrollExpense"),
        projectedMonthRevenue: t("dashboard.projectedMonthRevenue"),
        revenueBreakdown: t("dashboard.revenueBreakdown"),
        revenueBreakdownDescription: t("dashboard.revenueBreakdownDescription"),
        revenueMonth: t("dashboard.revenueMonth"),
        revenueToday: t("dashboard.revenueToday"),
        revenueWeek: t("dashboard.revenueWeek"),
        scheduledJobs: t("dashboard.scheduledJobs"),
        scheduledRevenue: t("dashboard.scheduledRevenue"),
        subtitle: t("dashboard.subtitle"),
        title: t("dashboard.title"),
        today: t("common.today"),
        routeReady: t("calendar.routeReady")
      }}
      locale={locale}
    />
  );
}
