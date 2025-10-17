/**
 * Offline API Wrapper
 * Intercepts API calls and provides cached responses when offline
 */

import { Venue, Pitch, Session } from './api';
import { cacheManager } from './cacheManager';

export interface OfflineCapabilities {
  isOnline: boolean;
  hasCachedData: boolean;
  cacheSize: number;
}

class OfflineAPI {
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        console.log('App is online');
        this.retryFailedRequests();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        console.log('App is offline');
      });
    }
  }

  async getCapabilities(): Promise<OfflineCapabilities> {
    const cachedVenues = await cacheManager.getAll<Venue>('venues');
    const cachedPitches = await cacheManager.getAll<Pitch>('pitches');
    const cachedSessions = await cacheManager.getAll<Session>('sessions');

    const cacheSize =
      cachedVenues.length +
      cachedPitches.length +
      cachedSessions.length;

    return {
      isOnline: this.isOnline,
      hasCachedData: cacheSize > 0,
      cacheSize,
    };
  }

  async cacheVenue(venue: Venue): Promise<void> {
    await cacheManager.set('venues', venue.id, venue, 7 * 24 * 60 * 60 * 1000); // 7 days
  }

  async cachePitch(pitch: Pitch): Promise<void> {
    await cacheManager.set('pitches', pitch.id, pitch, 7 * 24 * 60 * 60 * 1000); // 7 days
  }

  async cacheSession(session: Session): Promise<void> {
    await cacheManager.set('sessions', session.id, session, 24 * 60 * 60 * 1000); // 1 day
  }

  async getCachedVenue(id: string): Promise<Venue | null> {
    return cacheManager.get<Venue>('venues', id);
  }

  async getCachedVenues(): Promise<Venue[]> {
    return cacheManager.getAll<Venue>('venues');
  }

  async getCachedPitch(id: string): Promise<Pitch | null> {
    return cacheManager.get<Pitch>('pitches', id);
  }

  async getCachedPitches(): Promise<Pitch[]> {
    return cacheManager.getAll<Pitch>('pitches');
  }

  async getCachedSession(id: string): Promise<Session | null> {
    return cacheManager.get<Session>('sessions', id);
  }

  async getCachedSessions(): Promise<Session[]> {
    return cacheManager.getAll<Session>('sessions');
  }

  /**
   * Wrap API calls with offline fallback
   */
  async withOfflineFallback<T>(
    apiCall: () => Promise<T>,
    cacheKey: string,
    storeName: string,
    ttl?: number
  ): Promise<T> {
    try {
      const result = await apiCall();
      // Cache successful response
      await cacheManager.set(storeName, cacheKey, result, ttl);
      return result;
    } catch (error) {
      // If offline, try to use cache
      if (!this.isOnline) {
        const cached = await cacheManager.get<T>(storeName, cacheKey);
        if (cached) {
          console.warn(`Using cached data for ${cacheKey} (offline)`);
          return cached;
        }
      }
      // Re-throw if no cache available
      throw error;
    }
  }

  /**
   * Queue failed requests for retry when online
   */
  async queueRequest(
    method: string,
    url: string,
    body?: unknown
  ): Promise<string> {
    const requestId = await cacheManager.logRequest(method, url, body, 'pending');
    return requestId;
  }

  /**
   * Mark request as completed
   */
  async completeRequest(requestId: string): Promise<void> {
    await cacheManager.updateRequestStatus(requestId, 'success');
  }

  /**
   * Mark request as failed
   */
  async failRequest(requestId: string): Promise<void> {
    await cacheManager.updateRequestStatus(requestId, 'failed');
  }

  /**
   * Retry all pending requests
   */
  private async retryFailedRequests(): Promise<void> {
    // This will be called by the backend API wrapper
    console.log('Ready to retry pending requests');
  }

  isConnected(): boolean {
    return this.isOnline;
  }
}

export const offlineAPI = new OfflineAPI();
