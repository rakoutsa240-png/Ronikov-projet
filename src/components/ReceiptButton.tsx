import React, { useState } from 'react';
import { Share2 } from 'lucide-react';
import { Reservation } from '../types';

// "Reçu" button: builds the receipt picture and opens the share menu (WhatsApp...) or downloads it.
export const ReceiptButton: React.FC<{ reservation: Reservation; className?: string }> = ({ reservation, className = '' }) => {
  const [state, setState] = useState<'idle' | 'busy' | 'downloaded' | 'error'>('idle');
  const onClick = async () => {
    setState('busy');
    try {
      // Loaded on demand: most visits never need it.
      const { shareReceipt } = await import('../receipt');
      const result = await shareReceipt(reservation);
      setState(result === 'downloaded' ? 'downloaded' : 'idle');
      if (result === 'downloaded') setTimeout(() => setState('idle'), 3000);
    } catch (e) {
      console.warn('Could not make the receipt', e);
      setState('error');
    }
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state === 'busy'}
      className={`px-4 py-2.5 border border-neutral-700 bg-neutral-900 text-white text-xs font-bold hover:border-amber-400 rounded-xl flex items-center gap-2 transition-all shadow-md disabled:opacity-60 ${className}`}
    >
      <Share2 className="w-4 h-4 text-amber-400" />
      <span>
        {state === 'busy' ? 'Préparation…' : state === 'downloaded' ? 'Reçu téléchargé' : state === 'error' ? 'Réessayer' : 'Envoyer le reçu'}
      </span>
    </button>
  );
};
