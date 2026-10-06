import React from 'react';
import { Star } from 'lucide-react';
import { toggleFavorite, useFavorites } from '../storage';

// Star that adds or removes a station from the visitor's favourites (kept on this phone).
export const FavoriteButton: React.FC<{ stationId: string; className?: string }> = ({ stationId, className = '' }) => {
  const isFavorite = useFavorites().includes(stationId);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggleFavorite(stationId);
      }}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      className={`p-2 rounded-lg border shrink-0 transition-colors ${
        isFavorite ? 'border-amber-400 bg-amber-400/10 text-amber-400' : 'border-neutral-700 text-neutral-400 hover:text-amber-300'
      } ${className}`}
    >
      <Star className={`w-5 h-5 ${isFavorite ? 'fill-amber-400' : ''}`} />
    </button>
  );
};
