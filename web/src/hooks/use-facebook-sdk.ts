'use client';

import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void) {
  window.addEventListener('fb-sdk-ready', callback);
  return () => window.removeEventListener('fb-sdk-ready', callback);
}

function getSnapshot() {
  return typeof window !== 'undefined' && !!window.FB;
}

function getServerSnapshot() {
  return false;
}

/**
 * Returns whether `window.FB` is initialised and ready to use.
 */
export function useFacebookSdk() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
