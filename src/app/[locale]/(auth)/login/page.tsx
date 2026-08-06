import { LoginForm } from "@/components/auth/login-form";
import { BarChart3, CalendarCheck, CreditCard, Download, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { localeLabels, locales } from "@/config/locales";
import { createTranslator, getDictionary } from "@/lib/i18n/dictionaries";
import { VersionBadge } from "@/components/layout/version-badge";

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = createTranslator(getDictionary(locale));

  return (
    <main className="min-h-screen bg-white px-5 py-5">
      <div className="mx-auto flex max-w-7xl justify-end gap-2">
        <VersionBadge />
        {locales.map((item) => (
          <Link
            className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-black transition ${
              item === locale ? "border-secondary bg-teal-50 text-teal-700" : "border-slate-200 bg-white text-slate-500 hover:border-cyan-200 hover:bg-cyan-50"
            }`}
            href={`/${item}/login`}
            key={item}
          >
            <span>{item === "pt" ? "🇧🇷" : item === "es" ? "🇪🇸" : "🇺🇸"}</span>
            {item.toUpperCase()}
          </Link>
        ))}
      </div>

      <div className="mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="mx-auto w-full max-w-md">
          <Link className="flex items-center gap-4" href={`/${locale}/login`}>
            <span className="grid h-16 w-16 place-items-center rounded-full bg-[#31D06C] text-white shadow-glow">
              <BarChart3 className="h-8 w-8" strokeWidth={2.8} />
            </span>
            <span>
              <span className="block text-4xl font-black tracking-tight text-slate-600">{t("app.name")}</span>
              <span className="block text-xs font-black uppercase tracking-[0.28em] text-slate-400">{t("app.tagline")}</span>
            </span>
          </Link>

          <div className="mt-10">
            <h1 className="text-3xl font-black text-slate-700">{t("auth.loginTitle")}</h1>
            <p className="mt-3 text-base font-semibold text-slate-400">{t("auth.loginSubtitle")}</p>
          </div>

          <LoginForm
            labels={{
              email: t("auth.email"),
              password: t("auth.password"),
              rememberLanguage: t("auth.rememberLanguage"),
              forgotPassword: t("auth.forgotPassword"),
              signIn: t("auth.signIn"),
              invalidLogin: t("auth.invalidLogin"),
              noAccount: t("auth.noAccount"),
              createAccount: t("auth.createAccount")
            }}
            locale={locale}
          />
          <nav className="mt-6 flex justify-center gap-4 text-xs font-bold text-slate-400" aria-label={t("install.publicNavigation")}>
            <Link className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 transition hover:bg-cyan-50 hover:text-primary" href="/install">
              <Download className="h-3.5 w-3.5" />
              {t("install.installApp")}
            </Link>
          </nav>
          <p className="sr-only">
            {t("auth.language")}: {localeLabels[locale as keyof typeof localeLabels]}
          </p>
        </section>

        <section className="hidden border-l border-slate-100 pl-10 lg:block">
          <div className="mx-auto max-w-xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-4 py-2 text-sm font-black text-cyan-700 ring-1 ring-cyan-100">
              <Sparkles className="h-4 w-4" />
              {t("auth.heroBadge")}
            </div>
            <h2 className="mt-8 text-4xl font-black tracking-tight text-slate-600">{t("auth.controlTitle")}</h2>

            <div className="relative mx-auto mt-10 h-80 max-w-lg rounded-[2rem] bg-gradient-to-br from-cyan-50 via-teal-50 to-white p-8 shadow-soft">
              <div className="absolute left-10 top-9 rounded-2xl bg-white p-4 text-primary shadow-soft">
                <CalendarCheck className="h-8 w-8" />
              </div>
              <div className="absolute right-12 top-16 rounded-2xl bg-white p-4 text-secondary shadow-soft">
                <Users className="h-8 w-8" />
              </div>
              <div className="absolute bottom-14 left-16 rounded-2xl bg-white p-4 text-warning shadow-soft">
                <CreditCard className="h-8 w-8" />
              </div>
              <div className="absolute bottom-12 right-16 rounded-2xl bg-white p-4 text-success shadow-soft">
                <BarChart3 className="h-8 w-8" />
              </div>
              <div className="grid h-full place-items-center">
                <div className="grid h-40 w-40 place-items-center rounded-full bg-gradient-to-br from-secondary to-primary text-white shadow-premium">
                  <BarChart3 className="h-20 w-20" strokeWidth={2.5} />
                </div>
              </div>
            </div>

            <p className="mx-auto mt-8 max-w-lg text-xl font-semibold leading-relaxed text-slate-600">{t("auth.heroText")}</p>
          </div>
        </section>
      </div>
    </main>
  );
}
