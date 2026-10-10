import { useSyncExternalStore } from 'react';
import type { NotificationItem } from './types';

// Phone alerts (system notifications) for new Pleino messages, once the visitor allowed them.
// They show while Pleino is open or running in the background; a closed app gets them at its next opening.

export const alertsSupported = () => typeof window !== 'undefined' && 'Notification' in window;

const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useAlertPermission(): NotificationPermission | 'unsupported' {
  return useSyncExternalStore(
    subscribe,
    () => (alertsSupported() ? Notification.permission : 'unsupported'),
    () => 'unsupported',
  );
}

export async function enableAlerts(): Promise<NotificationPermission | 'unsupported'> {
  if (!alertsSupported()) return 'unsupported';
  const result = await Notification.requestPermission();
  listeners.forEach((listener) => listener());
  return result;
}

export async function showAlert(item: Pick<NotificationItem, 'id' | 'title' | 'message'>) {
  if (!alertsSupported() || Notification.permission !== 'granted') return;
  const options = { body: item.message, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag: item.id, data: { url: '/' } };
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) await registration.showNotification(item.title, options);
    else new Notification(item.title, options);
  } catch {
    // Some browsers refuse page notifications; the bell in the header still shows the message.
  }
}
