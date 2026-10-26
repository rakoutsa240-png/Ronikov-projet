export { distanceKm } from '../shared/stations';
import { getLang, t } from './i18n';

export interface LatLng {
  lat: number;
  lng: number;
}

export const formatDistance = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${getLang() === 'fr' ? km.toFixed(1).replace('.', ',') : km.toFixed(1)} km`);

// Opens the phone's maps app (or Google Maps in a browser) with directions to the station.
export const directionsUrl = (to: LatLng, from?: LatLng | null) =>
  `https://www.google.com/maps/dir/?api=1&destination=${to.lat},${to.lng}` + (from ? `&origin=${from.lat},${from.lng}` : '');

export function locateUser(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error(t('Votre navigateur ne donne pas votre position.')));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? t('Position refusée. Autorisez la localisation pour ce site dans votre navigateur.')
              : t('Position introuvable pour le moment, réessayez.'),
          ),
        ),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  });
}
