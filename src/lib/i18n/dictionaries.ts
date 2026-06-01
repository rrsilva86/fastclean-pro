import { defaultLocale, locales, type Locale } from "@/config/locales";
import en from "@/i18n/messages/en.json";
import es from "@/i18n/messages/es.json";
import pt from "@/i18n/messages/pt.json";

const dictionaries = { en, pt, es } as const;

type TranslationValue = string | { [key: string]: TranslationValue };

export type Dictionary = typeof en;

export function getDictionary(locale: string): Dictionary {
  const safeLocale = locales.includes(locale as Locale) ? (locale as Locale) : defaultLocale;
  return dictionaries[safeLocale];
}

export function createTranslator(dictionary: Dictionary) {
  return function translate(path: string) {
    const value = path.split(".").reduce<TranslationValue | undefined>((current, key) => {
      if (current && typeof current === "object" && key in current) {
        return current[key];
      }

      return undefined;
    }, dictionary);

    return typeof value === "string" ? value : path;
  };
}
