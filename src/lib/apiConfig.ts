import { Capacitor } from '@capacitor/core';

export const getApiUrl = (path: string) => {
  if (Capacitor.isNativePlatform()) {
    return `https://ais-pre-mslwpeuwsczoqyuzqtdvnr-79659663319.asia-southeast1.run.app${path}`;
  }
  return path;
};
