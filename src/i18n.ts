import { useSyncExternalStore } from 'react';
import { loadJSON, saveJSON } from './storage';
import { EN, EN_PATTERNS } from './locales/en';

// French is the site's language; English is offered as a choice, remembered on the phone.
// Texts are written in French in the code and wrapped in t(): the French sentence is the key of
// its English translation, so a missing translation simply shows the French.
export type Lang = 'fr' | 'en';
const LANG_KEY = 'ronikov.lang';
const listeners = new Set<() => void>();

let lang: Lang = loadJSON<string>(LANG_KEY, 'fr') === 'en' ? 'en' : 'fr';

const applyToPage = () => {
  document.documentElement.lang = lang;
};
applyToPage();

export const getLang = () => lang;

export function setLang(next: Lang) {
  lang = next;
  saveJSON(LANG_KEY, next);
  applyToPage();
  listeners.forEach((listener) => listener());
}

// Re-renders the component when the language changes. App uses it, so the whole page follows.
export function useLang(): Lang {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => lang,
    () => 'fr',
  );
}

// Dates and numbers: "1 500 FCFA, 3 oct." in French, "1,500 FCFA, 3 Oct" in English.
export const locale = () => (lang === 'en' ? 'en-GB' : 'fr-FR');
export const num = (n: number, options?: Intl.NumberFormatOptions) => n.toLocaleString(locale(), options);

type Vars = Record<string, string | number>;
const fill = (text: string, vars?: Vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole)) : text;

// t('Étape {n}', { n: 2 }) → "Étape 2", or "Step 2" in English.
export function t(fr: string, vars?: Vars): string {
  return fill(lang === 'en' ? (EN[fr] ?? fr) : fr, vars);
}

// Texts written by the server (errors, ticket checks, notifications) are French sentences, some with
// names or numbers inside: translated here by exact match, then by pattern.
export function tServer(text: string): string {
  if (lang !== 'en' || !text) return text;
  const exact = EN[text];
  if (exact) return exact;
  for (const [pattern, english] of EN_PATTERNS) {
    const match = text.match(pattern);
    if (match) return typeof english === 'function' ? english(...match.slice(1)) : text.replace(pattern, english);
  }
  return text;
}
