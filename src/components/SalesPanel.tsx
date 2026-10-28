import React, { useEffect, useState } from 'react';
import { BarChart3, Clock, TrendingDown, TrendingUp } from 'lucide-react';
import { api, ApiError } from '../api';
import { FuelType, StationSales } from '../types';
import { locale, num, t } from '../i18n';

interface SalesPanelProps {
  stationId: string;
}

const FUEL_NAMES: Record<FuelType, string> = {
  SUPER: 'Super Sans Plomb',
  GAZOLE: 'Gazole (Diesel)',
  MELANGE: 'Mélange 2 Temps',
  KEROSENE: 'Pétrole / Kérosène',
};

// "+12 %" compared with the period just before; nothing when there was nothing to compare with.
function Trend({ now, before }: { now: number; before: number }) {
  if (before === 0) return null;
  const change = Math.round(((now - before) / before) * 100);
  const up = change >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
      <Icon className="w-3.5 h-3.5" /> {up ? '+' : ''}
      {change} %
    </span>
  );
}

// One bar per item, highest = full height. Hovering or tapping a bar shows its exact value.
function Bars({ items, label }: { items: { key: string; value: number; tip: string; tick?: string }[]; label: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <figure className="space-y-1" aria-label={label}>
      <div className="flex items-end gap-[2px] h-32 border-b border-neutral-700">
        {items.map((i) => (
          <div key={i.key} title={i.tip} className="group relative flex-1 h-full flex items-end">
            <div
              className="w-full rounded-t bg-emerald-500 group-hover:bg-emerald-400 transition-colors"
              style={{ height: `${(i.value / max) * 100}%`, minHeight: i.value > 0 ? 2 : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-[2px] text-[10px] text-neutral-400 tabular-nums">
        {items.map((i) => (
          <span key={i.key} className="flex-1 text-center overflow-visible whitespace-nowrap">
            {i.tick ?? ''}
          </span>
        ))}
      </div>
    </figure>
  );
}

// What the station sold over 7 or 30 days, from the tickets served: for the manager, not the attendants.
export const SalesPanel: React.FC<SalesPanelProps> = ({ stationId }) => {
  const [days, setDays] = useState<7 | 30>(7);
  const [data, setData] = useState<StationSales | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError(null);
    api
      .stationSales(stationId, days, controller.signal)
      .then(setData)
      .catch((e) => !controller.signal.aborted && setError(e instanceof ApiError ? e.message : t('Ventes indisponibles pour le moment.')));
    return () => controller.abort();
  }, [stationId, days]);

  const peak = data && data.tickets > 0 ? data.byHour.reduce((best, h) => (h.tickets > best.tickets ? h : best)) : null;
  const dayLabel = (date: string, style: 'short' | 'long') =>
    new Date(`${date}T12:00:00Z`).toLocaleDateString(locale(), style === 'short' ? { day: 'numeric' } : { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <section className="p-6 border border-neutral-800 bg-black/85 backdrop-blur-xl rounded-2xl shadow-2xl space-y-5 text-white">
      <div className="border-b border-neutral-800 pb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="text-xs text-amber-400 font-bold block flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" /> {t('Tickets servis')}
          </span>
          <h2 className="text-2xl font-black tracking-tight">{t('Mes ventes')}</h2>
        </div>
        <div className="inline-flex rounded-full border border-neutral-700 p-0.5 text-xs font-bold">
          {([7, 30] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              aria-pressed={days === d}
              className={`px-3 py-1.5 rounded-full ${days === d ? 'chip-selected' : 'text-neutral-300 hover:text-white'}`}
            >
              {t('{n} jours', { n: d })}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-rose-300">{error}</p>}
      {!data && !error && <div className="h-48 rounded-xl bg-neutral-900 animate-pulse" />}

      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-1">
              <span className="text-[11px] text-neutral-400 font-bold block">{t('Litres vendus')}</span>
              <span className="text-xl font-black block tabular-nums">{num(data.liters)} L</span>
              <Trend now={data.liters} before={data.previous.liters} />
            </div>
            <div className="p-4 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-1">
              <span className="text-[11px] text-neutral-400 font-bold block">{t('Montant des ventes')}</span>
              <span className="text-xl font-black block tabular-nums">{num(data.revenueXOF)} F</span>
              <Trend now={data.revenueXOF} before={data.previous.revenueXOF} />
            </div>
            <div className="p-4 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-1">
              <span className="text-[11px] text-neutral-400 font-bold block">{t('Tickets servis')}</span>
              <span className="text-xl font-black block tabular-nums">{num(data.tickets)}</span>
            </div>
            <div className="p-4 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-1">
              <span className="text-[11px] text-neutral-400 font-bold block flex items-center gap-1">
                <Clock className="w-3 h-3" /> {t('Heure de pointe')}
              </span>
              <span className="text-xl font-black block tabular-nums">{peak ? `${peak.hour} h – ${peak.hour + 1} h` : '—'}</span>
            </div>
          </div>
          <p className="text-xs text-neutral-400">
            {(data.previous.liters > 0 || data.previous.revenueXOF > 0) && `${t('Comparé aux {n} jours d’avant.', { n: days })} `}
            {data.voucherXOF > 0 && t('Dont {amount} FCFA payés en bons d’essence.', { amount: num(data.voucherXOF) })}
          </p>

          {data.tickets === 0 ? (
            <p className="text-sm text-neutral-300">{t('Aucun ticket servi sur cette période.')}</p>
          ) : (
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h3 className="text-sm font-bold">{t('Litres vendus par jour')}</h3>
                <Bars
                  label={t('Litres vendus par jour')}
                  items={data.byDay.map((d, i) => ({
                    key: d.date,
                    value: d.liters,
                    tip: `${dayLabel(d.date, 'long')} : ${num(d.liters)} L, ${num(d.revenueXOF)} F`,
                    tick: days === 7 || i % 5 === 0 || i === data.byDay.length - 1 ? dayLabel(d.date, 'short') : undefined,
                  }))}
                />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-bold">{t('Tickets servis par heure')}</h3>
                <Bars
                  label={t('Tickets servis par heure')}
                  items={data.byHour.map((h) => ({
                    key: String(h.hour),
                    value: h.tickets,
                    tip: t('{hour} h : {n} ticket(s)', { hour: h.hour, n: h.tickets }),
                    tick: h.hour % 6 === 0 ? `${h.hour}h` : undefined,
                  }))}
                />
              </div>
            </div>
          )}

          {data.byFuel.length > 0 && (
            <table className="w-full text-sm">
              <caption className="sr-only">{t('Ventes par carburant')}</caption>
              <thead>
                <tr className="text-left text-[11px] text-neutral-400">
                  <th className="py-2 font-bold">{t('Carburant')}</th>
                  <th className="py-2 font-bold text-right">{t('Tickets')}</th>
                  <th className="py-2 font-bold text-right">{t('Litres')}</th>
                  <th className="py-2 font-bold text-right">{t('Montant')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 tabular-nums">
                {data.byFuel.map((f) => (
                  <tr key={f.type}>
                    <td className="py-2 font-semibold">{t(FUEL_NAMES[f.type])}</td>
                    <td className="py-2 text-right">{num(f.tickets)}</td>
                    <td className="py-2 text-right">{num(f.liters)} L</td>
                    <td className="py-2 text-right">{num(f.revenueXOF)} F</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  );
};
