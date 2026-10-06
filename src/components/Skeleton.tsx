import React from 'react';

// Grey placeholders shown while the server answers, instead of an empty screen or stale demo data.
const Bar: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`rounded-md bg-neutral-800 animate-pulse ${className}`} />
);

export const StationSkeleton: React.FC = () => (
  <div aria-hidden="true" className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
    <Bar className="h-5 w-1/2" />
    <Bar className="h-4 w-1/3" />
    <div className="grid grid-cols-2 gap-2">
      <Bar className="h-14" />
      <Bar className="h-14" />
      <Bar className="h-14" />
      <Bar className="h-14" />
    </div>
    <div className="grid grid-cols-2 gap-2">
      <Bar className="h-10" />
      <Bar className="h-10" />
    </div>
  </div>
);

export const StationListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div role="status" aria-label="Chargement des stations" className="space-y-4">
    {Array.from({ length: count }, (_, i) => (
      <StationSkeleton key={i} />
    ))}
  </div>
);

export const PageSkeleton: React.FC = () => (
  <div role="status" aria-label="Chargement" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
    <Bar className="h-8 w-2/3 sm:w-1/3" />
    <Bar className="h-4 w-1/2 sm:w-1/4" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <StationSkeleton />
      <StationSkeleton />
    </div>
  </div>
);
