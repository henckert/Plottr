import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Types (from backend OpenAPI - matches src/schemas/venues.schema.ts)
export interface Venue {
  id: number;
  club_id?: number;
  name: string;
  address?: string;
  center_point?: any; // GeoJSON Point
  bbox?: any; // GeoJSON Polygon (venue boundary)
  tz?: string;
  published?: boolean;
  version_token?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VenueCreate {
  club_id: number;
  name: string;
  address?: string;
  center_point?: any;
  bbox?: any;
  tz?: string;
  published?: boolean;
}

export interface VenueUpdate {
  name?: string;
  address?: string;
  center_point?: any;
  bbox?: any;
  tz?: string;
  published?: boolean;
}

export interface Pitch {
  id: string;
  venue_id: string;
  name: string;
  surface: string;
  boundary: GeoJSON.Polygon;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  pitch_id: string;
  name: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface GeoJSON {
  Point: {
    type: 'Point';
    coordinates: [number, number];
  };
  Polygon: {
    type: 'Polygon';
    coordinates: [number, number][][];
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  next_cursor?: string;
  has_more: boolean;
}

export interface HealthResponse {
  ok: boolean;
  timestamp: string;
  uptime: number;
  database?: {
    healthy: boolean;
    latency?: number;
  };
  environment: string;
  version: string;
}

// API Endpoints

export const venueApi = {
  list: async (limit = 50, cursor?: string) => {
    const response = await apiClient.get<PaginatedResponse<Venue>>('/venues', {
      params: { limit, cursor },
    });
    return response.data;
  },

  getById: async (id: number | string) => {
    const response = await apiClient.get<{ data: Venue }>(`/venues/${id}`);
    return response.data.data;
  },

  create: async (data: VenueCreate) => {
    const response = await apiClient.post<{ data: Venue }>('/venues', data);
    return response.data.data;
  },

  update: async (id: number | string, data: VenueUpdate, versionToken: string) => {
    const response = await apiClient.put<{ data: Venue }>(`/venues/${id}`, data, {
      headers: { 'If-Match': versionToken },
    });
    return response.data.data;
  },
};

export const pitchApi = {
  list: async (limit = 50, cursor?: string) => {
    const response = await apiClient.get<PaginatedResponse<Pitch>>('/pitches', {
      params: { limit, cursor },
    });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get<Pitch>(`/pitches/${id}`);
    return response.data;
  },

  create: async (data: Omit<Pitch, 'id' | 'created_at' | 'updated_at'>) => {
    const response = await apiClient.post<Pitch>('/pitches', data);
    return response.data;
  },
};

export const sessionApi = {
  list: async (limit = 50, cursor?: string) => {
    const response = await apiClient.get<PaginatedResponse<Session>>('/sessions', {
      params: { limit, cursor },
    });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get<Session>(`/sessions/${id}`);
    return response.data;
  },

  create: async (data: Omit<Session, 'id' | 'created_at' | 'updated_at'>) => {
    const response = await apiClient.post<Session>('/sessions', data);
    return response.data;
  },
};

export const healthApi = {
  check: async () => {
    const response = await axios.get<HealthResponse>(`${API_BASE_URL}/health`);
    return response.data;
  },

  checkDetailed: async () => {
    const response = await axios.get<HealthResponse>(`${API_BASE_URL}/healthz`);
    return response.data;
  },
};
