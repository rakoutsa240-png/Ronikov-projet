import React, { useState } from 'react';
import { AuthUser } from '../types';
import { X, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { api, ApiError } from '../api';
import { useModal } from '../useModal';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: (user: AuthUser) => void;
  reason?: string; // why sign-in is asked, e.g. to book
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthenticated,
  reason,
}) => {
  useModal(isOpen, onClose);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // The role comes from the server: sign-up always creates a client account.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const user =
        mode === 'login'
          ? await api.login(phone, password)
          : await api.register({ name, phone, password, email: email || undefined });
      setPassword('');
      onAuthenticated(user);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Serveur RONIKOV injoignable. Réessayez plus tard.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div role="dialog" aria-modal="true" className="bg-white border-2 border-black max-w-md w-full p-6 space-y-6 font-mono-code relative text-black my-auto">
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="absolute top-4 right-4 p-1.5 border border-black hover:bg-black hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="border-b border-black pb-3 space-y-1">
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest block">
            ACCÈS ESPACE SÉCURISÉ TOGO
          </span>
          <h2 className="text-2xl font-extrabold uppercase tracking-tight">
            {mode === 'login' ? 'CONNEXION RONIKOV' : 'CRÉATION DE COMPTE'}
          </h2>
        </div>

        {reason && (
          <p className="text-xs font-bold bg-amber-100 border border-amber-500 text-amber-900 p-2.5 font-sans">{reason}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase block text-black">Nom & Prénoms</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Kofi Mensah"
                className="w-full p-2.5 border border-black text-xs font-bold focus:outline-none"
              />
            </div>
          )}

          {mode === 'register' && (
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase block text-black">E-mail (facultatif)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kofi@exemple.tg"
                className="w-full p-2.5 border border-black text-xs font-bold focus:outline-none"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase block text-black">
              Numéro de Téléphone Togolais (+228)
            </label>
            <div className="flex border border-black">
              <span className="px-3 py-2 bg-neutral-100 border-r border-black font-bold text-xs text-neutral-700 flex items-center">
                +228
              </span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="90 00 00 00"
                className="w-full p-2.5 text-xs font-bold focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase block text-black">Code Secret / Mot de Passe</label>
            <div className="flex border border-black">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={mode === 'register' ? 8 : undefined}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-2.5 text-xs font-bold focus:outline-none"
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
            {mode === 'register' && <p className="text-[10px] text-neutral-500 font-sans">8 caractères minimum.</p>}
          </div>

          {error && (
            <p role="alert" className="text-xs font-bold text-red-700 border border-red-700 bg-red-50 p-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 disabled:opacity-60 bg-black text-white font-bold text-xs uppercase tracking-wider hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 border border-black"
          >
            <span>{mode === 'login' ? 'Se Connecter' : 'Créer Mon Compte'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-xs pt-2 border-t border-neutral-200">
          <button
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError(null);
            }}
            className="text-neutral-600 font-bold uppercase hover:text-black underline"
          >
            {mode === 'login'
              ? "Pas encore de compte ? S'inscrire"
              : 'Déjà inscrit ? Se connecter'}
          </button>
        </div>
      </div>
    </div>
  );
};
