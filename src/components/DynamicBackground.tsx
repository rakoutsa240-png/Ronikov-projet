import React, { useState, useEffect } from 'react';

import bgStation from '../assets/images/gas_station_bg_1785887453945.webp';
import bgManager from '../assets/images/station_manager_happy_1785888750849.webp';
import bgCustomer from '../assets/images/happy_customer_refuel_1785888766342.webp';

const BACKGROUND_PHOTOS = [
  { id: 'station-modern', src: bgStation },
  { id: 'manager-happy', src: bgManager },
  { id: 'customer-refuel', src: bgCustomer },
];

interface DynamicBackgroundProps {
  children: React.ReactNode;
}

// Station photos fade into each other behind the pages. The floating panel that used to control them
// covered buttons on phones (map, booking, notifications), so the slideshow now simply runs on its own.
export const DynamicBackground: React.FC<DynamicBackgroundProps> = ({ children }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Visitors who asked their phone for less motion keep the first photo.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % BACKGROUND_PHOTOS.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative min-h-screen w-full bg-neutral-950 text-white overflow-hidden flex flex-col justify-between selection:bg-amber-400 selection:text-black">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {BACKGROUND_PHOTOS.map((photo, idx) => (
          <div
            key={photo.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === currentIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
            }`}
            style={{ transitionProperty: 'opacity, transform' }}
          >
            <img
              src={photo.src}
              alt=""
              loading={idx === 0 ? 'eager' : 'lazy'}
              className="w-full h-full object-cover object-center filter saturate-110 brightness-90"
            />
          </div>
        ))}

        {/* Dark overlay so text stays readable on every photo */}
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            backgroundImage: 'radial-gradient(circle at 50% 30%, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.85) 100%)',
          }}
        />

        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:32px_32px] opacity-40" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-between">{children}</div>
    </div>
  );
};
