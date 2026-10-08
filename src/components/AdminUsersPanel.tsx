import React, { useEffect, useState } from 'react';
import { Ban, Check, Crown, KeyRound, UserPlus, Users, X } from 'lucide-react';
import { api, ApiError } from '../api';
import { AdminUser, ManagerRequest, Station, UserRole } from '../types';

interface AdminUsersPanelProps {
  stations: Station[];
  currentUserId?: string;
}

const ROLE_LABELS: Record<UserRole, string> = {
  CLIENT: 'Client',
  STATION_PRO: 'Gérant de station',
  ADMIN: 'Administrateur',
};

// Accounts tab of the admin console: manager requests to answer, then every account with its role,
// managed station, Premium and suspension, saved as soon as they change.
export const AdminUsersPanel: React.FC<AdminUsersPanelProps> = ({ stations, currentUserId }) => {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  // The temporary password just given to one user, shown once so the admin can read it out to them.
  const [temporary, setTemporary] = useState<{ userId: string; password: string } | null>(null);

  const [requests, setRequests] = useState<ManagerRequest[]>([]);
  const [decidingId, setDecidingId] = useState<number | null>(null);

  const loadUsers = () =>
    api
      .users()
      .then(setUsers)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Comptes indisponibles.'));

  useEffect(() => {
    loadUsers();
    api.managerRequests().then(setRequests).catch(() => {});
  }, []);

  const decide = async (request: ManagerRequest, decision: 'accept' | 'reject') => {
    setDecidingId(request.id);
    setError(null);
    try {
      await api.decideManagerRequest(request.id, decision);
      setRequests((prev) => prev.filter((r) => r.id !== request.id));
      if (decision === 'accept') await loadUsers();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Réponse impossible, réessayez.');
    } finally {
      setDecidingId(null);
    }
  };

  const toggleSuspended = (user: AdminUser) => {
    const question = user.isSuspended
      ? `Réactiver le compte de ${user.name} (${user.phone}) ? La personne pourra se reconnecter.`
      : `Suspendre le compte de ${user.name} (${user.phone}) ? La personne sera déconnectée et ne pourra plus se connecter.`;
    if (window.confirm(question)) save(user, { isSuspended: !user.isSuspended });
  };

  const save = async (
    user: AdminUser,
    changes: { role?: UserRole; isPremium?: boolean; stationIds?: string[]; isSuspended?: boolean },
  ) => {
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

      {requests.length > 0 && (
        <section aria-label="Demandes de gérant" className="space-y-2">
          <h3 className="text-sm font-black text-amber-300 flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Demandes de gérant ({requests.length})
          </h3>
          {requests.map((request) => (
            <div
              key={request.id}
              className="p-4 border border-amber-400/50 bg-amber-400/5 rounded-xl flex flex-col sm:flex-row sm:items-center gap-3 text-xs"
            >
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="font-black text-white">
                  {request.userName} <span className="text-neutral-400 font-normal">{request.userPhone}</span>
                </p>
                <p className="text-neutral-200">
                  Veut gérer <span className="font-bold text-amber-300">{request.stationName}</span>
                  <span className="text-neutral-500"> · {new Date(request.createdAt).toLocaleDateString('fr-FR')}</span>
                </p>
                {request.message && <p className="text-neutral-400 font-sans italic break-words">« {request.message} »</p>}
                <p className="text-neutral-500 font-sans">Appelez ce numéro pour vérifier que la personne gère bien cette station.</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => decide(request, 'accept')}
                  disabled={decidingId === request.id}
                  className="inline-flex items-center gap-1 px-3 py-2 bg-emerald-500 text-black font-black rounded-lg hover:bg-emerald-400 disabled:opacity-60"
                >
                  <Check className="w-3.5 h-3.5" /> Accepter
                </button>
                <button
                  onClick={() => decide(request, 'reject')}
                  disabled={decidingId === request.id}
                  className="inline-flex items-center gap-1 px-3 py-2 border border-neutral-600 text-neutral-200 font-bold rounded-lg hover:border-rose-400 hover:text-rose-300 disabled:opacity-60"
                >
                  <X className="w-3.5 h-3.5" /> Refuser
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {users === null && !error && <p className="text-xs text-neutral-400">Chargement des comptes…</p>}

      <div className="space-y-3">
        {users?.map((user) => (
          <div
            key={user.id}
            className={`p-4 border rounded-xl grid ${user.isSuspended ? 'border-rose-500/60 bg-rose-950/30' : 'border-neutral-800 bg-black/60'} gap-3 md:grid-cols-[1.4fr_1fr_1.2fr_auto] md:items-center text-xs`}
          >
            <div>
              <div className="font-black text-white flex items-center gap-1.5">
                {user.name}
                {user.isPremium && <Crown className="w-3.5 h-3.5 text-amber-400" aria-label="Premium" />}
                {user.isSuspended && (
                  <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded uppercase">Suspendu</span>
                )}
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
              {user.id !== currentUserId && user.role !== 'ADMIN' && (
                <button
                  onClick={() => toggleSuspended(user)}
                  disabled={savingId === user.id}
                  className={`mt-1.5 ml-3 inline-flex items-center gap-1 text-[11px] font-bold underline disabled:opacity-60 ${
                    user.isSuspended ? 'text-emerald-300 hover:text-emerald-200' : 'text-rose-300 hover:text-rose-200'
                  }`}
                >
                  <Ban className="w-3 h-3" /> {user.isSuspended ? 'Réactiver' : 'Suspendre'}
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
