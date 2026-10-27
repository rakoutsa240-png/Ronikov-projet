import React from 'react';
import { TrendingDown } from 'lucide-react';
import { FuelStock } from '../types';
import { t } from '../i18n';

// "−25 F": shown for a few days after a station lowered its price.
export const PriceDrop: React.FC<{ stock: FuelStock; className?: string }> = ({ stock, className = '' }) => {
  if (!stock.priceDrop) return null;
  const drop = stock.priceDrop.previousPrice - stock.pricePerLiter;
  return (
    <span
      title={t('Prix en baisse : {before} FCFA/L avant', { before: stock.priceDrop.previousPrice })}
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold tabular-nums whitespace-nowrap ${className}`}
    >
      <TrendingDown className="w-3 h-3" /> −{drop} F
    </span>
  );
};
