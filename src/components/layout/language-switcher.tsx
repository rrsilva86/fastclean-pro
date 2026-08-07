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
  const currentPathname = pathname ?? `/${currentLocale}`;

  function getLocalizedPath(nextLocale: Locale) {
    const segments = currentPathname.split("/");
    if (locales.includes(segments[1] as Locale)) {
      segments[1] = nextLocale;
      return segments.join("/") || `/${nextLocale}`;
    }

    return `/${nextLocale}${currentPathname}`;
  }

  return (
    <div className="relative">
      <button
        aria-label={label}
        className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-base shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {localeFlags[currentLocale]}
      </button>
      {open ? (
        <div className="absolute left-0 top-10 z-30 grid gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-premium">
          {locales.map((item) => (
            <Link
              aria-label={`${label}: ${item}`}
              className="grid h-8 w-8 place-items-center rounded-md text-base transition hover:bg-cyan-50"
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
