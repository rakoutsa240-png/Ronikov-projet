import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { setLang, t, tServer } from './i18n';
import { EN } from './locales/en';

// Every literal t('…') in the app, read from the source files.
function literalKeys(dir: string): string[] {
  const keys: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name !== 'locales' && name !== 'test') keys.push(...literalKeys(path));
    } else if (/\.tsx?$/.test(name) && !name.includes('.test.')) {
      const source = readFileSync(path, 'utf8');
      for (const m of source.matchAll(/\bt\(\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g)) {
        keys.push(m[1].slice(1, -1).replace(/\\(['"])/g, '$1'));
      }
    }
  }
  return keys;
}

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('English texts', () => {
  afterEach(() => setLang('fr'));

  it('translates every text of the site', () => {
    const missing = [...new Set(literalKeys('src'))].filter((key) => !(key in EN) && key !== 'fr');
    expect(missing).toEqual([]);
  });

  it('keeps the same placeholders as the French', () => {
    const wrong = Object.entries(EN).filter(([fr, en]) => placeholders(fr).join() !== placeholders(en).join());
    expect(wrong).toEqual([]);
  });

  it('stays in French until English is chosen, and remembers the choice', () => {
    expect(t('Réserver')).toBe('Réserver');
    setLang('en');
    expect(t('Réserver')).toBe('Book');
    expect(t("{n} min d'attente", { n: 5 })).toBe('5 min wait');
    expect(document.documentElement.lang).toBe('en');
    expect(localStorage.getItem('ronikov.lang')).toBe('"en"');
    setLang('fr');
    expect(t("{n} min d'attente", { n: 5 })).toBe("5 min d'attente");
  });

  it('translates messages written by the server', () => {
    setLang('en');
    expect(tServer('Numéro ou mot de passe incorrect')).toBe('Wrong number or password');
    expect(tServer('CODE VALIDE ET CONFIRMÉ ! Vous pouvez distribuer 20L de Gazole (Diesel).')).toBe(
      'CODE VALID AND CONFIRMED! You can dispense 20 L of Diesel.',
    );
    expect(tServer('Votre ticket de 10 L Super Sans Plomb est actif chez Total Bè pendant 2 h.')).toBe(
      'Your 10 L Unleaded petrol ticket is active at Total Bè for 2 h.',
    );
    expect(tServer('Signalement : Plus de Gazole')).toBe('Report: No more diesel');
    expect(tServer('Bravo ! Vos 200 L servis vous rapportent un bon d’essence de 1 000 FCFA, valable 60 jours.')).toBe(
      'Well done! Your 200 L served earn you a 1 000 FCFA fuel voucher, valid 60 days.',
    );
    expect(tServer('Total Bè vous offre un bon d’essence de 2 000 FCFA, valable dans cette station. Utilisez-le à votre prochaine réservation.')).toBe(
      'Total Bè gives you a 2 000 FCFA fuel voucher, valid at this station. Use it on your next booking.',
    );
    expect(tServer('Un texte inconnu')).toBe('Un texte inconnu');
  });
});
