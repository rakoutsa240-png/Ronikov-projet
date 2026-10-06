import React from 'react';

interface DynamicBackgroundProps {
  children: React.ReactNode;
}

// Plain dark background behind every page. The station photos that used to fade into each other here
// made text harder to read and cost battery and mobile data on every visit.
export const DynamicBackground: React.FC<DynamicBackgroundProps> = ({ children }) => (
  <div className="relative min-h-screen w-full bg-neutral-950 text-white flex flex-col justify-between selection:bg-amber-400 selection:text-black">
    {children}
  </div>
);
