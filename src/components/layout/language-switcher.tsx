"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { defaultLocale, locales, type Locale } from "@/config/locales";

const localeFlags: Record<Locale, string> = {
  en: "🇺🇸",
  pt: "🇧🇷",
  es: "🇪🇸"
};

export function LanguageSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const currentLocale = locales.includes(locale) ? locale : defaultLocale;

  function getLocalizedPath(nextLocale: Locale) {
    const segments = pathname.split("/");
    if (locales.includes(segments[1] as Locale)) {
      segments[1] = nextLocale;
      return segments.join("/") || `/${nextLocale}`;
    }

    return `/${nextLocale}${pathname}`;
  }

  return (
    <div className="relative">
      <button
        aria-label={label}
        className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-xl shadow-soft transition hover:border-cyan-200 hover:bg-cyan-50"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {localeFlags[currentLocale]}
      </button>
      {open ? (
        <div className="absolute left-0 top-12 z-30 grid gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-premium">
          {locales.map((item) => (
            <Link
              aria-label={`${label}: ${item}`}
              className="grid h-10 w-10 place-items-center rounded-lg text-xl transition hover:bg-cyan-50"
              href={getLocalizedPath(item)}
              key={item}
              onClick={() => setOpen(false)}
            >
              {localeFlags[item]}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
