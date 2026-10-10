import React from 'react';

// Pleino mark: a gold fuel drop carrying the red star of the Togolese flag.
// The same drawing is used for the app icons (public/icons, android/) and the share image.
export const LogoMark: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
    <path d="M24 3.5S9.5 19.6 9.5 30a14.5 14.5 0 0 0 29 0C38.5 19.6 24 3.5 24 3.5z" fill="#ffc81e" />
    <path
      d="M24 20.5l2.55 5.17 5.7.83-4.13 4.02.98 5.68L24 33.52l-5.1 2.68.98-5.68-4.13-4.02 5.7-.83z"
      fill="#d21034"
    />
  </svg>
);

// Mark and name, for the header and footer (always drawn on the green or dark brand band).
export const Logo: React.FC<{ subtitle?: string }> = ({ subtitle }) => (
  <span className="flex items-center gap-2">
    <LogoMark className="w-9 h-9 shrink-0" />
    <span className="leading-none">
      <span className="font-display block text-[22px] font-extrabold tracking-wide text-white">Pleino</span>
      {subtitle && <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70 mt-1">{subtitle}</span>}
    </span>
  </span>
);
