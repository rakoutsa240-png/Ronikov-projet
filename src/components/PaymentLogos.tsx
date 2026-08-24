import React from 'react';
import { PaymentMethod } from '../types';
import { Smartphone, CreditCard, CheckCircle2 } from 'lucide-react';

interface PaymentLogoProps {
  method: PaymentMethod;
  selected?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const MixxByYasBadge: React.FC<{ selected?: boolean; size?: 'sm' | 'md' | 'lg' }> = ({ selected, size = 'md' }) => {
  const isSm = size === 'sm';
  return (
    <div className={`flex items-center gap-2.5 transition-all ${isSm ? 'scale-90' : ''}`}>
      {/* Visual Logo Emblem */}
      <div className={`relative flex items-center justify-center font-black rounded-xl overflow-hidden shadow-md shrink-0 ${
        isSm ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
      } bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-500 text-black border border-yellow-200`}>
        <span className="font-extrabold tracking-tighter text-black font-sans">
          mixx
        </span>
        <div className="absolute -bottom-0.5 right-0 bg-purple-900 text-[8px] px-1 text-yellow-300 font-bold uppercase rounded-tl-sm">
          yas
        </div>
      </div>

      <div className="text-left">
        <div className="flex items-center gap-1.5">
          <span className={`font-black tracking-tight font-mono-code ${selected ? 'text-amber-300' : 'text-white'}`}>
            mixx by yas
          </span>
          <span className="px-1.5 py-0.2 bg-yellow-400 text-black text-[9px] font-black uppercase rounded">
            TOGOCOM
          </span>
        </div>
        <p className="text-[10px] text-neutral-400 font-sans leading-none mt-0.5">
          Paiement Mobile Money Togo
        </p>
      </div>
    </div>
  );
};

export const MoovAfricaBadge: React.FC<{ selected?: boolean; size?: 'sm' | 'md' | 'lg' }> = ({ selected, size = 'md' }) => {
  const isSm = size === 'sm';
  return (
    <div className={`flex items-center gap-2.5 transition-all ${isSm ? 'scale-90' : ''}`}>
      {/* Visual Logo Emblem */}
      <div className={`relative flex items-center justify-center font-black rounded-xl overflow-hidden shadow-md shrink-0 ${
        isSm ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
      } bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 text-white border border-blue-400/40`}>
        <span className="font-extrabold tracking-tighter text-amber-400 font-sans">
          Moov
        </span>
        <div className="absolute -bottom-0.5 right-0 bg-orange-500 text-[8px] px-1 text-white font-bold uppercase rounded-tl-sm">
          Flooz
        </div>
      </div>

      <div className="text-left">
        <div className="flex items-center gap-1.5">
          <span className={`font-black tracking-tight font-mono-code ${selected ? 'text-blue-300' : 'text-white'}`}>
            Moov Africa
          </span>
          <span className="px-1.5 py-0.2 bg-orange-500 text-white text-[9px] font-black uppercase rounded">
            FLOOZ
          </span>
        </div>
        <p className="text-[10px] text-neutral-400 font-sans leading-none mt-0.5">
          Moov Money Flooz Togo
        </p>
      </div>
    </div>
  );
};

export const CardPaymentBadge: React.FC<{ selected?: boolean; size?: 'sm' | 'md' | 'lg' }> = ({ selected, size = 'md' }) => {
  const isSm = size === 'sm';
  return (
    <div className={`flex items-center gap-2.5 transition-all ${isSm ? 'scale-90' : ''}`}>
      {/* Visual Logo Emblem */}
      <div className={`relative flex items-center justify-center font-black rounded-xl overflow-hidden shadow-md shrink-0 ${
        isSm ? 'w-8 h-8' : 'w-10 h-10'
      } bg-gradient-to-br from-neutral-800 via-neutral-900 to-black text-amber-400 border border-neutral-700`}>
        <CreditCard className="w-5 h-5 text-amber-400" />
      </div>

      <div className="text-left">
        <div className="flex items-center gap-1.5">
          <span className={`font-black tracking-tight font-mono-code ${selected ? 'text-amber-300' : 'text-white'}`}>
            Carte Bancaire
          </span>
        </div>
        <p className="text-[10px] text-neutral-400 font-sans leading-none mt-0.5">
          Visa / Mastercard / Ecobank
        </p>
      </div>
    </div>
  );
};

export const PaymentMethodLabel: React.FC<{ method: PaymentMethod; showDetails?: boolean }> = ({ method, showDetails = true }) => {
  if (method === 'MIXX_BY_YAS' || method === 'TMONEY') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono-code">
        <span className="px-2 py-0.5 bg-yellow-400 text-black font-black text-[10px] rounded uppercase shadow-sm">
          Mixx by Yas
        </span>
        {showDetails && <span className="text-neutral-300 font-medium">(Togocom)</span>}
      </span>
    );
  }

  if (method === 'MOOV_MONEY' || method === 'FLOOZ') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono-code">
        <span className="px-2 py-0.5 bg-blue-600 text-white font-black text-[10px] rounded uppercase shadow-sm">
          Moov Africa
        </span>
        {showDetails && <span className="text-neutral-300 font-medium">(Flooz Moov Money)</span>}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 font-mono-code">
      <span className="px-2 py-0.5 bg-neutral-800 text-amber-300 border border-neutral-700 font-black text-[10px] rounded uppercase shadow-sm">
        Carte Visa/MC
      </span>
    </span>
  );
};
