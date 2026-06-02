import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { Award } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { VersionBadge } from "@/components/layout/version-badge";
import { getDictionary, createTranslator } from "@/lib/i18n/dictionaries";
import { createAppSession } from "@/lib/auth/session";
import type { RoleCode } from "@/lib/permissions/permissions";
import type { PlanCode } from "@/lib/plans/plans";
import type { Locale } from "@/config/locales";

export default async function DashboardLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = createTranslator(getDictionary(locale));
  const safeLocale = locale as Locale;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("fastclean_session")?.value;
  const userEmail = cookieStore.get("fastclean_user_email")?.value ? decodeURIComponent(cookieStore.get("fastclean_user_email")?.value ?? "") : undefined;
  const role = (cookieStore.get("fastclean_role")?.value ?? "owner") as RoleCode;
  const planCode = (cookieStore.get("fastclean_plan")?.value ?? "professional") as PlanCode;
  const companyName = cookieStore.get("fastclean_company")?.value ? decodeURIComponent(cookieStore.get("fastclean_company")?.value ?? "") : undefined;
  const session = createAppSession({ companyName, planCode, role, sessionToken, userEmail });

  return (
    <div className="flex min-h-screen bg-app-background">
      <AppSidebar locale={safeLocale} session={session} />
      <main className="min-w-0 flex-1">
        <header className="flex flex-col items-start justify-between gap-3 px-5 py-5 sm:flex-row sm:items-center lg:px-8">
          <div className="flex items-center gap-2">
            <LanguageSwitcher label={t("common.changeLanguage")} locale={safeLocale} />
            <button className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 shadow-soft transition hover:border-cyan-200 hover:bg-cyan-50" type="button">
              <Award className="h-4 w-4" />
              {t("common.upgrade")}
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-slate-900">{session.name}</p>
              <p className="text-xs text-slate-500">
                {t("common.tenant")}: {session.tenant.tenantId}
              </p>
            </div>
            <div className="flex max-w-full flex-wrap gap-2 text-xs font-bold text-slate-600 sm:justify-end">
              <span className="rounded-full bg-cyan-50 px-3 py-1.5 text-cyan-700 ring-1 ring-cyan-100">
                {t("common.plan")}: {session.tenant.planCode}
              </span>
              <span className="rounded-full bg-slate-50 px-3 py-1.5 text-slate-600 ring-1 ring-slate-100">
                {t("employees.role")}: {t(`roles.${session.role}`)}
              </span>
              <span className="max-w-full truncate rounded-full bg-teal-50 px-3 py-1.5 text-teal-700 ring-1 ring-teal-100">
                {t("common.location")}: {session.tenant.activeLocationId}
              </span>
            </div>
            <LogoutButton label={t("nav.logout")} locale={locale} />
          </div>
        </header>
        <div className="px-5 pb-8 lg:px-8">{children}</div>
        <footer className="px-5 pb-5 text-right lg:px-8">
          <VersionBadge />
        </footer>
      </main>
    </div>
  );
}
