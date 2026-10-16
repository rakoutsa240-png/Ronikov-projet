import React, { useState } from 'react';
import { apiUrl } from '../api';

interface AvatarProps {
  name: string;
  photoUrl?: string | null;
  // Size and shape, e.g. "w-10 h-10 rounded-full text-base".
  className?: string;
}

// A person's profile photo, or the first letter of their name when they have none.
export const Avatar: React.FC<AvatarProps> = ({ name, photoUrl, className = 'w-10 h-10 rounded-full text-base' }) => {
  const [broken, setBroken] = useState<string | null>(null);
  const showPhoto = photoUrl && broken !== photoUrl;
  return showPhoto ? (
    <img
      src={apiUrl(photoUrl)}
      alt={`Photo de ${name}`}
      loading="lazy"
      onError={() => setBroken(photoUrl)}
      className={`${className} object-cover shrink-0 bg-neutral-800 border border-neutral-700`}
    />
  ) : (
    <span
      aria-hidden="true"
      className={`${className} shrink-0 inline-flex items-center justify-center bg-gradient-to-br from-amber-400 to-amber-600 text-black font-black`}
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
};
