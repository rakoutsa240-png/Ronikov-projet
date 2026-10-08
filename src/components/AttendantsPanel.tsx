import React, { useEffect, useState } from 'react';
import { KeyRound, UserMinus, UserPlus, Users } from 'lucide-react';
import { api, ApiError } from '../api';
import { Attendant } from '../types';

interface AttendantsPanelProps {
  stationId: string;
  stationName: string;
}

// "+22890123456" -> "+228 90 12 34 56"
const formatPhone = (phone: string) => phone.replace(/^\+228(\d{2})(\d{2})(\d{2})(\d{2})$/, '+228 $1 $2 $3 $4');

const errorText = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

// Espace Pro section where a manager adds the pump attendants of their station. Attendants can only
// validate tickets there; they cannot change the stock or the station.
export const AttendantsPanel: React.FC<AttendantsPanelProps> = ({ stationId, stationName }) => {
  const [attendants, setAttendants] = useState<Attendant[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState<string | null>(null); // 'add' or the attendant's id
  // The temporary password just created, shown once so the manager can give it to the attendant.
  const [notice, setNotice] = useState<{ name: string; password: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setAttendants(null);
    setNotice(null);
    setError(null);
    api
      .attendants(stationId)
      .then((list) => !cancelled && setAttendants(list))
      .catch((e) => !cancelled && setError(errorText(e, 'Liste des pompistes indisponible.')));
    return () => {
      cancelled = true;
    };
  }, [stationId]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy('add');
    setError(null);
    try {
      const { attendant, temporaryPassword } = await api.addAttendant(stationId, { name, phone });
      setAttendants((list) => [...(list ?? []), attendant].sort((a, b) => a.name.localeCompare(b.name)));
      setNotice({ name: attendant.name, password: temporaryPassword });
      setName('');
      setPhone('');
    } catch (e) {
      setError(errorText(e, 'Ajout impossible, réessayez.'));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (attendant: Attendant) => {
    if (!window.confirm(`Retirer ${attendant.name} des pompistes de ${stationName} ? Son compte redevient un compte client.`)) return;
    setBusy(attendant.id);
    setError(null);
    try {
      await api.removeAttendant(stationId, attendant.id);
      setAttendants((list) => (list ?? []).filter((a) => a.id !== attendant.id));
      if (notice?.name === attendant.name) setNotice(null);
    } catch (e) {
      setError(errorText(e, 'Retrait impossible, réessayez.'));
    } finally {
      setBusy(null);
    }
  };

  const resetPassword = async (attendant: Attendant) => {
    setBusy(attendant.id);
    setError(null);
    try {
      const { temporaryPassword } = await api.resetAttendantPassword(stationId, attendant.id);
      setNotice({ name: attendant.name, password: temporaryPassword });
      setAttendants((list) => (list ?? []).map((a) => (a.id === attendant.id ? { ...a, mustChangePassword: true } : a)));
    } catch (e) {
      setError(errorText(e, 'Nouveau mot de passe impossible, réessayez.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="p-6 border border-neutral-800 bg-black/85 backdrop-blur-xl rounded-2xl shadow-2xl space-y-5">
      <div className="border-b border-neutral-800 pb-4">
        <span className="text-xs text-amber-400 font-bold uppercase block tracking-widest flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" /> Équipe de la station
        </span>
        <h2 className="text-2xl font-black text-white tracking-tight">Mes pompistes</h2>
        <p className="text-xs text-neutral-400 font-sans mt-1">
          Un pompiste se connecte avec son numéro et peut seulement valider les tickets de {stationName}. Il ne voit ni ne modifie
          le stock.
        </p>
      </div>

      <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 text-xs">
        <label className="flex flex-col gap-1 font-bold text-neutral-300">
          Nom
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={80}
            placeholder="Kossi Mensah"
            className="p-2.5 border border-neutral-700 bg-black/80 text-white rounded-lg focus:border-amber-400 focus:outline-none font-sans"
          />
        </label>
        <label className="flex flex-col gap-1 font-bold text-neutral-300">
          Téléphone
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            inputMode="tel"
            placeholder="90 12 34 56"
            className="p-2.5 border border-neutral-700 bg-black/80 text-white rounded-lg focus:border-amber-400 focus:outline-none font-sans"
          />
        </label>
        <button
          type="submit"
          disabled={busy === 'add'}
          className="self-end px-4 py-2.5 bg-amber-400 text-black font-black rounded-lg hover:bg-amber-300 flex items-center justify-center gap-1.5 disabled:opacity-60"
        >
          <UserPlus className="w-4 h-4" /> {busy === 'add' ? 'Ajout...' : 'Ajouter'}
        </button>
      </form>

      {notice && (
        <div role="status" className="p-3 border border-amber-400/60 bg-amber-400/10 rounded-lg text-amber-100 text-xs font-sans space-y-1">
          {notice.password ? (
            <>
              <p>
                Mot de passe temporaire de {notice.name} :{' '}
                <span className="font-code font-black text-base text-white select-all">{notice.password}</span>
              </p>
              <p className="text-neutral-300">
                Donnez-le-lui avec son numéro. Il ne sera plus affiché ; à sa première connexion, il choisira son propre mot de passe.
              </p>
            </>
          ) : (
            <p>
              {notice.name} avait déjà un compte RONIKOV : il se connecte avec son mot de passe habituel et trouve l'Espace Pro dans le
              menu.
            </p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="p-3 border border-red-500/50 bg-red-500/10 rounded-lg text-red-300 text-xs font-bold">
          {error}
        </p>
      )}

      {attendants === null ? (
        !error && <p className="text-xs text-neutral-400">Chargement...</p>
      ) : attendants.length === 0 ? (
        <p className="text-xs text-neutral-400 italic text-center py-2">Aucun pompiste pour l'instant.</p>
      ) : (
        <ul className="space-y-2.5 text-xs">
          {attendants.map((a) => (
            <li key={a.id} className="p-3.5 border border-neutral-800 rounded-xl bg-black/60 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-black text-white">{a.name}</div>
                <div className="text-[11px] text-neutral-400">
                  {formatPhone(a.phone)}
                  {a.isSuspended ? ' • compte suspendu' : a.mustChangePassword ? ' • mot de passe temporaire' : ''}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => resetPassword(a)}
                  disabled={busy === a.id}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 underline hover:text-amber-200 disabled:opacity-60"
                >
                  <KeyRound className="w-3 h-3" /> Nouveau mot de passe
                </button>
                <button
                  onClick={() => remove(a)}
                  disabled={busy === a.id}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-300 underline hover:text-rose-200 disabled:opacity-60"
                >
                  <UserMinus className="w-3 h-3" /> Retirer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
