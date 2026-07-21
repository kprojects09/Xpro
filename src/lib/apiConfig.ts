import { Capacitor } from '@capacitor/core';

export const getApiUrl = (path: string) => {
  if (Capacitor.isNativePlatform()) {
    // If we're on a real device, we need the full URL.
    // We prefer the current origin if it looks like a valid Cloud Run URL,
    // otherwise fallback to the hardcoded PRE URL.
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    if (origin && (origin.includes('run.app') || origin.includes('localhost'))) {
      return `${origin}${path}`;
    }
    return `https://ais-pre-mslwpeuwsczoqyuzqtdvnr-79659663319.asia-southeast1.run.app${path}`;
  }
  return path;
};
