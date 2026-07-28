import type { BookingWidgetLabels } from "../types.js";
import { en } from "./en.js";
import { fr } from "./fr.js";

// Only fr/en ship real translations today, an unrecognized lang value (or
// any future third language before it has its own dictionary) falls back
// to English rather than a half-translated widget. Adding a language later
// is one new file here, no signature changes anywhere that calls this.
export const LOCALES: Record<string, BookingWidgetLabels> = { en, fr };

export function resolveLabels(lang: string | undefined, overrides: Partial<BookingWidgetLabels> | undefined): BookingWidgetLabels {
  const base = (lang && LOCALES[lang]) || LOCALES.en;
  return { ...base, ...overrides };
}

// Sensible default date/time formatting locale per language, used only
// when the host doesn't pass an explicit formatLocale, Quebec French by
// default, matching Créno's primary market.
export function defaultFormatLocale(lang: string | undefined): string {
  return lang === "fr" ? "fr-CA" : "en-CA";
}

export { en, fr };
