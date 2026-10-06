import React, { useState } from 'react';
import { Crosshair, Plus, X } from 'lucide-react';
import { api, ApiError } from '../api';
import { locateUser } from '../geo';
import { STATION_BRANDS } from '../../shared/stations';
import { FuelType, Station } from '../types';

interface AddStationFormProps {
  onAdded: (station: Station) => void;
  onClose: () => void;
}

const FUELS: { type: FuelType; label: string }[] = [
  { type: 'SUPER', label: 'Super' },
  { type: 'GAZOLE', label: 'Gazole' },
  { type: 'MELANGE', label: 'Mélange' },
  { type: 'KEROSENE', label: 'Kérosène' },
];

const AMENITIES = ['Boutique 24/7', 'Gonflage', 'Vidange', 'Lavage', 'Distributeur DAB', 'Toilettes'];

const inputClass =
  'w-full bg-black border border-neutral-700 text-white px-3 py-2 text-xs rounded-lg focus:outline-none focus:border-amber-400';

// Admin form to add a station. Tanks left blank start empty with a 20 000 L capacity and the official price.
export const AddStationForm: React.FC<AddStationFormProps> = ({ onAdded, onClose }) => {
  const [form, setForm] = useState({
    name: '',
    brand: STATION_BRANDS[0] as string,
    district: '',
    city: 'Lomé',
    address: '',
    phone: '',
    operatingHours: '06:00 - 22:00',
    lat: '',
    lng: '',
    isPartner: false,
  });
  const [amenities, setAmenities] = useState<string[]>([]);
  const [stock, setStock] = useState<Record<FuelType, string>>({ SUPER: '', GAZOLE: '', MELANGE: '', KEROSENE: '' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  const useMyPosition = async () => {
    setLocating(true);
    setError(null);
    try {
      const pos = await locateUser();
      setForm((f) => ({ ...f, lat: pos.lat.toFixed(5), lng: pos.lng.toFixed(5) }));
    } catch (e) {
      setError(`${(e as Error).message} Vous pouvez aussi la copier depuis Google Maps (appui long sur la station).`);
    } finally {
      setLocating(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const lat = Number(form.lat.replace(',', '.'));
    const lng = Number(form.lng.replace(',', '.'));
    if (!form.lat || !form.lng || Number.isNaN(lat) || Number.isNaN(lng)) {
      setError('Indiquez la position GPS de la station (latitude et longitude).');
      return;
    }
    const fuels = Object.fromEntries(
      FUELS.filter(({ type }) => stock[type] !== '').map(({ type }) => [type, { stockLiters: Number(stock[type]) }]),
    );
    setSaving(true);
    setError(null);
    try {
      const station = await api.createStation({ ...form, lat, lng, amenities, fuels });
      onAdded(station);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ajout impossible, réessayez.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="p-5 border border-amber-400/60 bg-neutral-950 rounded-xl space-y-4 text-xs">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-amber-400">Nouvelle station</h3>
        <button type="button" onClick={onClose} aria-label="Fermer" className="text-neutral-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-neutral-400 font-bold uppercase text-[11px]">Nom</span>
          <input required value={form.name} onChange={set('name')} placeholder="Oryx Adidogomé" className={inputClass} />
        </label>
        <label className="space-y-1">
          <span className="text-neutral-400 font-bold uppercase text-[11px]">Enseigne</span>
          <select value={form.brand} onChange={set('brand')} className={inputClass}>
            {STATION_BRANDS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-neutral-400 font-bold uppercase text-[11px]">Quartier</span>
          <input required value={form.district} onChange={set('district')} placeholder="Adidogomé" className={inputClass} />
        </label>
        <label className="space-y-1">
          <span className="text-neutral-400 font-bold uppercase text-[11px]">Ville</span>
          <input required value={form.city} onChange={set('city')} className={inputClass} />
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-neutral-400 font-bold uppercase text-[11px]">Adresse</span>
          <input required value={form.address} onChange={set('address')} placeholder="Route de Kpalimé, près du marché" className={inputClass} />
        </label>
        <label className="space-y-1">
          <span className="text-neutral-400 font-bold uppercase text-[11px]">Téléphone</span>
          <input required value={form.phone} onChange={set('phone')} placeholder="+228 22 00 00 00" className={inputClass} />
        </label>
        <label className="space-y-1">
          <span className="text-neutral-400 font-bold uppercase text-[11px]">Horaires</span>
          <input required value={form.operatingHours} onChange={set('operatingHours')} className={inputClass} />
        </label>
      </div>

      <div className="space-y-1">
        <span className="text-neutral-400 font-bold uppercase text-[11px]">Position GPS</span>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
          <input value={form.lat} onChange={set('lat')} placeholder="Latitude (ex. 6.1725)" inputMode="decimal" className={inputClass} />
          <input value={form.lng} onChange={set('lng')} placeholder="Longitude (ex. 1.2314)" inputMode="decimal" className={inputClass} />
          <button
            type="button"
            onClick={useMyPosition}
            disabled={locating}
            className="px-3 py-2 border border-neutral-700 rounded-lg font-bold text-white hover:border-amber-400 flex items-center justify-center gap-1.5"
          >
            <Crosshair className="w-3.5 h-3.5" />
            {locating ? 'Recherche…' : 'Je suis à la station'}
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <span className="text-neutral-400 font-bold uppercase text-[11px]">Services</span>
        <div className="flex flex-wrap gap-2">
          {AMENITIES.map((a) => (
            <label key={a} className="flex items-center gap-1.5 px-2 py-1 border border-neutral-800 rounded-md cursor-pointer">
              <input
                type="checkbox"
                checked={amenities.includes(a)}
                onChange={(e) => setAmenities((prev) => (e.target.checked ? [...prev, a] : prev.filter((x) => x !== a)))}
                className="accent-amber-400"
              />
              <span className="text-neutral-200">{a}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <span className="text-neutral-400 font-bold uppercase text-[11px]">Stock de départ en litres (vide si inconnu)</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {FUELS.map(({ type, label }) => (
            <label key={type} className="space-y-1">
              <span className="text-neutral-500 text-[11px]">{label}</span>
              <input
                type="number"
                min={0}
                max={20000}
                value={stock[type]}
                onChange={(e) => setStock((s) => ({ ...s, [type]: e.target.value }))}
                className={inputClass}
              />
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.isPartner} onChange={set('isPartner')} className="accent-amber-400" />
        <span className="text-neutral-200 font-bold">Station partenaire (réservations ouvertes)</span>
      </label>

      {error && (
        <p role="alert" className="font-bold text-red-300 border border-red-500/60 bg-red-500/10 p-3 rounded-lg">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full sm:w-auto px-5 py-2.5 bg-amber-400 text-black font-black rounded-lg flex items-center justify-center gap-2 disabled:opacity-60"
      >
        <Plus className="w-4 h-4" />
        {saving ? 'Ajout…' : 'Ajouter la station'}
      </button>
    </form>
  );
};
