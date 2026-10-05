import React, { useState } from 'react';
import { UserRole } from '../types';
import { X, Check, ShieldCheck, User, Building2, Lock, ArrowRight } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (name: string, role: UserRole) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<UserRole>('CLIENT');
  const [phone, setPhone] = useState('90 12 34 56');
  const [name, setName] = useState('Kofi Mensah');
  const [password, setPassword] = useState('••••••••');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLoginSuccess(name || 'Utilisateur RONIKOV', role);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="bg-white border-2 border-black max-w-md w-full p-6 space-y-6 font-mono-code relative text-black">
        <button
          onClick={onClose}
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

        {/* Role Picker */}
        <div className="grid grid-cols-3 gap-1 border border-black p-1 text-xs">
          <button
            onClick={() => setRole('CLIENT')}
            className={`py-2 font-bold uppercase ${
              role === 'CLIENT' ? 'bg-black text-white' : 'bg-white text-black'
            }`}
          >
            Client
          </button>
          <button
            onClick={() => setRole('STATION_PRO')}
            className={`py-2 font-bold uppercase ${
              role === 'STATION_PRO' ? 'bg-black text-white' : 'bg-white text-black'
            }`}
          >
            Gérant Pro
          </button>
          <button
            onClick={() => setRole('ADMIN')}
            className={`py-2 font-bold uppercase ${
              role === 'ADMIN' ? 'bg-black text-white' : 'bg-white text-black'
            }`}
          >
            Admin
          </button>
        </div>

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

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase block text-black">
              Numéro de Téléphone Togolais (+228)
            </label>
            <div className="flex border border-black">
              <span className="px-3 py-2 bg-neutral-100 border-r border-black font-bold text-xs text-neutral-700 flex items-center">
                +228
              </span>
              <input
                type="text"
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
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-2.5 border border-black text-xs font-bold focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-black text-white font-bold text-xs uppercase tracking-wider hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 border border-black"
          >
            <span>{mode === 'login' ? 'Se Connecter' : 'Créer Mon Compte'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-xs pt-2 border-t border-neutral-200">
          <button
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
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
