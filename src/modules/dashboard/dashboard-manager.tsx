"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, DollarSign, Target, TrendingDown, TrendingUp, Users, XCircle } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, EmptyState, StatCard } from "@/components/design-system";
import { PageHeader } from "@/components/layout/page-header";
import { readLocalRecords } from "@/lib/storage/local-records";
import { defaultClients, type ClientRecord } from "@/modules/clients/types";

type AppointmentRecord = {
  date: string;
  status: "scheduled" | "started" | "finished" | "paid";
  price: string;
};

type DashboardLabels = {
  actionQueue: string;
  canceled: string;
  clientsWithoutNextCleaning: string;
  collectedRevenue: string;
  completed: string;
  emptyDescription: string;
  emptyTitle: string;
  estimatedProfit: string;
  expenseBreakdown: string;
  expenseBreakdownDescription: string;
  fixedPayrollExpense: string;
  forecast: string;
  forecastBasedOnScheduledCleanings: string;
  hourlyPayrollExpense: string;
  inProgress: string;
  jobsToday: string;
  monthlyFinancialForecast: string;
  monthlyFinancialForecastDescription: string;
  monthlyGoal: string;
  newLeads: string;
  outstandingRevenue: string;
  overdueInvoices: string;
  payrollExpenseForecast: string;
  pendingPayroll: string;
  percentagePayrollExpense: string;
  projectedMonthRevenue: string;
  revenueBreakdown: string;
  revenueBreakdownDescription: string;
  revenueMonth: string;
  revenueToday: string;
  revenueWeek: string;
  scheduledJobs: string;
  scheduledRevenue: string;
  subtitle: string;
  title: string;
  today: string;
  routeReady: string;
};

const appointmentsStorageKey = "fastclean_appointments";
const clientsStorageKey = "fastclean_clients";
const currencyFormatter = new Intl.NumberFormat("en-US", { currency: "USD", maximumFractionDigits: 0, style: "currency" });

function parseMoney(value: string) {
  return Number(value.replace(/[^0-9.-]+/g, "")) || 0;
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function sameMonth(date: string, reference: Date) {
  const [year, month] = date.split("-").map(Number);
  return year === reference.getFullYear() && month === reference.getMonth() + 1;
}

function weekRange(reference: Date) {
  const start = new Date(reference);
  start.setDate(reference.getDate() - reference.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return { end: dateKey(end), start: dateKey(start) };
}

function compactMoney(value: number) {
  if (value === 0) {
    return "$0";
  }

  return value >= 1000 ? `$${(value / 1000).toFixed(1)}k` : currencyFormatter.format(value);
}

function barWidth(value: number, max: number) {
  if (!max) {
    return "0%";
  }

  return `${Math.min(100, Math.round((value / max) * 100))}%`;
}

export function DashboardManager({ labels }: { labels: DashboardLabels; locale: string }) {
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>(defaultClients);
  const today = new Date();
  const todayKey = dateKey(today);
  const { start, end } = weekRange(today);

  useEffect(() => {
    setAppointments(readLocalRecords<AppointmentRecord>(appointmentsStorageKey, []));
    setClients(readLocalRecords<ClientRecord>(clientsStorageKey, defaultClients));
  }, []);

  const todayAppointments = appointments.filter((appointment) => appointment.date === todayKey);
  const weekAppointments = appointments.filter((appointment) => appointment.date >= start && appointment.date <= end);
  const monthAppointments = appointments.filter((appointment) => sameMonth(appointment.date, today));
  const scheduledAppointments = todayAppointments.filter((appointment) => appointment.status === "scheduled");
  const startedAppointments = todayAppointments.filter((appointment) => appointment.status === "started");
  const finishedAppointments = todayAppointments.filter((appointment) => appointment.status === "finished" || appointment.status === "paid");
  const paidMonthAppointments = monthAppointments.filter((appointment) => appointment.status === "paid");
  const openMonthAppointments = monthAppointments.filter((appointment) => appointment.status !== "paid");
  const scheduledRevenue = openMonthAppointments.reduce((total, appointment) => total + parseMoney(appointment.price), 0);
  const collectedRevenue = paidMonthAppointments.reduce((total, appointment) => total + parseMoney(appointment.price), 0);
  const projectedRevenue = collectedRevenue + scheduledRevenue;
  const payrollExpense = 0;
  const estimatedProfit = projectedRevenue - payrollExpense;
  const targetPercent = 0;
  const clientsWithoutNextCleaning = clients.filter((client) => !client.nextCleaning).length;

  const metrics = [
    { label: labels.revenueToday, value: currencyFormatter.format(todayAppointments.reduce((total, appointment) => total + parseMoney(appointment.price), 0)), detail: `${todayAppointments.length} jobs`, icon: DollarSign, tone: "cyan" },
    { label: labels.revenueWeek, value: currencyFormatter.format(weekAppointments.reduce((total, appointment) => total + parseMoney(appointment.price), 0)), detail: `${weekAppointments.length} jobs`, icon: TrendingUp, tone: "teal" },
    { label: labels.revenueMonth, value: currencyFormatter.format(projectedRevenue), detail: `${monthAppointments.length} jobs`, icon: CalendarDays, tone: "green" },
    { label: labels.jobsToday, value: String(todayAppointments.length), detail: `${todayAppointments.length} jobs`, icon: Users, tone: "orange" }
  ] as const;
  const operations = [
    { label: labels.scheduledJobs, value: String(scheduledAppointments.length), tone: "blue", icon: Clock3 },
    { label: labels.inProgress, value: String(startedAppointments.length), tone: "orange", icon: AlertTriangle },
    { label: labels.completed, value: String(finishedAppointments.length), tone: "green", icon: CheckCircle2 },
    { label: labels.canceled, value: "0", tone: "red", icon: XCircle }
  ] as const;
  const actionQueue = [
    [labels.overdueInvoices, "0"],
    [labels.pendingPayroll, "0"],
    [labels.clientsWithoutNextCleaning, String(clientsWithoutNextCleaning)],
    [labels.newLeads, "0"]
  ];
  const forecastBars = [
    { label: labels.collectedRevenue, value: compactMoney(collectedRevenue), width: barWidth(collectedRevenue, projectedRevenue), color: "bg-primary" },
    { label: labels.scheduledRevenue, value: compactMoney(scheduledRevenue), width: barWidth(scheduledRevenue, projectedRevenue), color: "bg-secondary" },
    { label: labels.outstandingRevenue, value: "$0", width: "0%", color: "bg-warning" }
  ];
  const expenseBars = [
    { label: labels.fixedPayrollExpense, value: "$0", width: "0%", color: "bg-danger" },
    { label: labels.percentagePayrollExpense, value: "$0", width: "0%", color: "bg-warning" },
    { label: labels.hourlyPayrollExpense, value: "$0", width: "0%", color: "bg-slate-400" }
  ];

  return (
    <div className="grid gap-6">
      <PageHeader title={labels.title} subtitle={labels.subtitle} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <StatCard detail={metric.detail} icon={metric.icon} key={metric.label} label={metric.label} tone={metric.tone} value={metric.value} />
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
                    <p className="text-sm font-semibold text-slate-500">{item.label}</p>
                    <p className="mt-1 text-2xl font-black text-slate-950">{item.value}</p>
                  </div>
                </div>
                <Badge tone={item.tone}>{labels.today}</Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-black text-slate-950">{labels.monthlyFinancialForecast}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">{labels.monthlyFinancialForecastDescription}</p>
            </div>
            <Badge tone="blue">{labels.forecast}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="rounded-2xl bg-gradient-to-br from-cyan-50 via-white to-teal-50 p-5 ring-1 ring-cyan-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-wide text-cyan-700">{labels.projectedMonthRevenue}</p>
                <p className="mt-3 text-4xl font-black tracking-tight text-slate-950">{currencyFormatter.format(projectedRevenue)}</p>
                <p className="mt-2 text-sm font-semibold text-slate-500">{labels.forecastBasedOnScheduledCleanings}</p>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-cyan-600 shadow-soft ring-1 ring-cyan-100">
                <Target className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-6">
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-wide text-slate-500">
                <span>{labels.monthlyGoal}</span>
                <span>{targetPercent}%</span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-white ring-1 ring-cyan-100">
                <div className="h-full rounded-full bg-primary" style={{ width: `${targetPercent}%` }} />
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="grid gap-4">
              <div>
                <h3 className="text-sm font-black text-slate-950">{labels.revenueBreakdown}</h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">{labels.revenueBreakdownDescription}</p>
              </div>
              {forecastBars.map((item) => (
                <BarRow color={item.color} key={item.label} label={item.label} value={item.value} width={item.width} />
              ))}
            </div>

            <div className="grid gap-4">
              <div>
                <h3 className="text-sm font-black text-slate-950">{labels.expenseBreakdown}</h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">{labels.expenseBreakdownDescription}</p>
              </div>
              {expenseBars.map((item) => (
                <BarRow color={item.color} key={item.label} label={item.label} value={item.value} width={item.width} />
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard label={labels.collectedRevenue} value={currencyFormatter.format(collectedRevenue)} />
            <SummaryCard label={labels.scheduledRevenue} value={currencyFormatter.format(scheduledRevenue)} />
            <SummaryCard label={labels.outstandingRevenue} value="$0" />
            <SummaryCard icon={<TrendingDown className="h-4 w-4 text-danger" />} label={labels.payrollExpenseForecast} tone="red" value={currencyFormatter.format(payrollExpense)} />
            <SummaryCard icon={<TrendingUp className="h-4 w-4 text-success" />} label={labels.estimatedProfit} subValue={projectedRevenue ? `${Math.round((estimatedProfit / projectedRevenue) * 100)}%` : "0%"} tone="green" value={currencyFormatter.format(estimatedProfit)} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-black text-slate-950">{labels.actionQueue}</h2>
            <Badge tone="teal">{labels.routeReady}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {actionQueue.map(([label, value]) => (
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 transition hover:border-cyan-100 hover:bg-cyan-50/40" key={label}>
              <p className="text-sm font-bold text-slate-600">{label}</p>
              <p className="mt-2 text-3xl font-black text-primary">{value}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      {appointments.length === 0 && clients.length === 0 ? <EmptyState title={labels.emptyTitle} description={labels.emptyDescription} /> : null}
    </div>
  );
}

function BarRow({ color, label, value, width }: { color: string; label: string; value: string; width: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black text-slate-700">{label}</p>
        <p className="text-sm font-black text-slate-950">{value}</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width }} />
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, subValue, tone = "default", value }: { icon?: React.ReactNode; label: string; subValue?: string; tone?: "default" | "green" | "red"; value: string }) {
  const toneClass = tone === "red" ? "border-red-100 bg-red-50/50" : tone === "green" ? "border-green-100 bg-green-50/50" : "border-slate-100 bg-white";

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
      </div>
      <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
      {subValue ? <p className="mt-1 text-xs font-bold text-green-600">{subValue}</p> : null}
    </div>
  );
}
