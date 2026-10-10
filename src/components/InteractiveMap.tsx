import React, { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import { ChevronRight, Crosshair, Maximize2, Minimize2, Navigation, ShieldCheck } from 'lucide-react';
import { Station, FuelType } from '../types';
import { Gauge } from './Gauge';
import { directionsUrl, distanceKm, formatDistance, LatLng } from '../geo';

interface InteractiveMapProps {
  stations: Station[];
  selectedStation: Station | null;
  onSelectStation: (station: Station) => void;
  onBookStation: (station: Station) => void;
  selectedFuelFilter: FuelType | 'ALL';
  userLocation: LatLng | null;
  locating: boolean;
  onLocate: () => void;
}

const LOME: L.LatLngTuple = [6.1725, 1.2314];

const STATUS = {
  OUT: { color: '#dc2626', label: 'Rupture' },
  LOW: { color: '#d97706', label: 'Stock faible' },
  OK: { color: '#16a34a', label: 'Disponible' },
};

function stationStatus(st: Station, fuel: FuelType | 'ALL') {
  const stock = fuel === 'ALL' ? st.stock.SUPER : st.stock[fuel];
  if (!stock || stock.status === 'OUT_OF_STOCK' || stock.availableLiters <= 0) return STATUS.OUT;
  if (stock.status === 'LOW') return STATUS.LOW;
  return STATUS.OK;
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

// A round pin with the brand's initial, coloured by stock, and the price underneath.
function stationIcon(st: Station, fuel: FuelType | 'ALL', selected: boolean) {
  const { color } = stationStatus(st, fuel);
  const price = (fuel === 'ALL' ? st.stock.SUPER : st.stock[fuel])?.pricePerLiter ?? 0;
  const size = selected ? 40 : 32;
  return L.divIcon({
    className: '',
    iconSize: [size, size + 18],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;font-family:'Space Mono',monospace">
      <div style="width:${size}px;height:${size}px;border-radius:9999px;background:${selected ? '#000' : '#fff'};color:${selected ? '#fff' : '#000'};border:3px solid ${color};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:${selected ? 16 : 14}px;box-shadow:0 2px 6px rgba(0,0,0,.35)">${escapeHtml(st.brand.charAt(0))}</div>
      <div style="background:${color};color:#fff;font-size:10px;font-weight:800;padding:0 6px;border-radius:9999px;white-space:nowrap;border:1px solid #fff">${price} F</div>
    </div>`,
  });
}

const userIcon = L.divIcon({
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  html: '<div style="width:20px;height:20px;border-radius:9999px;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 6px rgba(37,99,235,.25)"></div>',
});

// Frames every station on first load, then follows the visitor's position and the selected station.
function MapFocus({ stations, selected, user }: { stations: Station[]; selected: Station | null; user: LatLng | null }) {
  const map = useMap();
  const [framed, setFramed] = useState(false);

  useEffect(() => {
    if (framed || stations.length === 0) return;
    map.fitBounds(L.latLngBounds(stations.map((s) => [s.lat, s.lng] as L.LatLngTuple)), { padding: [40, 40], maxZoom: 14 });
    setFramed(true);
  }, [framed, map, stations]);

  useEffect(() => {
    if (user) map.flyTo([user.lat, user.lng], Math.max(map.getZoom(), 14));
  }, [map, user]);

  useEffect(() => {
    if (selected) map.flyTo([selected.lat, selected.lng], Math.max(map.getZoom(), 14));
  }, [map, selected]);

  return null;
}

// Leaflet measures its box once; it has to measure again when the box grows to full screen.
function ResizeOnChange({ trigger }: { trigger: unknown }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
  }, [map, trigger]);
  return null;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  stations,
  selectedStation,
  onSelectStation,
  onBookStation,
  selectedFuelFilter,
  userLocation,
  locating,
  onLocate,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const visible = useMemo(
    () =>
      stations.filter(
        (s) => selectedFuelFilter === 'ALL' || (s.stock[selectedFuelFilter] && s.stock[selectedFuelFilter].availableLiters > 0),
      ),
    [stations, selectedFuelFilter],
  );

  const selectedDistance = selectedStation && userLocation ? distanceKm(userLocation, selectedStation) : null;

  return (
    <div
      className={`w-full border-2 border-black relative overflow-hidden flex flex-col font-sans ${
        isFullscreen ? 'fixed inset-0 z-50 h-screen w-screen border-none' : 'bg-neutral-900'
      }`}
    >
      <div className="bg-neutral-900 text-white border-b-2 border-black px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono-code">
        <div className="flex items-center gap-3">
          <span className="font-extrabold tracking-wider text-sm">Carte des stations</span>
          <span className="px-2.5 py-0.5 bg-black text-emerald-400 border border-emerald-500 font-bold rounded text-xs">
            {visible.length} stations
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onLocate}
            disabled={locating}
            className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-black font-bold rounded flex items-center gap-1.5 disabled:opacity-60"
          >
            <Crosshair className="w-3.5 h-3.5" />
            {locating ? 'Localisation…' : userLocation ? 'Me relocaliser' : 'Me localiser'}
          </button>
          <button
            onClick={() => setIsFullscreen((v) => !v)}
            aria-label={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
            className="p-1.5 border border-neutral-700 hover:border-white rounded"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className={`relative ${isFullscreen ? 'flex-1' : 'h-[420px] sm:h-[520px]'}`}>
        <MapContainer center={LOME} zoom={12} scrollWheelZoom className="h-full w-full z-0">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapFocus stations={stations} selected={selectedStation} user={userLocation} />
          <ResizeOnChange trigger={isFullscreen} />
          {userLocation && <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon} title="Vous êtes ici" />}
          {visible.map((st) => (
            <Marker
              key={st.id}
              position={[st.lat, st.lng]}
              icon={stationIcon(st, selectedFuelFilter, selectedStation?.id === st.id)}
              title={`${st.name} (${stationStatus(st, selectedFuelFilter).label})`}
              zIndexOffset={selectedStation?.id === st.id ? 1000 : 0}
              eventHandlers={{ click: () => onSelectStation(st) }}
            />
          ))}
        </MapContainer>

        <div className="absolute bottom-3 left-3 z-[400] bg-white/95 text-black border-2 border-black p-2.5 rounded-lg text-xs font-mono-code grid grid-cols-2 gap-x-3 gap-y-1 shadow-lg">
          {[STATUS.OK, STATUS.LOW, STATUS.OUT].map((s) => (
            <span key={s.label} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-600" />
            Vous
          </span>
        </div>
      </div>

      {selectedStation && (
        <div className="bg-black text-white p-4 sm:p-5 border-t border-neutral-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 bg-brand-800 text-white text-xs font-extrabold rounded-full theme-fixed">
                {selectedStation.brand}
              </span>
              <span className="text-xs text-neutral-400 font-semibold">
                {selectedStation.district}, {selectedStation.city}
              </span>
              {selectedStation.isPartner && (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono-code bg-brand-500/15 text-brand-400 px-2 py-0.5 font-bold rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5" /> Partenaire
                </span>
              )}
            </div>
            <h3 className="text-xl font-extrabold tracking-tight font-mono-code">{selectedStation.name}</h3>
            <p className="text-xs text-neutral-400">
              {selectedStation.address}
              {selectedDistance !== null && (
                <strong className="text-white"> • à {formatDistance(selectedDistance)} à vol d'oiseau</strong>
              )}
            </p>
            <a
              href={directionsUrl(selectedStation, userLocation)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 border border-neutral-700 text-white font-bold text-xs rounded-full hover:bg-neutral-900"
            >
              <Navigation className="w-4 h-4" />
              Itinéraire
            </a>
          </div>

          <div className="flex items-center gap-6 w-full md:w-auto border-t md:border-t-0 md:border-l border-neutral-800 pt-3 md:pt-0 md:pl-6">
            <Gauge
              value={
                selectedStation.stock.SUPER.maxCapacityLiters > 0
                  ? (selectedStation.stock.SUPER.availableLiters / selectedStation.stock.SUPER.maxCapacityLiters) * 100
                  : 0
              }
              size="sm"
              label="Stock super"
              sublabel={`${selectedStation.stock.SUPER.availableLiters}L`}
            />
            <button
              onClick={() => onBookStation(selectedStation)}
              className="flex-1 md:flex-none px-7 py-3.5 bg-amber-400 text-black font-extrabold text-sm rounded-full hover:bg-amber-300 shadow-md shadow-amber-400/20 flex items-center justify-center gap-2"
            >
              <span>Réserver le carburant</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveMap;
