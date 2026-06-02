"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function LogoutButton({ label, locale }: { label: string; locale: string }) {
  const router = useRouter();

  function logout() {
    document.cookie = "fastclean_session=; path=/; max-age=0; SameSite=Lax";
    document.cookie = "fastclean_user_email=; path=/; max-age=0; SameSite=Lax";
    document.cookie = "fastclean_role=; path=/; max-age=0; SameSite=Lax";
    document.cookie = "fastclean_plan=; path=/; max-age=0; SameSite=Lax";
    document.cookie = "fastclean_company=; path=/; max-age=0; SameSite=Lax";
    document.cookie = "fastclean_platform_admin=; path=/; max-age=0; SameSite=Lax";
    router.push(`/${locale}/login`);
    router.refresh();
  }

  return (
    <button
      className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-soft transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
      onClick={logout}
      type="button"
    >
      <LogOut className="h-4 w-4" />
      {label}
    </button>
  );
}
