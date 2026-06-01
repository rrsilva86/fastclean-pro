import { Badge, Button, Card, CardContent, CardHeader, StatCard } from "@/components/design-system";
import { PageHeader } from "@/components/layout/page-header";
import { createTranslator, getDictionary } from "@/lib/i18n/dictionaries";
import { CalendarDays, CreditCard, FileText, Home, KeyRound, MapPin, TrendingUp, UserRound } from "lucide-react";

export default async function ClientProfilePage({ params }: { params: Promise<{ locale: string; clientId: string }> }) {
  const { locale } = await params;
  const t = createTranslator(getDictionary(locale));
  const stats = [
    { label: "clients.lifetimeValue", value: "$8,420", detail: "42 visits", icon: TrendingUp, tone: "cyan" },
    { label: "clients.price", value: "$180", detail: "Weekly cleaning", icon: CreditCard, tone: "teal" },
    { label: "clients.nextCleaning", value: "Jun 2", detail: "Team A", icon: CalendarDays, tone: "green" }
  ] as const;

  return (
    <div className="grid gap-6">
      <PageHeader
        title={t("clients.profileTitle")}
        subtitle={t("clients.profileSubtitle")}
        action={<Button variant="outline">{t("appointments.newAppointment")}</Button>}
      />
      <Card>
        <CardContent className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-cyan-50 text-cyan-600 ring-1 ring-cyan-100">
              <Home className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-950">Ana Martins</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">2,100 sq ft · 3 bedrooms · 2 bathrooms</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="teal">VIP</Badge>
                <Badge tone="green">Weekly</Badge>
                <Badge tone="orange">Gate code</Badge>
              </div>
            </div>
          </div>
          <div className="grid gap-2 text-sm font-bold text-slate-500">
            <span>ana@example.com</span>
            <span>(555) 010-2222</span>
            <span>Boston, MA 02118</span>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        {stats.map((stat) => (
          <StatCard detail={stat.detail} icon={stat.icon} key={stat.label} label={t(stat.label)} tone={stat.tone} value={stat.value} />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <Card>
          <CardHeader>
            <h2 className="text-base font-black text-slate-950">{t("clients.overview")}</h2>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {[
              ["clients.cleaningHistory", "42 completed cleanings"],
              ["clients.billing", "$0 outstanding"],
              ["clients.documents", "3 files stored"],
              ["clients.priceHistory", "Last increase 18 months ago"]
            ].map(([label, value]) => (
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4" key={label}>
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">{t(label)}</p>
                <p className="mt-2 text-sm font-black text-slate-950">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-warning" />
              <h2 className="text-base font-black text-slate-950">{t("clients.securityAccess")}</h2>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="rounded-xl bg-orange-50 p-4 text-sm font-bold text-orange-700 ring-1 ring-orange-100">{t("clients.gateCodeProtected")}</div>
            <div className="rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-600 ring-1 ring-slate-100">{t("clients.alarmCodeHidden")}</div>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-secondary" />
              <h2 className="text-base font-black text-slate-950">{t("clients.paymentInformation")}</h2>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="rounded-xl bg-teal-50 p-4 text-sm font-bold text-teal-700 ring-1 ring-teal-100">{t("clients.primaryPaymentMethod")}: Zelle</div>
            <div className="rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-600 ring-1 ring-slate-100">{t("clients.secondaryPaymentMethod")}: Credit Card</div>
            <div className="rounded-xl bg-white p-4 text-sm font-bold text-slate-600 ring-1 ring-slate-100">{t("clients.paymentNotes")}: Prefers SMS reminders.</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-primary" />
              <h2 className="text-base font-black text-slate-950">{t("clients.leadInformation")}</h2>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="rounded-xl bg-cyan-50 p-4 text-sm font-bold text-cyan-700 ring-1 ring-cyan-100">{t("clients.leadProfile")}: Residential recurring</div>
            <div className="rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-600 ring-1 ring-slate-100">{t("clients.leadSource")}: Referral</div>
            <div className="rounded-xl bg-white p-4 text-sm font-bold text-slate-600 ring-1 ring-slate-100">{t("clients.referralClient")}: Julia Costa</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-success" />
              <h2 className="text-base font-black text-slate-950">{t("clients.addAddress")}</h2>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            {["Main home · 210 Beacon St · Boston, MA", "Lake house · 18 Harbor Rd · Newton, MA"].map((address) => (
              <div className="rounded-xl bg-green-50 p-4 text-sm font-bold text-green-700 ring-1 ring-green-100" key={address}>
                {address}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h2 className="text-base font-black text-slate-950">{t("clients.cleaningHistory")}</h2>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          {["Finished cleaning · May 26 · $180", "Invoice paid · May 27 · Credit Card", "Next cleaning scheduled · Jun 2 · Team A"].map((item) => (
            <div className="rounded-xl border border-slate-100 bg-white p-4 text-sm font-bold text-slate-700 transition hover:border-cyan-100" key={item}>
              {item}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
