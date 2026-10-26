import React from 'react';
import { Star } from 'lucide-react';
import { RATING_LABELS } from '../../shared/reviews';
import { StationRating } from '../types';
import { num, t } from '../i18n';

interface StarInputProps {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
}

// Five large stars to tap, read out as a choice of 1 to 5.
export const StarInput: React.FC<StarInputProps> = ({ label, value, onChange, disabled }) => (
  <fieldset className="space-y-1.5" disabled={disabled}>
    <legend className="text-sm font-bold text-neutral-200">{label}</legend>
    <div role="radiogroup" aria-label={label} className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${t('{n} sur 5', { n })} : ${t(RATING_LABELS[n])}`}
          onClick={() => onChange(n)}
          className="p-1 rounded-lg hover:scale-110 transition-transform disabled:opacity-50"
        >
          <Star className={`w-8 h-8 ${value !== null && n <= value ? 'fill-amber-400 text-amber-400' : 'text-neutral-600'}`} />
        </button>
      ))}
      <span className="ml-2 text-xs font-bold text-amber-300 min-w-[5rem]">{value ? t(RATING_LABELS[value]) : ''}</span>
    </div>
  </fieldset>
);

// Small read-only stars, e.g. ★★★★☆.
export const Stars: React.FC<{ value: number; className?: string }> = ({ value, className = 'w-3.5 h-3.5' }) => (
  <span className="inline-flex items-center gap-0.5" role="img" aria-label={t('{n} sur 5', { n: value })}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star key={n} className={`${className} ${n <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-neutral-600'}`} />
    ))}
  </span>
);

// "★ 4,3 (12 avis)" on a station; nothing before its first review.
export const RatingBadge: React.FC<{ rating?: StationRating | null; className?: string }> = ({ rating, className = '' }) => {
  if (!rating || rating.count === 0) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-900 text-neutral-200 font-semibold ${className}`}
      title={t('Note moyenne des clients servis : {n} sur 5', { n: num(rating.average) })}
    >
      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
      <span className="tabular-nums">{num(rating.average, { minimumFractionDigits: 1 })}</span>
      <span className="text-neutral-400 font-normal">({t('{n} avis', { n: rating.count })})</span>
    </span>
  );
};
