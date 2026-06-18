"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Input } from "@/components/design-system";
import type { RoleCode } from "@/lib/permissions/permissions";

const demoRoles: RoleCode[] = ["owner", "manager", "office", "driver", "helper"];

type DemoLoginLabels = {
  email: string;
  password: string;
  demoUser: string;
  rememberLanguage: string;
  forgotPassword: string;
  signIn: string;
  demoHint: string;
  demoError: string;
  noAccount: string;
  createAccount: string;
  roles: Record<RoleCode, string>;
};

export function DemoLoginForm({ labels, locale }: { labels: DemoLoginLabels; locale: string }) {
  const router = useRouter();
  const [role, setRole] = useState<RoleCode>("owner");
  const [error, setError] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      setError(labels.demoError);
      return;
    }

    document.cookie = "fastclean_session=demo; path=/; max-age=86400; SameSite=Lax";
    document.cookie = `fastclean_role=${role}; path=/; max-age=86400; SameSite=Lax`;
    router.push(`/${locale}/dashboard`);
    router.refresh();
  }

  return (
    <form className="mt-7 grid gap-4" onSubmit={handleSubmit}>
      <Input defaultValue="owner@fastcleanpro.com" label={labels.email} name="email" type="email" />
      <Input defaultValue="demo123" label={labels.password} name="password" type="password" />
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        {labels.demoUser}
        <select
          className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-cyan-100"
          onChange={(event) => setRole(event.target.value as RoleCode)}
          value={role}
        >
          {demoRoles.map((item) => (
            <option key={item} value={item}>
              {labels.roles[item]}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-slate-600">
          <input className="h-4 w-4 rounded border-app-border text-primary" type="checkbox" />
          {labels.rememberLanguage}
        </label>
        <span className="font-semibold text-primary">{labels.forgotPassword}</span>
      </div>
      {error ? <div className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-600 ring-1 ring-red-100">{error}</div> : null}
      <Button className="h-12 rounded-xl text-base" type="submit">{labels.signIn}</Button>
      <p className="text-center text-xs font-semibold text-slate-400">{labels.demoHint}</p>
      <p className="text-center text-sm font-semibold text-slate-500">
        {labels.noAccount}{" "}
        <Link className="font-black text-secondary underline-offset-4 hover:underline" href={`/${locale}/start`}>
          {labels.createAccount}
        </Link>
      </p>
    </form>
  );
}
