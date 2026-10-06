import React from 'react';
import { FuelPriceGlobal, FuelType } from '../types';
import { FUEL_TYPES } from '../../shared/stock';

const SHORT_LABELS: Record<FuelType, string> = { SUPER: 'Super', GAZOLE: 'Gazole', MELANGE: 'Mélange', KEROSENE: 'Kérosène' };

// Official prices of the day, in one small fixed block (they used to scroll in a band at the top).
export const PricesCard: React.FC<{ prices: FuelPriceGlobal[]; loading?: boolean }> = ({ prices, loading }) => (
  <section aria-labelledby="prices-title" className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5 space-y-3">
    <h2 id="prices-title" className="text-sm font-bold text-neutral-200">
      Prix officiels du jour <span className="font-normal text-neutral-400">(FCFA par litre)</span>
    </h2>
    <dl className="grid grid-cols-4 gap-2">
      {FUEL_TYPES.map((type) => {
        const price = prices.find((p) => p.type === type)?.officialPriceXOF;
        return (
          <div key={type} className="bg-black border border-neutral-800 rounded-xl px-2 py-2.5 text-center">
            <dt className="text-xs text-neutral-300">{SHORT_LABELS[type]}</dt>
            <dd className="text-lg sm:text-xl font-extrabold text-white tabular-nums">
              {loading || price === undefined ? <span className="inline-block w-10 h-5 rounded bg-neutral-800 animate-pulse align-middle" /> : price}
            </dd>
          </div>
        );
      })}
    </dl>
  </section>
);
