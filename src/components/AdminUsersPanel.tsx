import React, { useEffect, useState } from 'react';
import { Crown, KeyRound, Users } from 'lucide-react';
import { api, ApiError } from '../api';
import { AdminUser, Station, UserRole } from '../types';

interface AdminUsersPanelProps {
  stations: Station[];
  currentUserId?: string;
}

const ROLE_LABELS: Record<UserRole, string> = {
  CLIENT: 'Client',
  STATION_PRO: 'Gérant de station',
  ADMIN: 'Administrateur',
};

// Accounts tab of the admin console: roles, managed station and Premium are saved as soon as they change.
export const AdminUsersPanel: React.FC<AdminUsersPanelProps> = ({ stations, currentUserId }) => {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  // The temporary password just given to one user, shown once so the admin can read it out to them.
  const [temporary, setTemporary] = useState<{ userId: string; password: string } | null>(null);

  useEffect(() => {
    api
      .users()
      .then(setUsers)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Comptes indisponibles.'));
  }, []);

  const save = async (user: AdminUser, changes: { role?: UserRole; isPremium?: boolean; stationIds?: string[] }) => {
    setSavingId(user.id);
    setError(null);
    try {
      const updated = await api.updateUser(user.id, changes);
      setUsers((prev) => prev?.map((u) => (u.id === updated.id ? updated : u)) ?? null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Modification impossible, réessayez.');
    } finally {
      setSavingId(null);
    }
  };

  const resetPassword = async (user: AdminUser) => {
    if (!window.confirm(`Donner un mot de passe temporaire à ${user.name} (${user.phone}) ? Son mot de passe actuel ne marchera plus.`)) return;
    setSavingId(user.id);
    setError(null);
    try {
      const { temporaryPassword } = await api.resetUserPassword(user.id);
      setTemporary({ userId: user.id, password: temporaryPassword });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Réinitialisation impossible, réessayez.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="border border-neutral-800 p-6 bg-black/85 backdrop-blur-xl rounded-2xl space-y-4 shadow-2xl">
      <h2 className="text-xl font-black text-white border-b border-neutral-800 pb-3 flex items-center gap-2">
        <Users className="w-5 h-5 text-amber-400" />
        Comptes, rôles & pass Premium
      </h2>

      {error && (
        <p role="alert" className="text-xs font-bold text-red-300 border border-red-500/60 bg-red-500/10 p-3 rounded-xl">
          {error}
        </p>
      )}

      {users === null && !error && <p className="text-xs text-neutral-400">Chargement des comptes…</p>}

      <div className="space-y-3">
        {users?.map((user) => (
          <div
            key={user.id}
            className="p-4 border border-neutral-800 rounded-xl bg-black/60 grid gap-3 md:grid-cols-[1.4fr_1fr_1.2fr_auto] md:items-center text-xs"
          >
            <div>
              <div className="font-black text-white flex items-center gap-1.5">
                {user.name}
                {user.isPremium && <Crown className="w-3.5 h-3.5 text-amber-400" aria-label="Premium" />}
              </div>
              <div className="text-neutral-400">{user.phone}</div>
              {user.id !== currentUserId && (
                <button
                  onClick={() => resetPassword(user)}
                  disabled={savingId === user.id}
                  className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 hover:text-amber-200 underline disabled:opacity-60"
                >
                  <KeyRound className="w-3 h-3" /> Mot de passe oublié
                </button>
              )}
            </div>

            <select
              aria-label={`Rôle de ${user.name}`}
              value={user.role}
              disabled={savingId === user.id || user.id === currentUserId}
              onChange={(e) => save(user, { role: e.target.value as UserRole })}
              className="p-2 border border-neutral-700 bg-black text-white rounded-lg disabled:opacity-60"
            >
              {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>

            {user.role === 'STATION_PRO' ? (
              <select
                aria-label={`Station gérée par ${user.name}`}
                value={user.managedStationIds[0] ?? ''}
                disabled={savingId === user.id}
                onChange={(e) => save(user, { stationIds: e.target.value ? [e.target.value] : [] })}
                className="p-2 border border-neutral-700 bg-black text-white rounded-lg disabled:opacity-60"
              >
                <option value="">Aucune station</option>
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-neutral-500">—</span>
            )}

            <label className="flex items-center gap-2 font-bold text-neutral-200">
              <input
                type="checkbox"
                checked={user.isPremium}
                disabled={savingId === user.id}
                onChange={(e) => save(user, { isPremium: e.target.checked })}
                className="accent-amber-400 w-4 h-4"
              />
              Premium
            </label>

            {temporary?.userId === user.id && (
              <div role="status" className="md:col-span-4 p-3 border border-amber-400/60 bg-amber-400/10 rounded-lg text-amber-100 font-sans space-y-1">
                <p>
                  Mot de passe temporaire : <span className="font-code font-black text-base text-white select-all">{temporary.password}</span>
                </p>
                <p className="text-neutral-300">
                  Donnez-le à {user.name} en appelant le numéro du compte. Il ne sera plus affiché ; à sa prochaine
                  connexion, la personne devra choisir son propre mot de passe.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
