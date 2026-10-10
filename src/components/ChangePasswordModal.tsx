import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, X } from 'lucide-react';
import { api, ApiError } from '../api';
import { AuthUser } from '../types';
import { useModal } from '../useModal';

interface ChangePasswordModalProps {
  isOpen: boolean;
  // Signed in with a temporary password from an admin: the user must pick their own before going on.
  forced: boolean;
  currentPassword?: string; // already typed at sign-in, so not asked again
  onClose: () => void;
  onLogout: () => void;
  onChanged: (user: AuthUser) => void;
}

const noop = () => {};

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  forced,
  currentPassword: knownPassword,
  onClose,
  onLogout,
  onChanged,
}) => {
  useModal(isOpen, forced ? noop : onClose);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setCurrentPassword('');
    setNewPassword('');
    setError(null);
    setDone(false);
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const user = await api.changePassword(knownPassword ?? currentPassword, newPassword);
      setNewPassword('');
      setDone(true);
      onChanged(user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Serveur Pleino injoignable. Réessayez plus tard.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const inputClass = 'w-full p-2.5 text-xs font-bold focus:outline-none';

  return (
    <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div role="dialog" aria-modal="true" className="bg-white border-2 border-black max-w-md w-full p-6 space-y-5 font-mono-code relative text-black my-auto">
        {!forced && (
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="absolute top-4 right-4 p-1.5 border border-black hover:bg-black hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="border-b border-black pb-3 space-y-1">
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <KeyRound className="w-6 h-6" /> Nouveau mot de passe
          </h2>
          {forced && (
            <p className="text-xs text-neutral-600 font-sans">
              Vous êtes connecté avec un mot de passe temporaire. Choisissez le vôtre pour continuer.
            </p>
          )}
        </div>

        {done ? (
          <div className="space-y-4">
            <p role="status" className="text-xs font-bold bg-emerald-50 border border-emerald-600 text-emerald-800 p-3 font-sans">
              Mot de passe changé. Vos autres appareils ont été déconnectés.
            </p>
            <button onClick={onClose} className="w-full py-3 bg-black text-white font-bold text-xs tracking-wider hover:bg-neutral-800">
              Continuer
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {knownPassword === undefined && (
              <div className="space-y-1">
                <label htmlFor="current-password" className="text-xs font-bold block">
                  {forced ? 'Mot de passe temporaire' : 'Mot de passe actuel'}
                </label>
                <input
                  id="current-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={`${inputClass} border border-black`}
                />
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="new-password" className="text-xs font-bold block">
                Nouveau mot de passe
              </label>
              <div className="flex border border-black">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  className="px-3 border-l border-black text-neutral-600 hover:text-black"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-neutral-500 font-sans">8 caractères minimum.</p>
            </div>

            {error && (
              <p role="alert" className="text-xs font-bold text-red-700 border border-red-700 bg-red-50 p-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 disabled:opacity-60 bg-black text-white font-bold text-xs tracking-wider hover:bg-neutral-800 transition-colors border border-black"
            >
              Enregistrer
            </button>
            {forced && (
              <button type="button" onClick={onLogout} className="w-full text-xs text-neutral-600 font-bold underline hover:text-black">
                Se déconnecter
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
