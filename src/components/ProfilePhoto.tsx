import React, { useRef, useState } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { api, ApiError } from '../api';
import { squarePhoto } from '../photo';
import { AuthUser } from '../types';
import { Avatar } from './Avatar';

interface ProfilePhotoProps {
  user: AuthUser;
  onUserChanged: (user: AuthUser) => void;
  children?: React.ReactNode; // badges drawn over the photo
}

// Who sees the photo, in words that fit each role.
const HINTS: Record<AuthUser['role'], string> = {
  ATTENDANT: 'Les clients que vous servez voient votre photo : ils vous reconnaissent pour donner leur avis.',
  CLIENT: 'Le pompiste voit votre photo avec votre ticket : il vous reconnaît à la pompe.',
  STATION_PRO: 'Les clients que vous servez voient votre photo : ils vous reconnaissent pour donner leur avis.',
  ADMIN: 'Votre photo s’affiche à côté de votre nom.',
};

// The profile picture, with buttons to add, change or remove it.
export const ProfilePhoto: React.FC<ProfilePhotoProps> = ({ user, onUserChanged, children }) => {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // picking the same file again still triggers a change
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onUserChanged(await api.uploadPhoto(await squarePhoto(file)));
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : 'Envoi impossible, réessayez');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      onUserChanged(await api.removePhoto());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible, réessayez');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-4 shrink-0">
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          aria-label={user.photoUrl ? 'Changer ma photo' : 'Ajouter ma photo'}
          className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <Avatar name={user.name} photoUrl={user.photoUrl} className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl text-3xl shadow-xl" />
          <span className="absolute -bottom-1 -left-1 bg-amber-400 text-black p-1.5 rounded-full border-2 border-black">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          </span>
        </button>
        {children}
      </div>
      <div className="space-y-1.5 max-w-[16rem]">
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className="px-3 py-1.5 rounded-lg bg-amber-400 text-black hover:bg-amber-300 disabled:opacity-60"
          >
            {user.photoUrl ? 'Changer la photo' : 'Ajouter ma photo'}
          </button>
          {user.photoUrl && (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="px-3 py-1.5 rounded-lg border border-neutral-700 text-neutral-300 hover:border-rose-400 hover:text-rose-300 disabled:opacity-60 inline-flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Retirer
            </button>
          )}
        </div>
        <p className="text-[11px] leading-snug text-neutral-400 font-sans">{HINTS[user.role]}</p>
        {error && (
          <p role="alert" className="text-[11px] text-rose-300 font-sans">
            {error}
          </p>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={choose} />
    </div>
  );
};
