import { useEffect } from 'react';
import type { AppProps } from 'next/app';
import { healthApi } from '@/lib/api';
import '@/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
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
  }, []);

  return <Component {...pageProps} />;
}
