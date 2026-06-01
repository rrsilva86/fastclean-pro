import { DemoLoginForm } from "@/components/auth/demo-login-form";
import { Card, CardContent } from "@/components/design-system";
import { localeLabels, locales } from "@/config/locales";
import { createTranslator, getDictionary } from "@/lib/i18n/dictionaries";

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = createTranslator(getDictionary(locale));

  return (
    <main className="grid min-h-screen place-items-center bg-app-background p-5">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="mb-6">
            <p className="text-sm font-bold text-primary">{t("app.name")}</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950">{t("auth.loginTitle")}</h1>
            <p className="mt-2 text-sm text-slate-500">{t("auth.loginSubtitle")}</p>
          </div>
          <DemoLoginForm
            labels={{
              email: t("auth.email"),
              password: t("auth.password"),
              demoUser: t("auth.demoUser"),
              rememberLanguage: t("auth.rememberLanguage"),
              forgotPassword: t("auth.forgotPassword"),
              signIn: t("auth.signIn"),
              demoHint: t("auth.demoHint"),
              demoError: t("auth.demoError"),
              roles: {
                owner: t("roles.owner"),
                manager: t("roles.manager"),
                office: t("roles.office"),
                driver: t("roles.driver"),
                helper: t("roles.helper")
              }
            }}
            locale={locale}
          />
          <div className="mt-4">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {t("auth.language")}
              <select className="h-11 rounded-md border border-app-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-cyan-100" defaultValue={locale}>
                {locales.map((item) => (
                  <option key={item} value={item}>
                    {localeLabels[item]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
