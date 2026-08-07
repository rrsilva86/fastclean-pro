import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { Award } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { VersionBadge } from "@/components/layout/version-badge";
import { InstallAppBanner } from "@/components/install/install-app-banner";
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
  const rawPlanCode = (cookieStore.get("fastclean_plan")?.value ?? "professional") as PlanCode;
  const planCode = sessionToken === "tenant_raisa_cleaning" ? "enterprise" : rawPlanCode;
  const companyName = cookieStore.get("fastclean_company")?.value ? decodeURIComponent(cookieStore.get("fastclean_company")?.value ?? "") : undefined;
  const session = createAppSession({ companyName, planCode, role, sessionToken, userEmail });

  return (
    <div className="flex min-h-screen bg-app-background">
      <AppSidebar locale={safeLocale} session={session} />
      <main className="min-w-0 flex-1">
        <header className="flex flex-col items-start justify-between gap-3 px-4 py-3 sm:flex-row sm:items-center lg:px-5">
          <div className="flex items-center gap-2">
            <LanguageSwitcher label={t("common.changeLanguage")} locale={safeLocale} />
            <VersionBadge compact />
            <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-900 shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50" type="button">
              <Award className="h-3.5 w-3.5" />
              {t("common.upgrade")}
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="hidden sm:block">
              <p className="text-xs font-black text-slate-900">{session.name}</p>
              <p className="text-[11px] font-semibold text-slate-500">
                {t("common.tenant")}: {session.tenant.tenantId}
              </p>
              <div className="mt-1.5">
                <VersionBadge />
              </div>
            </div>
            <div className="flex max-w-full flex-wrap gap-1.5 text-[11px] font-black text-slate-600 sm:justify-end">
              <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-cyan-700 ring-1 ring-cyan-100">
                {t("common.plan")}: {session.tenant.planCode}
              </span>
              <span className="rounded-full bg-slate-50 px-2.5 py-1 text-slate-600 ring-1 ring-slate-100">
                {t("employees.role")}: {t(`roles.${session.role}`)}
              </span>
              <span className="max-w-full truncate rounded-full bg-teal-50 px-2.5 py-1 text-teal-700 ring-1 ring-teal-100">
                {t("common.location")}: {session.tenant.activeLocationId}
              </span>
            </div>
            <LogoutButton label={t("nav.logout")} locale={locale} />
          </div>
        </header>
        <InstallAppBanner dismissLabel={t("install.dismissBanner")} installLabel={t("install.installApp")} message={t("install.bannerMessage")} />
        <div className="px-4 pb-24 lg:px-5 lg:pb-5">{children}</div>
      </main>
    </div>
  );
}
