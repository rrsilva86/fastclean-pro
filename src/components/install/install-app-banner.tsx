"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, X } from "lucide-react";
import { appBranding } from "@/config/branding";

export function InstallAppBanner({ dismissLabel, installLabel, message }: { dismissLabel: string; installLabel: string; message: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
    const dismissedUntil = Number(window.localStorage.getItem("fastclean_install_banner_dismissed_until") ?? "0");

    if (!standalone && Date.now() > dismissedUntil) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    window.localStorage.setItem("fastclean_install_banner_dismissed_until", String(Date.now() + sevenDays));
    setVisible(false);
  }

  if (!visible) {
    return null;
  }

  return (
    <div className="mx-4 mb-4 rounded-xl border border-cyan-100 bg-cyan-50 px-4 py-3 shadow-sm lg:mx-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-black text-cyan-900">{message}</p>
        <div className="flex items-center gap-2">
          <Link className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-black text-white shadow-sm transition hover:bg-cyan-500" href={appBranding.installPath}>
            <Download className="h-3.5 w-3.5" />
            {installLabel}
          </Link>
          <button aria-label={dismissLabel} className="grid h-9 w-9 place-items-center rounded-lg border border-cyan-100 bg-white text-slate-500 transition hover:bg-cyan-50" onClick={dismiss} type="button">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
