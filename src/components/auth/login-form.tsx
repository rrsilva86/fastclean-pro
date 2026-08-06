"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Input } from "@/components/design-system";
import { findUserByCredentialsWithOverrides, readRemoteEmailOverrides, readRemotePasswordOverrides } from "@/lib/auth/app-users";
import { initialPlatformAccounts } from "@/lib/platform/platform-accounts";
import { buildScopedStorageKey } from "@/lib/storage/local-records";

type LoginLabels = {
  email: string;
  password: string;
  rememberLanguage: string;
  forgotPassword: string;
  signIn: string;
  invalidLogin: string;
  noAccount: string;
  createAccount: string;
};

const resetVersion = "tenant-scoped-clean-company-v1";
const operationalStorageKeys = [
  "fastclean_clients",
  "fastclean_appointments",
  "fastclean_employees",
  "fastclean_teams",
  "fastclean_system_settings",
  "fastclean_signup"
];

export function LoginForm({ labels, locale }: { labels: LoginLabels; locale: string }) {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    if (window.localStorage.getItem("fastclean_reset_version") === resetVersion) {
      return;
    }

    window.localStorage.setItem("fastclean_platform_accounts", JSON.stringify(initialPlatformAccounts));
    window.localStorage.setItem("fastclean_reset_version", resetVersion);
  }, []);

  function resetCompanyData(sessionToken: string) {
    operationalStorageKeys.forEach((key) => window.localStorage.removeItem(buildScopedStorageKey(key, sessionToken)));
  }

  function companyIsBlocked(sessionToken: string) {
    const accounts = JSON.parse(window.localStorage.getItem("fastclean_platform_accounts") ?? "[]") as Array<{ id: string; billingStatus: string }>;
    const companyAccount = accounts.find((item) => item.id === sessionToken);

    return sessionToken.startsWith("tenant_") && (!companyAccount || companyAccount.billingStatus === "suspended" || companyAccount.billingStatus === "deleted");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const passwordOverrides = await readRemotePasswordOverrides();
    const emailOverrides = await readRemoteEmailOverrides();
    const account = await findUserByCredentialsWithOverrides(email, password, passwordOverrides, emailOverrides);

    if (!account) {
      setError(labels.invalidLogin);
      return;
    }

    if (companyIsBlocked(account.sessionToken)) {
      setError(labels.invalidLogin);
      return;
    }

    const companyResetKey = `fastclean_reset_${account.sessionToken}_${resetVersion}`;
    if (account.sessionToken === "tenant_raisa_cleaning" && window.localStorage.getItem(companyResetKey) !== "done") {
      resetCompanyData(account.sessionToken);
      window.localStorage.setItem(companyResetKey, "done");
    }

    document.cookie = `fastclean_session=${account.sessionToken}; path=/; max-age=86400; SameSite=Lax`;
    document.cookie = `fastclean_user_email=${encodeURIComponent(account.email)}; path=/; max-age=86400; SameSite=Lax`;
    document.cookie = `fastclean_role=${account.role}; path=/; max-age=86400; SameSite=Lax`;
    document.cookie = `fastclean_plan=${account.planCode}; path=/; max-age=86400; SameSite=Lax`;
    document.cookie = `fastclean_company=${encodeURIComponent(account.companyName)}; path=/; max-age=86400; SameSite=Lax`;
    document.cookie = `fastclean_platform_admin=${account.isPlatformAdmin ? "true" : "false"}; path=/; max-age=86400; SameSite=Lax`;
    router.push(account.isPlatformAdmin ? `/${locale}/admin` : `/${locale}/dashboard`);
    router.refresh();
  }

  return (
    <form className="mt-7 grid gap-4" onSubmit={handleSubmit}>
      <Input label={labels.email} name="email" type="email" />
      <Input label={labels.password} name="password" type="password" />
      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-slate-600">
          <input className="h-4 w-4 rounded border-app-border text-primary" type="checkbox" />
          {labels.rememberLanguage}
        </label>
        <span className="font-semibold text-primary">{labels.forgotPassword}</span>
      </div>
      {error ? <div className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-600 ring-1 ring-red-100">{error}</div> : null}
      <Button className="h-12 rounded-xl text-base" type="submit">{labels.signIn}</Button>
      <p className="text-center text-sm font-semibold text-slate-500">
        {labels.noAccount}{" "}
        <Link className="font-black text-secondary underline-offset-4 hover:underline" href={`/${locale}/start`}>
          {labels.createAccount}
        </Link>
      </p>
    </form>
  );
}
