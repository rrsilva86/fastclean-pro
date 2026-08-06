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
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
      onClick={logout}
      type="button"
    >
      <LogOut className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
