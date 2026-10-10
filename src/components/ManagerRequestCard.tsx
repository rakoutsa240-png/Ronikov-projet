import React, { useEffect, useState } from 'react';
import { Building2, Clock, XCircle } from 'lucide-react';
import { api, ApiError } from '../api';
import { AuthUser, ManagerRequest, Station } from '../types';

interface ManagerRequestCardProps {
  stations: Station[];
  // Called with the refreshed account once an admin has accepted the request.
  onUserChanged: (user: AuthUser) => void;
}

// On a client's profile: "I run a station" form, then where the request stands.
export const ManagerRequestCard: React.FC<ManagerRequestCardProps> = ({ stations, onUserChanged }) => {
  const [latest, setLatest] = useState<ManagerRequest | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [stationId, setStationId] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .myManagerRequest()
      .then((request) => {
        setLatest(request);
        // Accepted since this page last loaded the account: pick up the new role.
        if (request?.status === 'ACCEPTED') api.me().then((user) => user && onUserChanged(user)).catch(() => {});
      })
      .catch(() => setLatest(null));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      setLatest(await api.requestManager(stationId, message.trim()));
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Envoi impossible, réessayez.');
    } finally {
      setSending(false);
    }
  };

  if (latest === undefined) return null;

  if (latest?.status === 'PENDING') {
    return (
      <div role="status" className="p-4 border border-amber-400/50 bg-amber-400/5 rounded-xl flex items-start gap-3 text-xs">
        <Clock className="w-5 h-5 text-amber-400 shrink-0" />
        <span className="font-sans text-neutral-200">
          <span className="block font-bold text-white font-mono-code">Demande de gérant envoyée</span>
          Vous avez demandé à gérer {latest.stationName}. Pleino va vous appeler pour vérifier, puis ouvrir votre Espace Pro.
        </span>
      </div>
    );
  }

  return (
    <div className="p-4 border border-neutral-800 bg-black/85 rounded-xl space-y-3 text-xs">
      {latest?.status === 'REJECTED' && !open && (
        <p className="flex items-start gap-2 text-rose-300 font-sans">
          <XCircle className="w-4 h-4 shrink-0" />
          Votre demande pour gérer {latest.stationName} n’a pas été acceptée. Vous pouvez en envoyer une autre.
        </p>
      )}
      {!open ? (
        <button onClick={() => setOpen(true)} className="w-full flex items-center gap-3 text-left text-white font-bold">
          <Building2 className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="flex-1">
            <span className="block">Vous gérez une station ?</span>
            <span className="block text-neutral-400 font-sans font-normal">Demandez l’accès à l’Espace Pro pour mettre à jour vos stocks</span>
          </span>
        </button>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <p className="font-black text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-400" /> Demander l’accès gérant
          </p>
          <label className="block space-y-1">
            <span className="text-neutral-300 font-bold">Votre station</span>
            <select
              required
              value={stationId}
              onChange={(e) => setStationId(e.target.value)}
              className="w-full p-2.5 border border-neutral-700 bg-black text-white rounded-lg"
            >
              <option value="">Choisissez…</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.district})
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-neutral-300 font-bold">Message (facultatif)</span>
            <textarea
              value={message}
              maxLength={500}
              rows={2}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ex. : je suis le gérant depuis 2022"
              className="w-full p-2.5 border border-neutral-700 bg-black text-white rounded-lg font-sans"
            />
          </label>
          {error && (
            <p role="alert" className="font-bold text-red-300">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={sending || !stationId}
              className="flex-1 py-2.5 bg-amber-400 text-black font-black rounded-lg hover:bg-amber-300 disabled:opacity-60"
            >
              {sending ? 'Envoi…' : 'Envoyer la demande'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2.5 border border-neutral-700 rounded-lg text-neutral-300">
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
