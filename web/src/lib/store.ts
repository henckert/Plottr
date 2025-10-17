import { create } from 'zustand';
import { Venue, Pitch, Session } from './api';

interface UIState {
  selectedVenueId: string | null;
  selectedPitchId: string | null;
  selectedSessionId: string | null;
  setSelectedVenue: (id: string | null) => void;
  setSelectedPitch: (id: string | null) => void;
  setSelectedSession: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedVenueId: null,
  selectedPitchId: null,
  selectedSessionId: null,
  setSelectedVenue: (id) => set({ selectedVenueId: id }),
  setSelectedPitch: (id) => set({ selectedPitchId: id }),
  setSelectedSession: (id) => set({ selectedSessionId: id }),
}));

interface DataState {
  venues: Venue[];
  pitches: Pitch[];
  sessions: Session[];
  setVenues: (venues: Venue[]) => void;
  setPitches: (pitches: Pitch[]) => void;
  setSessions: (sessions: Session[]) => void;
  addVenue: (venue: Venue) => void;
  addPitch: (pitch: Pitch) => void;
  addSession: (session: Session) => void;
}

export const useDataStore = create<DataState>((set) => ({
  venues: [],
  pitches: [],
  sessions: [],
  setVenues: (venues) => set({ venues }),
  setPitches: (pitches) => set({ pitches }),
  setSessions: (sessions) => set({ sessions }),
  addVenue: (venue) => set((state) => ({ venues: [...state.venues, venue] })),
  addPitch: (pitch) => set((state) => ({ pitches: [...state.pitches, pitch] })),
  addSession: (session) => set((state) => ({ sessions: [...state.sessions, session] })),
}));
