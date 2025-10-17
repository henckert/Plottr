import { useEffect, useState } from 'react';
import type { AppProps } from 'next/app';
import { healthApi } from '@/lib/api';
import { useServiceWorker } from '@/lib/useServiceWorker';
import { cacheManager } from '@/lib/cacheManager';
import '@/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  const [isOnline, setIsOnline] = useState(true);
  
  // Register service worker for offline support
  useServiceWorker();

  useEffect(() => {
    // Initialize cache manager
    cacheManager.init().catch((err) => {
      console.warn('Failed to initialize cache:', err);
    });

    // Verify backend connectivity on app load
    const verifyHealth = async () => {
      try {
        await healthApi.check();
        console.log('Backend is healthy');
      } catch (error) {
        console.error('Backend health check failed:', error);
      }
    };

    verifyHealth();

    // Track online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <>
      {/* Offline banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-warning text-gray-900 px-4 py-3 text-center z-50 shadow-lg">
          <p className="font-semibold">
            ⚠️ You are offline. Some features may be limited. Cached data will be used.
          </p>
        </div>
      )}
      <div className={!isOnline ? 'pt-12' : ''}>
        <Component {...pageProps} />
      </div>
    </>
  );
}
