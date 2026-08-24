import React, { useState, useEffect } from 'react';
import { Station, FuelType } from '../types';
import { Gauge } from './Gauge';
import {
  MapPin,
  Navigation,
  Clock,
  ShieldCheck,
  ChevronRight,
  Phone,
  Check,
  AlertCircle,
  Maximize2,
  Minimize2,
  Layers,
  Zap,
  Flame,
  Compass,
  Radio,
  Car,
  Bike,
  Footprints,
  Route,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface InteractiveMapProps {
  stations: Station[];
  selectedStation: Station | null;
  onSelectStation: (station: Station) => void;
  onBookStation: (station: Station) => void;
  selectedFuelFilter: FuelType | 'ALL';
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  stations,
  selectedStation,
  onSelectStation,
  onBookStation,
  selectedFuelFilter,
}) => {
  const [userLoc] = useState({ lat: 6.1700, lng: 1.2100, name: 'Votre Position (Lomé Centre)' });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapStyle, setMapStyle] = useState<'standard' | 'satellite' | 'dark'>('standard');
  const [travelMode, setTravelMode] = useState<'car' | 'moto' | 'foot'>('moto');
  const [hoveredStation, setHoveredStation] = useState<Station | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [vehicleProgress, setVehicleProgress] = useState(0);

  // Animate vehicle along route when navigating
  useEffect(() => {
    let interval: any;
    if (isNavigating && selectedStation) {
      interval = setInterval(() => {
        setVehicleProgress((prev) => (prev >= 100 ? 0 : prev + 1.5));
      }, 60);
    } else {
      setVehicleProgress(0);
    }
    return () => clearInterval(interval);
  }, [isNavigating, selectedStation]);

  // Filter stations based on fuel availability if filter is set
  const filteredStations = stations.filter((s) => {
    if (selectedFuelFilter === 'ALL') return true;
    return s.stock[selectedFuelFilter] && s.stock[selectedFuelFilter].availableLiters > 0;
  });

  // Calculate SVG coordinates for Lomé map bounds (lat 6.12 to 6.25, lng 1.15 to 1.28)
  const mapWidth = 1000;
  const mapHeight = 650;

  const getSvgCoords = (lat: number, lng: number) => {
    const minLat = 6.12;
    const maxLat = 6.25;
    const minLng = 1.15;
    const maxLng = 1.28;

    const x = ((lng - minLng) / (maxLng - minLng)) * mapWidth;
    const y = mapHeight - ((lat - minLat) / (maxLat - minLat)) * mapHeight;
    return {
      x: Math.max(60, Math.min(mapWidth - 60, x)),
      y: Math.max(60, Math.min(mapHeight - 60, y)),
    };
  };

  const userSvg = getSvgCoords(userLoc.lat, userLoc.lng);

  // Helper to determine status color for station
  const getStationStatusColor = (st: Station) => {
    const fuel = selectedFuelFilter === 'ALL' ? st.stock.SUPER : st.stock[selectedFuelFilter];
    if (!fuel || fuel.status === 'OUT_OF_STOCK' || fuel.availableLiters <= 0) {
      return { bg: '#dc2626', text: '#ffffff', border: '#fca5a5', statusText: 'Rupture', badgeBg: 'bg-red-600' };
    }
    if (fuel.status === 'LOW' || fuel.availableLiters < 2000) {
      return { bg: '#d97706', text: '#ffffff', border: '#fde68a', statusText: 'Stock Faible', badgeBg: 'bg-amber-600' };
    }
    return { bg: '#16a34a', text: '#ffffff', border: '#86efac', statusText: 'Disponible', badgeBg: 'bg-emerald-600' };
  };

  // Travel time estimation calculation
  const getRouteDetails = (station: Station | null) => {
    if (!station) return { distanceKm: 2.8, timeMinutes: 6, modeText: 'Moto' };
    const baseDist = 2.5 + (station.lat % 0.05) * 40;
    const roundedDist = Math.round(baseDist * 10) / 10;

    if (travelMode === 'moto') {
      return { distanceKm: roundedDist, timeMinutes: Math.round(roundedDist * 1.8), modeText: 'Moto / Zémidjan' };
    } else if (travelMode === 'car') {
      return { distanceKm: Math.round((roundedDist + 0.4) * 10) / 10, timeMinutes: Math.round(roundedDist * 2.8), modeText: 'Voiture' };
    } else {
      return { distanceKm: roundedDist, timeMinutes: Math.round(roundedDist * 12), modeText: 'À pied' };
    }
  };

  const routeDetails = getRouteDetails(selectedStation);

  return (
    <div
      className={`w-full border-2 border-black relative overflow-hidden flex flex-col transition-all duration-300 font-sans ${
        isFullscreen ? 'fixed inset-0 z-50 h-screen w-screen rounded-none border-none' : 'rounded-none bg-neutral-900'
      }`}
    >
      {/* Map Header Controls Toolbar */}
      <div className="bg-neutral-900 text-white border-b-2 border-black px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono-code z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-emerald-500 rounded-full animate-ping"></span>
            <span className="font-extrabold uppercase tracking-wider text-white text-sm">
              CARTE DYNAMIQUE & ITINÉRAIRE GPS — TOGO
            </span>
          </div>
          <span className="hidden sm:inline-block px-2.5 py-0.5 bg-black text-emerald-400 border border-emerald-500 font-bold rounded text-[11px]">
            {filteredStations.length} Stations
          </span>
        </div>

        {/* Travel Mode Selector (Voiture / Moto / Pied) */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex border-2 border-black bg-neutral-800 rounded-lg overflow-hidden p-0.5">
            <button
              onClick={() => setTravelMode('moto')}
              className={`px-3 py-1 text-xs font-extrabold uppercase flex items-center gap-1.5 transition-all rounded ${
                travelMode === 'moto' ? 'bg-amber-400 text-black shadow-md' : 'text-neutral-300 hover:text-white'
              }`}
            >
              <Bike className="w-4 h-4" />
              <span>Moto / Zém</span>
            </button>
            <button
              onClick={() => setTravelMode('car')}
              className={`px-3 py-1 text-xs font-extrabold uppercase flex items-center gap-1.5 transition-all rounded ${
                travelMode === 'car' ? 'bg-indigo-600 text-white shadow-md' : 'text-neutral-300 hover:text-white'
              }`}
            >
              <Car className="w-4 h-4" />
              <span>Voiture</span>
            </button>
            <button
              onClick={() => setTravelMode('foot')}
              className={`px-3 py-1 text-xs font-extrabold uppercase flex items-center gap-1.5 transition-all rounded ${
                travelMode === 'foot' ? 'bg-emerald-600 text-white shadow-md' : 'text-neutral-300 hover:text-white'
              }`}
            >
              <Footprints className="w-4 h-4" />
              <span>À Pied</span>
            </button>
          </div>

          {/* Map Theme Toggle */}
          <div className="flex border border-neutral-700 bg-black rounded overflow-hidden">
            <button
              onClick={() => setMapStyle('standard')}
              className={`px-2.5 py-1 text-[11px] font-bold uppercase transition-colors ${
                mapStyle === 'standard' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Plan RéeL
            </button>
            <button
              onClick={() => setMapStyle('satellite')}
              className={`px-2.5 py-1 text-[11px] font-bold uppercase transition-colors ${
                mapStyle === 'satellite' ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => setMapStyle('dark')}
              className={`px-2.5 py-1 text-[11px] font-bold uppercase transition-colors ${
                mapStyle === 'dark' ? 'bg-amber-600 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Nuit
            </button>
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="px-3 py-1 bg-white text-black hover:bg-neutral-200 font-extrabold uppercase text-[11px] flex items-center gap-1.5 shadow"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isFullscreen ? 'Réduire' : 'Plein Écran'}</span>
          </button>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div
        className={`relative w-full ${
          isFullscreen ? 'flex-1' : 'h-[520px] sm:h-[600px] md:h-[650px]'
        } overflow-hidden cursor-crosshair select-none ${
          mapStyle === 'standard' ? 'bg-[#f4f3f0]' : mapStyle === 'satellite' ? 'bg-[#0f172a]' : 'bg-[#121212]'
        }`}
      >
        <svg
          viewBox={`0 0 ${mapWidth} ${mapHeight}`}
          className="w-full h-full object-cover transition-transform duration-300 ease-out"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <defs>
            {/* Standard Map Patterns */}
            <pattern id="roadGrid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#e2e8f0" strokeWidth="1" />
            </pattern>

            {/* Ocean Waves Pattern */}
            <pattern id="oceanWaves" width="40" height="20" patternUnits="userSpaceOnUse">
              <path d="M 0 10 Q 10 0, 20 10 T 40 10" fill="none" stroke="#60a5fa" strokeWidth="1" opacity="0.4" />
            </pattern>

            {/* Ocean Gradient */}
            <linearGradient id="realOceanGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={mapStyle === 'standard' ? '#38bdf8' : '#0284c7'} />
              <stop offset="100%" stopColor={mapStyle === 'standard' ? '#0284c7' : '#0369a1'} />
            </linearGradient>

            {/* Lagoon Gradient */}
            <linearGradient id="lagoonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.9" />
            </linearGradient>

            <filter id="shadowFilter" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* LAND BASE LAYER */}
          <rect
            width={mapWidth}
            height={mapHeight}
            fill={mapStyle === 'standard' ? '#f5f3ef' : mapStyle === 'satellite' ? '#111827' : '#18181b'}
          />

          {/* REALISTIC URBAN BLOCKS & NEIGHBORHOODS */}
          {mapStyle === 'standard' && (
            <g opacity="0.7">
              {/* Agoè Urban Grid Blocks */}
              <rect x="250" y="40" width="120" height="90" fill="#e2e8f0" rx="4" />
              <rect x="380" y="30" width="140" height="80" fill="#e2e8f0" rx="4" />
              <rect x="540" y="40" width="160" height="100" fill="#e2e8f0" rx="4" />

              {/* Central Lomé Blocks */}
              <rect x="200" y="240" width="130" height="100" fill="#e2e8f0" rx="4" />
              <rect x="350" y="220" width="120" height="110" fill="#e2e8f0" rx="4" />
              <rect x="490" y="210" width="140" height="90" fill="#e2e8f0" rx="4" />
              <rect x="650" y="230" width="150" height="120" fill="#e2e8f0" rx="4" />

              {/* Port & Industrial Blocks */}
              <rect x="750" y="420" width="180" height="80" fill="#cbd5e1" rx="4" />
            </g>
          )}

          {/* GREEN PARKS & NATURAL RESERVES (REALISTIC GREEN) */}
          <g>
            {/* Jardin Public / Parc de la Réconciliation */}
            <path
              d="M 400,280 Q 450,260 480,290 T 430,340 Z"
              fill={mapStyle === 'standard' ? '#86efac' : '#15803d'}
              opacity="0.8"
              stroke="#4ade80"
              strokeWidth="1"
            />
            <text x="430" y="305" fill="#14532d" fontSize="9" fontFamily="sans-serif" fontWeight="bold">
              🌿 Jardin Public
            </text>

            {/* Golf Club / Agbalépédogan Green Zone */}
            <path
              d="M 280,110 Q 360,90 340,160 T 260,150 Z"
              fill={mapStyle === 'standard' ? '#bbf7d0' : '#166534'}
              opacity="0.75"
              stroke="#86efac"
              strokeWidth="1"
            />
            <text x="290" y="130" fill="#14532d" fontSize="9" fontFamily="sans-serif" fontWeight="bold">
              ⛳ Zone Verte Golf
            </text>
          </g>

          {/* WATER BODIES (LOMÉ LAGOON & OCEAN) */}
          {/* Lagune de Bè / Lac de Lomé */}
          <path
            d="M 520,310 Q 620,290 700,340 T 600,380 Z"
            fill="url(#lagoonGrad)"
            stroke="#0284c7"
            strokeWidth="1.5"
          />
          <text x="590" y="340" fill="#ffffff" fontSize="10" fontFamily="sans-serif" fontWeight="bold" opacity="0.9">
            💧 Lagune de Bè
          </text>

          {/* ATLANTIC OCEAN (Golfe de Guinée & Sandy Beach Coastline) */}
          {/* Sandy Beach Band */}
          <path
            d="M 0,510 Q 350,470 1000,520 L 1000,535 L 0,535 Z"
            fill={mapStyle === 'standard' ? '#fde68a' : '#78350f'}
            opacity="0.9"
          />
          <text x="180" y="522" fill="#92400e" fontSize="9" fontWeight="bold">
            🏖️ Plage de Lomé (Sable Fin)
          </text>

          {/* Ocean */}
          <path
            d="M 0,530 Q 350,490 1000,540 L 1000,650 L 0,650 Z"
            fill="url(#realOceanGrad)"
            stroke="#0284c7"
            strokeWidth="2"
          />
          <rect x="0" y="530" width={mapWidth} height="120" fill="url(#oceanWaves)" />

          <text
            x="500"
            y="595"
            fill="#ffffff"
            fontSize="14"
            fontFamily="Space Mono"
            fontWeight="bold"
            letterSpacing="6"
            textAnchor="middle"
          >
            🌊 GOLFE DE GUINÉE — OCÉAN ATLANTIQUE
          </text>

          {/* REALISTIC HIGHWAYS & STREET NETWORK */}
          {/* RN1 - Route Nationale 1 (North-South Golden Highway) */}
          <g filter="url(#shadowFilter)">
            <path
              d="M 480,650 L 510,320 L 490,0"
              stroke="#fbbf24"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <path
              d="M 480,650 L 510,320 L 490,0"
              stroke="#f59e0b"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path
              d="M 480,650 L 510,320 L 490,0"
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeDasharray="10,8"
            />
          </g>

          {/* Coastal Boulevard du 13 Janvier / Bd de la Marina */}
          <g filter="url(#shadowFilter)">
            <path
              d="M 30,500 Q 500,450 970,490"
              stroke="#3b82f6"
              strokeWidth="9"
              strokeLinecap="round"
            />
            <path
              d="M 30,500 Q 500,450 970,490"
              stroke="#2563eb"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d="M 30,500 Q 500,450 970,490"
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeDasharray="12,12"
            />
          </g>

          {/* Route de Kpalimé (Orange Arterial) */}
          <g filter="url(#shadowFilter)">
            <path d="M 510,320 L 60,200" stroke="#f97316" strokeWidth="8" strokeLinecap="round" />
            <path d="M 510,320 L 60,200" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="8,6" />
          </g>

          {/* Boulevard du 30 Août & Rocade (Secondary Major Roads) */}
          <g stroke={mapStyle === 'standard' ? '#ffffff' : '#475569'} strokeWidth="5" fill="none">
            <path d="M 120,200 Q 500,80 880,220" />
            <path d="M 510,320 L 880,330" />
            <path d="M 320,180 L 320,500" />
            <path d="M 700,120 L 700,480" />
          </g>

          {/* Road Labels */}
          <g fontFamily="sans-serif" fontSize="10" fontWeight="extrabold">
            <rect x="470" y="160" width="50" height="18" rx="3" fill="#f59e0b" />
            <text x="495" y="173" fill="#ffffff" textAnchor="middle">
              RN1
            </text>

            <rect x="220" y="465" width="120" height="18" rx="3" fill="#2563eb" />
            <text x="280" y="478" fill="#ffffff" textAnchor="middle">
              Bd du 13 Janvier
            </text>

            <rect x="220" y="235" width="100" height="18" rx="3" fill="#ea580c" />
            <text x="270" y="248" fill="#ffffff" textAnchor="middle">
              Rte Kpalimé
            </text>
          </g>

          {/* DYNAMIC VEHICLE ROUTING NAVIGATION PATH */}
          {selectedStation &&
            (() => {
              const stCoords = getSvgCoords(selectedStation.lat, selectedStation.lng);
              // Realistic multi-segment street path matching Lomé roads
              const pathD = `M ${userSvg.x},${userSvg.y} L ${userSvg.x},475 L ${stCoords.x},475 L ${stCoords.x},${stCoords.y}`;

              // Calculate intermediate vehicle position
              // Simple path interpolation
              let currentX = userSvg.x;
              let currentY = userSvg.y;

              if (vehicleProgress < 30) {
                const ratio = vehicleProgress / 30;
                currentX = userSvg.x;
                currentY = userSvg.y + (475 - userSvg.y) * ratio;
              } else if (vehicleProgress < 70) {
                const ratio = (vehicleProgress - 30) / 40;
                currentX = userSvg.x + (stCoords.x - userSvg.x) * ratio;
                currentY = 475;
              } else {
                const ratio = (vehicleProgress - 70) / 30;
                currentX = stCoords.x;
                currentY = 475 + (stCoords.y - 475) * ratio;
              }

              return (
                <g>
                  {/* Outer Glow Route */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={travelMode === 'moto' ? '#fbbf24' : travelMode === 'car' ? '#6366f1' : '#10b981'}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.5"
                    filter="url(#shadowFilter)"
                  />

                  {/* Inner Active Direction Path */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={travelMode === 'moto' ? '#f59e0b' : travelMode === 'car' ? '#4f46e5' : '#059669'}
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="10,6"
                    className="animate-pulse"
                  />

                  {/* Animated Traveling Vehicle Icon (Car / Moto) */}
                  {isNavigating && (
                    <g transform={`translate(${currentX}, ${currentY})`}>
                      <circle r="16" fill="#000000" />
                      <circle
                        r="14"
                        fill={travelMode === 'moto' ? '#f59e0b' : travelMode === 'car' ? '#4f46e5' : '#10b981'}
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      <text x="0" y="4" textAnchor="middle" fontSize="12">
                        {travelMode === 'moto' ? '🏍️' : travelMode === 'car' ? '🚗' : '🚶'}
                      </text>
                    </g>
                  )}

                  {/* Travel Time & Distance Badge on Midpoint */}
                  <g transform={`translate(${(userSvg.x + stCoords.x) / 2}, 460)`}>
                    <rect
                      x="-65"
                      y="-15"
                      width="130"
                      height="28"
                      rx="14"
                      fill="#000000"
                      stroke="#ffffff"
                      strokeWidth="2"
                      filter="url(#shadowFilter)"
                    />
                    <text x="0" y="3" fill="#ffffff" fontSize="11" fontFamily="sans-serif" fontWeight="extrabold" textAnchor="middle">
                      {travelMode === 'moto' ? '🏍️' : travelMode === 'car' ? '🚗' : '🚶'} {routeDetails.distanceKm} km • {routeDetails.timeMinutes} min
                    </text>
                  </g>
                </g>
              );
            })()}

          {/* USER LOCATION PIN */}
          <g transform={`translate(${userSvg.x}, ${userSvg.y})`}>
            <circle r="20" fill="#2563eb" fillOpacity="0.25" className="animate-ping" />
            <circle r="12" fill="#2563eb" stroke="#ffffff" strokeWidth="3" />
            <circle r="4" fill="#ffffff" />
            <g transform="translate(0, -22)">
              <rect x="-45" y="-12" width="90" height="20" rx="10" fill="#1e40af" stroke="#ffffff" strokeWidth="1.5" />
              <text x="0" y="2" fill="#ffffff" fontSize="10" fontFamily="sans-serif" fontWeight="extrabold" textAnchor="middle">
                📍 VOUS ICI
              </text>
            </g>
          </g>

          {/* REALISTIC STATION PIN MARKERS */}
          {filteredStations.map((st) => {
            const pos = getSvgCoords(st.lat, st.lng);
            const isSelected = selectedStation?.id === st.id;
            const statusInfo = getStationStatusColor(st);
            const primaryStock = selectedFuelFilter === 'ALL' ? st.stock.SUPER : st.stock[selectedFuelFilter];
            const price = primaryStock ? primaryStock.pricePerLiter : 725;

            return (
              <g
                key={st.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={() => onSelectStation(st)}
                onMouseEnter={() => setHoveredStation(st)}
                onMouseLeave={() => setHoveredStation(null)}
                className="cursor-pointer group"
              >
                {/* Selected Halo Pulse */}
                {isSelected && (
                  <circle r="28" fill="none" stroke="#2563eb" strokeWidth="3" strokeDasharray="6,4" className="animate-spin" style={{ animationDuration: '8s' }} />
                )}

                {/* Pin Card Base */}
                <rect
                  x="-20"
                  y="-20"
                  width="40"
                  height="40"
                  rx="10"
                  fill={isSelected ? '#000000' : '#ffffff'}
                  stroke={statusInfo.bg}
                  strokeWidth={isSelected ? '3.5' : '2.5'}
                  filter="url(#shadowFilter)"
                  className="transition-transform duration-200 group-hover:scale-110"
                />

                {/* Brand Initial */}
                <text
                  x="0"
                  y="4"
                  fill={isSelected ? '#ffffff' : '#000000'}
                  fontSize="15"
                  fontFamily="Space Mono"
                  fontWeight="extrabold"
                  textAnchor="middle"
                >
                  {st.brand.charAt(0)}
                </text>

                {/* Status Dot */}
                <circle cx="14" cy="-14" r="6" fill={statusInfo.bg} stroke="#ffffff" strokeWidth="2" />

                {/* Price Tag Badge */}
                <g transform="translate(0, 28)">
                  <rect
                    x="-32"
                    y="-10"
                    width="64"
                    height="18"
                    rx="9"
                    fill={statusInfo.bg}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  <text
                    x="0"
                    y="3"
                    fill="#ffffff"
                    fontSize="9"
                    fontFamily="Space Mono"
                    fontWeight="extrabold"
                    textAnchor="middle"
                  >
                    {price} F
                  </text>
                </g>

                {/* Station District Tag */}
                <g transform="translate(0, -28)">
                  <rect
                    x="-48"
                    y="-12"
                    width="96"
                    height="18"
                    rx="4"
                    fill="#000000"
                    stroke="#ffffff"
                    strokeWidth="1"
                    opacity="0.9"
                  />
                  <text
                    x="0"
                    y="1"
                    fill="#ffffff"
                    fontSize="9"
                    fontFamily="sans-serif"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {st.brand} {st.district.substring(0, 7)}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        {/* HOVER TOOLTIP FLOATING CARD */}
        {hoveredStation && (
          <div className="absolute top-4 right-4 z-30 bg-white text-black border-2 border-black p-4 rounded-xl shadow-2xl w-72 text-xs space-y-2 pointer-events-none animate-fadeIn">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
              <span className="px-2 py-0.5 bg-black text-white text-[10px] font-mono-code font-bold uppercase rounded">
                {hoveredStation.brand}
              </span>
              <span
                className={`px-2.5 py-0.5 text-[10px] font-bold text-white rounded-full ${
                  getStationStatusColor(hoveredStation).badgeBg
                }`}
              >
                {getStationStatusColor(hoveredStation).statusText}
              </span>
            </div>

            <h4 className="font-extrabold text-sm text-black uppercase font-mono-code">{hoveredStation.name}</h4>
            <p className="text-neutral-600 text-[11px] font-sans">{hoveredStation.address}</p>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-200 text-[11px] font-mono-code">
              <div>
                <span className="text-neutral-500 block">Attente:</span>
                <span className="font-bold text-black">{hoveredStation.queueTimeMinutes} min</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Stock Super:</span>
                <span className="font-bold text-emerald-600">
                  {hoveredStation.stock.SUPER.availableLiters} L
                </span>
              </div>
            </div>
          </div>
        )}

        {/* MAP LEGEND */}
        <div className="absolute bottom-4 left-4 z-20 bg-white/95 text-black border-2 border-black p-3 rounded-xl text-xs space-y-2 backdrop-blur-md shadow-xl max-w-xs font-mono-code">
          <div className="font-extrabold uppercase text-[11px] border-b border-neutral-200 pb-1 flex items-center justify-between text-black">
            <span>RÉSEAU ROUTIER TOGO</span>
            <Compass className="w-4 h-4 text-emerald-600 animate-spin" style={{ animationDuration: '25s' }} />
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-600"></span>
              <span>Disponible</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              <span>Stock Faible</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-600"></span>
              <span>Rupture</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-600"></span>
              <span>Vous Ici</span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Station Navigation Drawer & Turn-by-Turn GPS */}
      {selectedStation && (
        <div className="bg-white text-black p-4 sm:p-5 border-t-2 border-black flex flex-col md:flex-row items-start md:items-center justify-between gap-4 z-20">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 bg-black text-white text-[11px] font-mono-code font-extrabold uppercase rounded-sm">
                {selectedStation.brand}
              </span>
              <span className="text-xs font-mono-code text-neutral-600 uppercase font-bold">
                {selectedStation.district}, {selectedStation.city}
              </span>
              {selectedStation.isPartner && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono-code bg-emerald-100 text-emerald-800 border border-emerald-400 px-2 py-0.5 font-extrabold rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" /> PARTENAIRE CERTIFIÉ
                </span>
              )}
            </div>

            <h3 className="text-xl font-extrabold uppercase tracking-tight text-black font-mono-code">
              {selectedStation.name}
            </h3>

            {/* Travel Mode Navigation Summary Pill */}
            <div className="p-3 bg-neutral-100 border border-neutral-300 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs font-mono-code">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-black text-white rounded-md">
                  {travelMode === 'moto' ? <Bike className="w-4 h-4 text-amber-400" /> : travelMode === 'car' ? <Car className="w-4 h-4 text-indigo-400" /> : <Footprints className="w-4 h-4 text-emerald-400" />}
                </span>
                <div>
                  <div className="font-extrabold text-black">
                    ITINÉRAIRE EN {routeDetails.modeText.toUpperCase()} : {routeDetails.distanceKm} KM
                  </div>
                  <div className="text-neutral-600 text-[11px]">
                    Temps de trajet estimé : <strong className="text-black font-extrabold">{routeDetails.timeMinutes} minutes</strong> (Trafic Togo fluide)
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsNavigating(!isNavigating)}
                className={`px-4 py-2 font-extrabold text-xs uppercase rounded flex items-center gap-2 transition-all ${
                  isNavigating ? 'bg-amber-400 text-black border-2 border-black animate-pulse' : 'bg-black text-white hover:bg-neutral-800'
                }`}
              >
                <Route className="w-4 h-4" />
                <span>{isNavigating ? 'STOP NAVIGATION' : 'LANCER LE GPS DYNAMIQUE'}</span>
              </button>
            </div>
          </div>

          {/* Quick Gauge & Action Button */}
          <div className="flex items-center gap-6 w-full md:w-auto border-t md:border-t-0 md:border-l border-neutral-200 pt-3 md:pt-0 md:pl-6">
            <Gauge
              value={
                (selectedStation.stock.SUPER.availableLiters /
                  selectedStation.stock.SUPER.maxCapacityLiters) *
                100
              }
              size="sm"
              label="Stock Super"
              sublabel={`${selectedStation.stock.SUPER.availableLiters}L`}
            />

            <button
              onClick={() => onBookStation(selectedStation)}
              className="flex-1 md:flex-none px-7 py-3.5 bg-black text-white font-mono-code font-extrabold text-xs uppercase tracking-wider border-2 border-black hover:bg-neutral-800 transition-all shadow-lg flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
            >
              <span>Réserver le Carburant</span>
              <ChevronRight className="w-4 h-4 text-emerald-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


