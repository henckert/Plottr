/**
 * Offline Status Hook
 * Provides offline state and cache capabilities to components
 */

import { useEffect, useState } from 'react';
import { offlineAPI, OfflineCapabilities } from '@/lib/offlineAPI';

export function useOfflineStatus() {
  const [capabilities, setCapabilities] = useState<OfflineCapabilities>({
    isOnline: true,
    hasCachedData: false,
    cacheSize: 0,
  });

  useEffect(() => {
    const updateCapabilities = async () => {
      const caps = await offlineAPI.getCapabilities();
      setCapabilities(caps);
    };

    updateCapabilities();

    // Update on online/offline events
    const handleOnline = () => {
      updateCapabilities();
    };

    const handleOffline = () => {
      updateCapabilities();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return capabilities;
}
