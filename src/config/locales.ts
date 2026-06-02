export const locales = ["en", "pt", "es"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "pt";

export const localeLabels: Record<Locale, string> = {
  en: "English",
  pt: "Português",
  es: "Español"
};
