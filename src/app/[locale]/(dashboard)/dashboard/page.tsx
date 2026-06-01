import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, DollarSign, Target, TrendingDown, TrendingUp, Users, XCircle } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, EmptyState, StatCard } from "@/components/design-system";
import { PageHeader } from "@/components/layout/page-header";
import { createTranslator, getDictionary } from "@/lib/i18n/dictionaries";

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = createTranslator(getDictionary(locale));
  const metrics = [
    { label: "dashboard.revenueToday", value: "$1,240", detail: "+12% vs yesterday", icon: DollarSign, tone: "cyan" },
    { label: "dashboard.revenueWeek", value: "$8,860", detail: "42 jobs completed", icon: TrendingUp, tone: "teal" },
    { label: "dashboard.revenueMonth", value: "$34,720", detail: "On pace for target", icon: CalendarDays, tone: "green" },
    { label: "dashboard.jobsToday", value: "12", detail: "3 teams in field", icon: Users, tone: "orange" }
  ] as const;
  const operations = [
    { label: "dashboard.scheduledJobs", value: "8", tone: "blue", icon: Clock3 },
    { label: "dashboard.inProgress", value: "3", tone: "orange", icon: AlertTriangle },
    { label: "dashboard.completed", value: "6", tone: "green", icon: CheckCircle2 },
    { label: "dashboard.canceled", value: "1", tone: "red", icon: XCircle }
  ] as const;
  const actionQueue = [
    ["dashboard.overdueInvoices", "4"],
    ["dashboard.pendingPayroll", "2"],
    ["dashboard.clientsWithoutNextCleaning", "11"],
    ["dashboard.newLeads", "7"]
  ];
  const revenueForecast = {
    projected: "$48,900",
    collected: "$34,720",
    scheduled: "$14,180",
    outstanding: "$4,260",
    payrollExpense: "$16,850",
    estimatedProfit: "$32,050",
    profitMargin: "65.5%",
    targetPercent: "82%"
  };
  const forecastBars = [
    { label: "dashboard.collectedRevenue", value: "$34.7k", width: "71%", color: "bg-primary" },
    { label: "dashboard.scheduledRevenue", value: "$14.1k", width: "29%", color: "bg-secondary" },
    { label: "dashboard.outstandingRevenue", value: "$4.2k", width: "9%", color: "bg-warning" }
  ];
  const expenseBars = [
    { label: "dashboard.fixedPayrollExpense", value: "$9.8k", width: "58%", color: "bg-danger" },
    { label: "dashboard.percentagePayrollExpense", value: "$5.4k", width: "32%", color: "bg-warning" },
    { label: "dashboard.hourlyPayrollExpense", value: "$1.6k", width: "10%", color: "bg-slate-400" }
  ];

  return (
    <div className="grid gap-6">
      <PageHeader title={t("dashboard.title")} subtitle={t("dashboard.subtitle")} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <StatCard detail={metric.detail} icon={metric.icon} key={metric.label} label={t(metric.label)} tone={metric.tone} value={metric.value} />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {operations.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label}>
              <CardContent className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-50 text-slate-500 ring-1 ring-slate-100">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-500">{t(item.label)}</p>
                    <p className="mt-1 text-2xl font-black text-slate-950">{item.value}</p>
                  </div>
                </div>
                <Badge tone={item.tone}>{t("common.today")}</Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-black text-slate-950">{t("dashboard.monthlyFinancialForecast")}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">{t("dashboard.monthlyFinancialForecastDescription")}</p>
            </div>
            <Badge tone="blue">{t("dashboard.forecast")}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="rounded-2xl bg-gradient-to-br from-cyan-50 via-white to-teal-50 p-5 ring-1 ring-cyan-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-wide text-cyan-700">{t("dashboard.projectedMonthRevenue")}</p>
                <p className="mt-3 text-4xl font-black tracking-tight text-slate-950">{revenueForecast.projected}</p>
                <p className="mt-2 text-sm font-semibold text-slate-500">{t("dashboard.forecastBasedOnScheduledCleanings")}</p>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-cyan-600 shadow-soft ring-1 ring-cyan-100">
                <Target className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-6">
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-wide text-slate-500">
                <span>{t("dashboard.monthlyGoal")}</span>
                <span>{revenueForecast.targetPercent}</span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-white ring-1 ring-cyan-100">
                <div className="h-full w-[82%] rounded-full bg-primary" />
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="grid gap-4">
              <div>
                <h3 className="text-sm font-black text-slate-950">{t("dashboard.revenueBreakdown")}</h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">{t("dashboard.revenueBreakdownDescription")}</p>
              </div>
              {forecastBars.map((item) => (
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4" key={item.label}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-slate-700">{t(item.label)}</p>
                    <p className="text-sm font-black text-slate-950">{item.value}</p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-100">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: item.width }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-4">
              <div>
                <h3 className="text-sm font-black text-slate-950">{t("dashboard.expenseBreakdown")}</h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">{t("dashboard.expenseBreakdownDescription")}</p>
              </div>
              {expenseBars.map((item) => (
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4" key={item.label}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-slate-700">{t(item.label)}</p>
                    <p className="text-sm font-black text-slate-950">{item.value}</p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-100">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: item.width }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-xl border border-slate-100 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">{t("dashboard.collectedRevenue")}</p>
                <p className="mt-2 text-xl font-black text-slate-950">{revenueForecast.collected}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">{t("dashboard.scheduledRevenue")}</p>
                <p className="mt-2 text-xl font-black text-slate-950">{revenueForecast.scheduled}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">{t("dashboard.outstandingRevenue")}</p>
                <p className="mt-2 text-xl font-black text-slate-950">{revenueForecast.outstanding}</p>
              </div>
              <div className="rounded-xl border border-red-100 bg-red-50/50 p-4">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-danger" />
                  <p className="text-xs font-black uppercase tracking-wide text-red-400">{t("dashboard.payrollExpenseForecast")}</p>
                </div>
                <p className="mt-2 text-xl font-black text-slate-950">{revenueForecast.payrollExpense}</p>
              </div>
              <div className="rounded-xl border border-green-100 bg-green-50/50 p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-success" />
                  <p className="text-xs font-black uppercase tracking-wide text-green-500">{t("dashboard.estimatedProfit")}</p>
                </div>
                <p className="mt-2 text-xl font-black text-slate-950">{revenueForecast.estimatedProfit}</p>
                <p className="mt-1 text-xs font-bold text-green-600">{revenueForecast.profitMargin}</p>
              </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-black text-slate-950">{t("dashboard.actionQueue")}</h2>
            <Badge tone="teal">{t("calendar.routeReady")}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {actionQueue.map(([label, value]) => (
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 transition hover:border-cyan-100 hover:bg-cyan-50/40" key={label}>
              <p className="text-sm font-bold text-slate-600">{t(label)}</p>
              <p className="mt-2 text-3xl font-black text-primary">{value}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <EmptyState title={t("dashboard.emptyTitle")} description={t("dashboard.emptyDescription")} />
    </div>
  );
}
