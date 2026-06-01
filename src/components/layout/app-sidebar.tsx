"use client";

import {
  Banknote,
  BarChart3,
  CalendarCheck,
  Calculator,
  FileText,
  Home,
  Menu,
  MessageSquare,
  Monitor,
  Settings2,
  User,
  Users,
  WalletCards
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AppModule } from "@/config/modules";
import type { Locale } from "@/config/locales";
import { createTranslator, getDictionary } from "@/lib/i18n/dictionaries";
import { canAccessFeature } from "@/lib/tenant/scope";
import type { AppSession } from "@/lib/auth/session";

const navigationItems = [
  { key: "nav.dashboard", href: "dashboard", icon: Home, module: "dashboard", permission: "dashboard.read" },
  { key: "nav.teams", href: "teams", icon: Users, module: "teams", permission: "teams.read" },
  { key: "nav.products", href: "dashboard", icon: Settings2, module: "settings", permission: "settings.manage" },
  { key: "nav.settings", href: "settings", icon: Settings2, module: "settings", permission: "settings.manage" },
  { key: "nav.clients", href: "clients", icon: User, module: "clients", permission: "clients.read" },
  { key: "nav.employees", href: "employees", icon: User, module: "employees", permission: "employees.read" },
  { key: "nav.appointments", href: "appointments", icon: CalendarCheck, module: "appointments", permission: "appointments.read" },
  { key: "nav.invoices", href: "invoices", icon: Banknote, module: "invoices", permission: "invoices.read" },
  { key: "nav.payroll", href: "payroll", icon: WalletCards, module: "payroll", permission: "payroll.read" },
  { key: "nav.calculator", href: "payroll", icon: Calculator, module: "payroll", permission: "payroll.read" },
  { key: "nav.messages", href: "appointments", icon: MessageSquare, module: "messages", permission: "messages.read" },
  { key: "nav.proposals", href: "appointments", icon: FileText, module: "appointments", permission: "appointments.read" },
  { key: "nav.crm", href: "clients", icon: Monitor, module: "crm", permission: "crm.read" },
  { key: "nav.reports", href: "dashboard", icon: BarChart3, module: "reports", permission: "reports.read" }
];

export function AppSidebar({ locale, session }: { locale: Locale; session: AppSession }) {
  const pathname = usePathname();
  const t = createTranslator(getDictionary(locale));

  return (
    <aside className="group/sidebar sticky top-0 block h-screen w-[68px] shrink-0 overflow-hidden border-r border-slate-200 bg-white px-2 py-6 transition-[width] duration-300 ease-out hover:w-[288px]">
      <div className="flex w-[272px] items-center justify-start gap-3 px-1">
        <Link className="flex min-w-0 items-center gap-2" href={`/${locale}/dashboard`}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#31D06C] text-white">
            <BarChart3 aria-hidden="true" className="h-5 w-5" strokeWidth={2.6} />
          </span>
          <span className="min-w-0 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
            <span className="block truncate text-lg font-extrabold leading-5 tracking-tight text-slate-600">{t("app.name")}</span>
            <span className="block truncate text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">{t("app.tagline")}</span>
          </span>
        </Link>
        <button className="ml-auto rounded-md p-1.5 text-slate-500 opacity-0 transition-opacity duration-200 hover:bg-slate-100 group-hover/sidebar:opacity-100" type="button" aria-label={t("nav.menu")}>
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-9 px-4 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">{t("nav.menu")}</div>

      <nav className="mt-4 grid w-[272px] gap-2">
        <button className="mb-3 grid h-10 w-12 place-items-center rounded-md text-slate-500 group-hover/sidebar:hidden" type="button" aria-label={t("nav.menu")}>
          <Menu className="h-5 w-5" />
        </button>
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === `/${locale}/${item.href}`;
          const access = canAccessFeature({
            tenant: session.tenant,
            role: session.role,
            module: item.module as AppModule,
            permission: item.permission
          });

          return (
            <Link
              aria-disabled={!access.allowed}
              className={`flex h-11 w-12 items-center justify-start rounded-lg px-3 text-sm font-semibold transition-all duration-200 group-hover/sidebar:w-full group-hover/sidebar:gap-3 group-hover/sidebar:px-4 ${
                !access.allowed
                  ? "pointer-events-none text-slate-300"
                  : isActive
                    ? "bg-emerald-50 text-slate-950"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
              href={`/${locale}/${item.href}`}
              key={item.key}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={1.9} />
              <span className="truncate opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">{t(item.key)}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
