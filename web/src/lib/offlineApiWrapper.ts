/**
 * Enhanced API with Offline Support
 * Wraps the API client to add caching and offline fallback
 */

import { venueApi, pitchApi, sessionApi, Venue, Pitch, Session, PaginatedResponse } from './api';
import { offlineAPI } from './offlineAPI';

export const offlineVenueApi = {
  list: async (limit = 50, cursor?: string): Promise<PaginatedResponse<Venue>> => {
    const apiCall = () => venueApi.list(limit, cursor);
    try {
      const result = await apiCall();
      // Cache each venue
      result.data.forEach((venue) => offlineAPI.cacheVenue(venue));
      return result;
    } catch (error) {
      // If offline, return cached venues
      if (!offlineAPI.isConnected()) {
        const cached = await offlineAPI.getCachedVenues();
        return {
          data: cached,
          has_more: false,
        };
      }
      throw error;
    }
  },

  getById: async (id: string): Promise<Venue> => {
    try {
      const result = await venueApi.getById(id);
      await offlineAPI.cacheVenue(result);
      return result;
    } catch (error) {
      // Try cache
      const cached = await offlineAPI.getCachedVenue(id);
      if (cached) {
        console.warn(`Using cached venue ${id} (offline)`);
        return cached;
      }
      throw error;
    }
  },

  create: async (data: Omit<Venue, 'id' | 'created_at' | 'updated_at'>): Promise<Venue> => {
    if (!offlineAPI.isConnected()) {
      throw new Error('Cannot create venue while offline');
    }
    const result = await venueApi.create(data);
    await offlineAPI.cacheVenue(result);
    return result;
  },

  update: async (
    id: string,
    data: Partial<Venue>,
    versionToken: string
  ): Promise<Venue> => {
    if (!offlineAPI.isConnected()) {
      throw new Error('Cannot update venue while offline');
    }
    const result = await venueApi.update(id, data, versionToken);
    await offlineAPI.cacheVenue(result);
    return result;
  },
};

export const offlinePitchApi = {
  list: async (limit = 50, cursor?: string): Promise<PaginatedResponse<Pitch>> => {
    try {
      const result = await pitchApi.list(limit, cursor);
      // Cache each pitch
      result.data.forEach((pitch) => offlineAPI.cachePitch(pitch));
      return result;
    } catch (error) {
      // If offline, return cached pitches
      if (!offlineAPI.isConnected()) {
        const cached = await offlineAPI.getCachedPitches();
        return {
          data: cached,
          has_more: false,
        };
      }
      throw error;
    }
  },

  getById: async (id: string): Promise<Pitch> => {
    try {
      const result = await pitchApi.getById(id);
      await offlineAPI.cachePitch(result);
      return result;
    } catch (error) {
      // Try cache
      const cached = await offlineAPI.getCachedPitch(id);
      if (cached) {
        console.warn(`Using cached pitch ${id} (offline)`);
        return cached;
      }
      throw error;
    }
  },

  create: async (data: Omit<Pitch, 'id' | 'created_at' | 'updated_at'>): Promise<Pitch> => {
    if (!offlineAPI.isConnected()) {
      throw new Error('Cannot create pitch while offline');
    }
    const result = await pitchApi.create(data);
    await offlineAPI.cachePitch(result);
    return result;
  },
};

export const offlineSessionApi = {
  list: async (limit = 50, cursor?: string): Promise<PaginatedResponse<Session>> => {
    try {
      const result = await sessionApi.list(limit, cursor);
      // Cache each session
      result.data.forEach((session) => offlineAPI.cacheSession(session));
      return result;
    } catch (error) {
      // If offline, return cached sessions
      if (!offlineAPI.isConnected()) {
        const cached = await offlineAPI.getCachedSessions();
        return {
          data: cached,
          has_more: false,
        };
      }
      throw error;
    }
  },

  getById: async (id: string): Promise<Session> => {
    try {
      const result = await sessionApi.getById(id);
      await offlineAPI.cacheSession(result);
      return result;
    } catch (error) {
      // Try cache
      const cached = await offlineAPI.getCachedSession(id);
      if (cached) {
        console.warn(`Using cached session ${id} (offline)`);
        return cached;
      }
      throw error;
    }
  },

  create: async (data: Omit<Session, 'id' | 'created_at' | 'updated_at'>): Promise<Session> => {
    if (!offlineAPI.isConnected()) {
      throw new Error('Cannot create session while offline');
    }
    const result = await sessionApi.create(data);
    await offlineAPI.cacheSession(result);
    return result;
  },
};
