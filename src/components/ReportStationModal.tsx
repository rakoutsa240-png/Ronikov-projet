import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { api, ApiError } from '../api';
import { REPORT_CHOICES, REPORT_KINDS } from '../../shared/reports';
import { FUEL_TYPES } from '../../shared/stock';
import { FuelType, ReportKind, Station } from '../types';
import { useModal } from '../useModal';

const FUEL_SHORT: Record<FuelType, string> = { SUPER: 'Super', GAZOLE: 'Gazole', MELANGE: 'Mélange', KEROSENE: 'Kérosène' };

interface ReportStationModalProps {
  station: Station | null; // null when closed
  onClose: () => void;
  onReported: (station: Station) => void;
}

// A client tells others what they found at the station. Missing fuel and wrong prices name the fuel.
export const ReportStationModal: React.FC<ReportStationModalProps> = ({ station, onClose, onReported }) => {
  useModal(station !== null, onClose);
  const [kind, setKind] = useState<ReportKind | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setKind(null);
    setMessage(null);
  }, [station?.id]);

  if (!station) return null;

  const send = async (reportKind: ReportKind, fuelType?: FuelType) => {
    setSending(true);
    setMessage(null);
    try {
      onReported(await api.reportStation(station.id, reportKind, fuelType));
      setMessage({ ok: true, text: 'Merci ! Les autres clients le voient maintenant sur la fiche, et la station est prévenue.' });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof ApiError ? e.message : 'Serveur RONIKOV injoignable. Réessayez.' });
    } finally {
      setSending(false);
    }
  };

  const needsFuel = kind === 'NO_FUEL' || kind === 'WRONG_PRICE';

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-neutral-950 border border-neutral-700 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-4 text-white"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="report-title" className="text-lg font-extrabold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" /> Signaler un problème
            </h2>
            <p className="text-sm text-neutral-400">{station.name}</p>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="p-2 rounded-lg border border-neutral-700 hover:border-amber-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {message?.ok ? (
          <div className="space-y-4">
            <p role="status" className="flex items-start gap-2 text-sm text-emerald-300">
              <CheckCircle2 className="w-5 h-5 shrink-0" /> {message.text}
            </p>
            <button onClick={onClose} className="w-full py-3 rounded-xl bg-amber-400 text-black font-bold">
              Fermer
            </button>
          </div>
        ) : !needsFuel ? (
          <div className="grid grid-cols-2 gap-2">
            {REPORT_KINDS.map((k) => (
              <button
                key={k}
                disabled={sending}
                onClick={() => (k === 'NO_FUEL' || k === 'WRONG_PRICE' ? setKind(k) : send(k))}
                className="py-4 px-3 rounded-xl border border-neutral-700 bg-neutral-900 font-bold text-sm hover:border-amber-400 disabled:opacity-50"
              >
                {REPORT_CHOICES[k]}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-neutral-300">{kind === 'NO_FUEL' ? 'Quel carburant manque ?' : 'Pour quel carburant ?'}</p>
            <div className="grid grid-cols-2 gap-2">
              {FUEL_TYPES.map((f) => (
                <button
                  key={f}
                  disabled={sending}
                  onClick={() => send(kind!, f)}
                  className="py-4 rounded-xl border border-neutral-700 bg-neutral-900 font-bold text-sm hover:border-amber-400 disabled:opacity-50"
                >
                  {FUEL_SHORT[f]}
                </button>
              ))}
            </div>
            <button onClick={() => setKind(null)} className="text-sm text-neutral-400 underline">
              Retour
            </button>
          </div>
        )}

        {message && !message.ok && (
          <p role="alert" className="text-sm text-red-300">
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
};
