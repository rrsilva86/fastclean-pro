import Link from "next/link";
import { ChevronLeft, ChevronRight, MapPinned, Plus } from "lucide-react";
import { Badge, Button, Card, CardContent } from "@/components/design-system";
import { PageHeader } from "@/components/layout/page-header";
import { createTranslator, getDictionary } from "@/lib/i18n/dictionaries";

type CalendarCleaning = {
  date: string;
  time: string;
  client: string;
  status: "calendar.scheduled" | "calendar.onTheWay" | "calendar.started" | "calendar.finished" | "calendar.paid";
  tone: "blue" | "orange" | "yellow" | "green" | "teal";
  price: string;
};

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonth(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }

  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function createMonthDays(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const leadingDays = firstDay.getDay();

  return [
    ...Array.from({ length: leadingDays }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(monthDate.getFullYear(), monthDate.getMonth(), index + 1))
  ];
}

function createCleanings(monthDate: Date): CalendarCleaning[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const makeDate = (day: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return [
    { date: makeDate(3), time: "8:00", client: "Ana Martins", status: "calendar.scheduled", tone: "blue", price: "$180" },
    { date: makeDate(7), time: "9:30", client: "Julia Costa", status: "calendar.onTheWay", tone: "orange", price: "$145" },
    { date: makeDate(12), time: "11:00", client: "Carla Gomez", status: "calendar.started", tone: "yellow", price: "$230" },
    { date: makeDate(18), time: "13:00", client: "Mia Johnson", status: "calendar.finished", tone: "green", price: "$210" },
    { date: makeDate(24), time: "15:30", client: "Sofia Reyes", status: "calendar.paid", tone: "teal", price: "$165" },
    { date: makeDate(24), time: "16:30", client: "Emma Wilson", status: "calendar.scheduled", tone: "blue", price: "$155" }
  ];
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default async function CalendarPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { locale } = await params;
  const { month } = await searchParams;
  const t = createTranslator(getDictionary(locale));
  const selectedMonth = parseMonth(month);
  const monthDays = createMonthDays(selectedMonth);
  const cleanings = createCleanings(selectedMonth);
  const monthTitle = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(selectedMonth);
  const weekdayLabels = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(2026, 1, index + 1);
    return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date);
  });
  const nextMonths = [0, 1, 2, 3].map((offset) => addMonths(selectedMonth, offset));

  return (
    <div className="grid gap-6">
      <PageHeader
        title={t("calendar.title")}
        subtitle={t("calendar.subtitle")}
        action={
          <Button>
            <Plus className="h-4 w-4" />
            {t("appointments.newAppointment")}
          </Button>
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {["calendar.day", "calendar.week", "calendar.month"].map((key) => (
            <Badge key={key} tone={key === "calendar.month" ? "blue" : "gray"}>
              {t(key)}
            </Badge>
          ))}
        </div>
        <Button variant="outline">
          <MapPinned className="h-4 w-4" />
          {t("calendar.routeReady")}
        </Button>
      </div>
      <Card>
        <CardContent className="grid gap-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{t("calendar.scheduledCleanings")}</p>
              <h2 className="mt-1 text-2xl font-black capitalize text-slate-950">{monthTitle}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                aria-label={t("calendar.previousMonth")}
                className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50"
                href={`/${locale}/calendar?month=${monthKey(addMonths(selectedMonth, -1))}`}
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
              {nextMonths.map((item) => (
                <Link
                  className={`rounded-xl border px-4 py-2 text-sm font-black capitalize transition ${
                    monthKey(item) === monthKey(selectedMonth)
                      ? "border-cyan-200 bg-cyan-50 text-cyan-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-cyan-200 hover:bg-cyan-50"
                  }`}
                  href={`/${locale}/calendar?month=${monthKey(item)}`}
                  key={monthKey(item)}
                >
                  {new Intl.DateTimeFormat(locale, { month: "short" }).format(item)}
                </Link>
              ))}
              <Link
                aria-label={t("calendar.nextMonth")}
                className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50"
                href={`/${locale}/calendar?month=${monthKey(addMonths(selectedMonth, 1))}`}
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="grid min-w-[760px] grid-cols-7 gap-2">
              {weekdayLabels.map((weekday) => (
                <div className="px-2 py-2 text-center text-xs font-black uppercase tracking-wide text-slate-400" key={weekday}>
                  {weekday}
                </div>
              ))}
              {monthDays.map((day, index) => {
                const dayCleanings = day ? cleanings.filter((cleaning) => cleaning.date === formatDateKey(day)) : [];

                return (
                  <div
                    className={`min-h-36 rounded-xl border p-2 transition ${
                      day ? "border-slate-100 bg-slate-50/70 hover:border-cyan-100 hover:bg-cyan-50/30" : "border-transparent bg-transparent"
                    }`}
                    key={day ? formatDateKey(day) : `empty-${index}`}
                  >
                    {day ? <p className="text-sm font-black text-slate-700">{day.getDate()}</p> : null}
                    <div className="mt-2 grid gap-1.5">
                      {dayCleanings.slice(0, 2).map((cleaning) => (
                        <div className="rounded-lg border border-slate-100 bg-white p-2 shadow-sm" key={`${cleaning.client}-${cleaning.time}`}>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[11px] font-black text-slate-500">{cleaning.time}</span>
                            <span className="text-[11px] font-black text-slate-900">{cleaning.price}</span>
                          </div>
                          <p className="mt-1 truncate text-xs font-black text-slate-950">{cleaning.client}</p>
                          <div className="mt-1">
                            <Badge tone={cleaning.tone}>{t(cleaning.status)}</Badge>
                          </div>
                        </div>
                      ))}
                      {dayCleanings.length > 2 ? (
                        <p className="text-xs font-black text-primary">
                          +{dayCleanings.length - 2} {t("calendar.moreJobs")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
