import React, { useEffect, useState } from 'react';
import { Copy, Gift, Ticket, XCircle } from 'lucide-react';
import { api, ApiError } from '../api';
import { MAX_VOUCHER_BATCH } from '../../shared/vouchers';
import { AdminVoucher, VoucherStatus } from '../types';
import { locale, num, t } from '../i18n';

interface VouchersPanelProps {
  stationId?: string; // a manager's station: its vouchers only work there. Left out: Pleino's own (admin)
  stationName?: string;
}

export const VOUCHER_STATUS_LABELS: Record<VoucherStatus, string> = {
  AVAILABLE: 'Disponible',
  UNCLAIMED: 'Code pas encore utilisé',
  USED: 'Utilisé',
  EXPIRED: 'Expiré',
  CANCELLED: 'Retiré',
};

export const VOUCHER_STATUS_STYLES: Record<VoucherStatus, string> = {
  AVAILABLE: 'bg-emerald-500/15 text-emerald-300',
  UNCLAIMED: 'bg-amber-400/15 text-amber-300',
  USED: 'bg-neutral-800 text-neutral-300',
  EXPIRED: 'bg-neutral-800 text-neutral-400',
  CANCELLED: 'bg-rose-500/15 text-rose-300',
};

const AMOUNT_PRESETS = [1000, 2000, 5000, 10000];
const VALIDITY_CHOICES = [7, 30, 90];

const formatDate = (iso: string) => new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' });
// "+22890123456" -> "+228 90 12 34 56"
const formatPhone = (phone: string) => phone.replace(/^\+228(\d{2})(\d{2})(\d{2})(\d{2})$/, '+228 $1 $2 $3 $4');
const errorText = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

// Gives fuel vouchers: to one client by phone number, or as codes to hand out in a contest.
// In the Espace Pro they work at the manager's station only; in the admin console at every partner station.
export const VouchersPanel: React.FC<VouchersPanelProps> = ({ stationId, stationName }) => {
  const [vouchers, setVouchers] = useState<AdminVoucher[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'gift' | 'codes'>('gift');
  const [amount, setAmount] = useState(2000);
  const [validDays, setValidDays] = useState(30);
  const [label, setLabel] = useState('');
  const [phone, setPhone] = useState('');
  const [count, setCount] = useState(10);
  const [busy, setBusy] = useState<string | null>(null); // 'create' or a voucher's id
  const [created, setCreated] = useState<AdminVoucher[] | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setVouchers(null);
    setCreated(null);
    setError(null);
    api
      .allVouchers()
      .then((list) => !cancelled && setVouchers(stationId ? list.filter((v) => v.validStationId === stationId) : list))
      .catch((e) => !cancelled && setError(errorText(e, t('Liste des bons indisponible.'))));
    return () => {
      cancelled = true;
    };
  }, [stationId]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy('create');
    setError(null);
    setCreated(null);
    try {
      const made = await api.createVouchers({
        ...(stationId ? { stationId } : {}),
        amountXof: amount,
        validDays,
        label: label.trim() || undefined,
        ...(mode === 'gift' ? { phone } : { count }),
      });
      setVouchers((list) => [...made, ...(list ?? [])]);
      setCreated(made);
      setPhone('');
    } catch (e) {
      setError(errorText(e, t('Création impossible, réessayez.')));
    } finally {
      setBusy(null);
    }
  };

  const cancel = async (voucher: AdminVoucher) => {
    if (!window.confirm(t('Retirer ce bon ? Il ne pourra plus être utilisé.'))) return;
    setBusy(voucher.id);
    setError(null);
    try {
      const updated = await api.cancelVoucher(voucher.id);
      setVouchers((list) => list && list.map((v) => (v.id === updated.id ? updated : v)));
    } catch (e) {
      setError(errorText(e, t('Action impossible, réessayez.')));
    } finally {
      setBusy(null);
    }
  };

  const copyCodes = (list: AdminVoucher[]) => {
    navigator.clipboard?.writeText(list.map((v) => v.code).join('\n')).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inputClass = 'w-full px-3 py-2.5 bg-neutral-900 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400';
  const chip = (selected: boolean) =>
    `px-3 py-2 rounded-lg border text-xs font-bold transition-all ${selected ? 'chip-selected' : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700'}`;

  return (
    <section className="p-6 border border-neutral-800 bg-black/85 backdrop-blur-xl rounded-2xl shadow-2xl space-y-5">
      <div className="border-b border-neutral-800 pb-4">
        <span className="text-xs text-amber-400 font-bold uppercase block tracking-widest flex items-center gap-1.5">
          <Gift className="w-3.5 h-3.5" /> {t('Offrir du carburant')}
        </span>
        <h2 className="text-2xl font-black text-white tracking-tight">{t('Bons d’essence')}</h2>
        <p className="text-xs text-neutral-400 font-sans mt-1">
          {stationId
            ? t('Vos bons ne marchent que dans votre station ({station}). La réduction est à la charge de la station.', { station: stationName ?? '' })
            : t('Les bons Pleino marchent dans toutes les stations partenaires.')}{' '}
          {t('Le client choisit son bon au moment de réserver : rien ne change pour le pompiste.')}
        </p>
      </div>

      <form onSubmit={create} className="space-y-4 text-xs">
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('Type de bon')}>
          <button type="button" aria-pressed={mode === 'gift'} onClick={() => setMode('gift')} className={chip(mode === 'gift')}>
            {t('Offrir à un client')}
          </button>
          <button type="button" aria-pressed={mode === 'codes'} onClick={() => setMode('codes')} className={chip(mode === 'codes')}>
            {t('Codes pour un concours')}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="space-y-1.5 block">
            <span className="font-bold text-neutral-200 block">{t('Montant du bon (FCFA)')}</span>
            <input type="number" min={100} step={100} required value={amount} onChange={(e) => setAmount(Number(e.target.value))} className={inputClass} />
            <span className="flex flex-wrap gap-1.5 pt-1">
              {AMOUNT_PRESETS.map((preset) => (
                <button key={preset} type="button" onClick={() => setAmount(preset)} className={chip(amount === preset)}>
                  {num(preset)}
                </button>
              ))}
            </span>
          </label>

          <div className="space-y-1.5">
            <span className="font-bold text-neutral-200 block">{t('Valable pendant')}</span>
            <div className="flex flex-wrap gap-1.5">
              {VALIDITY_CHOICES.map((days) => (
                <button key={days} type="button" onClick={() => setValidDays(days)} className={chip(validDays === days)}>
                  {t('{n} jours', { n: days })}
                </button>
              ))}
            </div>
          </div>

          {mode === 'gift' ? (
            <label className="space-y-1.5 block">
              <span className="font-bold text-neutral-200 block">{t('Numéro du client')}</span>
              <input
                type="tel"
                inputMode="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="90 00 00 00"
                className={inputClass}
              />
              <span className="text-neutral-400 block">{t('Le client doit avoir un compte Pleino. Il reçoit une notification.')}</span>
            </label>
          ) : (
            <label className="space-y-1.5 block">
              <span className="font-bold text-neutral-200 block">{t('Nombre de codes')}</span>
              <input type="number" min={1} max={MAX_VOUCHER_BATCH} required value={count} onChange={(e) => setCount(Number(e.target.value))} className={inputClass} />
              <span className="text-neutral-400 block">{t('Chaque code sert une fois : le premier qui le tape dans son profil gagne le bon.')}</span>
            </label>
          )}

          <label className="space-y-1.5 block">
            <span className="font-bold text-neutral-200 block">{t('Note (facultatif)')}</span>
            <input value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} placeholder={t('Ex. : Concours Facebook')} className={inputClass} />
          </label>
        </div>

        <button
          type="submit"
          disabled={busy === 'create'}
          className="px-5 py-3 bg-amber-400 text-black font-black rounded-xl hover:bg-amber-300 disabled:opacity-50 inline-flex items-center gap-2"
        >
          <Gift className="w-4 h-4" />
          {mode === 'gift' ? t('Offrir le bon de {amount} FCFA', { amount: num(amount) }) : t('Créer {n} codes de {amount} FCFA', { n: count, amount: num(amount) })}
        </button>
      </form>

      {error && (
        <p role="alert" className="p-3 border border-red-500/50 bg-red-500/10 rounded-lg text-red-300 text-xs font-bold">
          {error}
        </p>
      )}

      {created && (
        <div role="status" className="p-4 border border-emerald-500/50 bg-emerald-500/10 rounded-xl text-xs space-y-2">
          {created[0]?.ownerName ? (
            <p className="font-bold text-emerald-300">
              {t('Bon de {amount} FCFA offert à {name}.', { amount: num(created[0].amountXOF), name: created[0].ownerName })}
            </p>
          ) : (
            <>
              <p className="font-bold text-emerald-300">{t('{n} codes créés. Distribuez-les à vos gagnants :', { n: created.length })}</p>
              <pre className="font-mono-code text-sm text-white bg-black/60 rounded-lg p-3 max-h-48 overflow-y-auto whitespace-pre-wrap">
                {created.map((v) => v.code).join('\n')}
              </pre>
              <button type="button" onClick={() => copyCodes(created)} className="inline-flex items-center gap-1.5 font-bold text-amber-300 underline">
                <Copy className="w-3.5 h-3.5" /> {copied ? t('Copié !') : t('Copier les codes')}
              </button>
            </>
          )}
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-black text-white">{t('Bons créés')}</h3>
        {vouchers === null ? (
          !error && <p className="text-xs text-neutral-400">{t('Chargement…')}</p>
        ) : vouchers.length === 0 ? (
          <p className="text-xs text-neutral-400 italic text-center py-2">{t('Aucun bon pour l’instant.')}</p>
        ) : (
          <ul className="space-y-2 text-xs">
            {vouchers.slice(0, 200).map((v) => (
              <li key={v.id} className="p-3 rounded-xl border border-neutral-800 bg-black/60 flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono-code font-black text-white">{v.code}</span>
                    <span className="font-black text-amber-300">{num(v.amountXOF)} FCFA</span>
                    <span className={`px-2 py-0.5 rounded font-bold ${VOUCHER_STATUS_STYLES[v.status]}`}>{t(VOUCHER_STATUS_LABELS[v.status])}</span>
                  </div>
                  <div className="text-neutral-400">
                    {v.ownerName ? `${v.ownerName} (${formatPhone(v.ownerPhone ?? '')})` : t('Pas encore attribué')}
                    {' • '}
                    {v.status === 'USED' && v.usedStationName
                      ? t('utilisé à {station}', { station: v.usedStationName })
                      : t('jusqu’au {date}', { date: formatDate(v.expiresAt) })}
                    {!stationId && ` • ${v.validStationName ?? t('Bon Pleino')}`}
                    {v.label && ` • ${v.label}`}
                  </div>
                </div>
                {(v.status === 'AVAILABLE' || v.status === 'UNCLAIMED') && (
                  <button
                    onClick={() => cancel(v)}
                    disabled={busy === v.id}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-300 underline hover:text-rose-200 disabled:opacity-60"
                  >
                    <XCircle className="w-3 h-3" /> {t('Retirer')}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {vouchers && vouchers.some((v) => v.status === 'UNCLAIMED') && (
          <button
            type="button"
            onClick={() => copyCodes(vouchers.filter((v) => v.status === 'UNCLAIMED'))}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 underline"
          >
            <Ticket className="w-3.5 h-3.5" /> {t('Copier les codes pas encore utilisés')}
          </button>
        )}
      </div>
    </section>
  );
};
