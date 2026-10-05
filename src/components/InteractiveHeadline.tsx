import React, { useState } from 'react';
import { Zap } from 'lucide-react';

export const InteractiveHeadline: React.FC = () => {
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);
  const [clickedWord, setClickedWord] = useState<string | null>(null);

  const handleWordClick = (word: string) => {
    setClickedWord(word);
    setTimeout(() => setClickedWord(null), 1000);
  };

  return (
    <div className="space-y-6">
      {/* Main Interactive Headline Container */}
      <h1
        className={`text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-white leading-[1.02] uppercase transition-all duration-300 max-w-5xl select-none font-syne font-black tracking-tight`}
      >
        {/* Line 1: NE FAITES PLUS */}
        <span className="block">
          <span
            onMouseEnter={() => setHoveredWord('ne-faites')}
            onMouseLeave={() => setHoveredWord(null)}
            onClick={() => handleWordClick('ne-faites')}
            className={`inline-block transition-all duration-200 cursor-pointer ${
              hoveredWord === 'ne-faites' ? 'text-amber-300 scale-105 -translate-y-1 glow-text-gold' : ''
            }`}
          >
            NE FAITES{' '}
          </span>
          <span
            onMouseEnter={() => setHoveredWord('plus')}
            onMouseLeave={() => setHoveredWord(null)}
            onClick={() => handleWordClick('plus')}
            className={`inline-block transition-all duration-200 cursor-pointer ml-3 ${
              hoveredWord === 'plus' ? 'text-cyan-300 scale-110 -translate-y-1 glow-text-cyan' : ''
            }`}
          >
            PLUS
          </span>
        </span>

        {/* Line 2: JAMAIS LA QUEUE */}
        <span className="block mt-1 relative">
          <span
            onMouseEnter={() => setHoveredWord('jamais')}
            onMouseLeave={() => setHoveredWord(null)}
            onClick={() => handleWordClick('jamais')}
            className={`inline-block animated-gradient-text transition-all duration-300 cursor-pointer transform hover:scale-105 ${
              clickedWord === 'jamais' ? 'animate-bounce' : ''
            }`}
          >
            JAMAIS LA QUEUE
          </span>

          {/* Interactive Tooltip Badge on Hover */}
          {hoveredWord === 'jamais' && (
            <span className="inline-flex items-center gap-1.5 ml-4 px-3 py-1 bg-amber-400 text-black text-xs font-mono-code font-extrabold uppercase rounded-full border border-black shadow-2xl animate-fadeIn align-middle">
              <Zap className="w-4 h-4 fill-black" />
              <span>Accès Prioritaire Express Togo</span>
            </span>
          )}
        </span>

        {/* Line 3: POUR VOTRE CARBURANT */}
        <span className="block mt-1">
          <span
            onMouseEnter={() => setHoveredWord('pour-votre')}
            onMouseLeave={() => setHoveredWord(null)}
            onClick={() => handleWordClick('pour-votre')}
            className={`inline-block transition-all duration-200 cursor-pointer ${
              hoveredWord === 'pour-votre' ? 'text-neutral-300 scale-105' : ''
            }`}
          >
            POUR VOTRE{' '}
          </span>

          <span
            onMouseEnter={() => setHoveredWord('carburant')}
            onMouseLeave={() => setHoveredWord(null)}
            onClick={() => handleWordClick('carburant')}
            className={`inline-block transition-all duration-300 cursor-pointer ${
              hoveredWord === 'carburant' ? 'text-amber-400 scale-110 glow-text-gold' : 'text-white'
            }`}
          >
            CARBURANT.
          </span>
        </span>
      </h1>
    </div>
  );
};
