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
  id: number;
  venue_id: number;
  name: string;
  code?: string | null;
  sport?: string | null;
  level?: string | null;
  geometry?: any; // GeoJSON Polygon
  rotation_deg?: number | null;
  template_id?: string | null;
  status?: 'draft' | 'published';
  version_token?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PitchCreate {
  venue_id: number;
  name: string;
  code?: string;
  sport?: string;
  level?: string;
  geometry?: any;
  rotation_deg?: number;
  template_id?: string;
  status?: 'draft' | 'published';
}

export interface PitchUpdate {
  name?: string;
  code?: string;
  sport?: string;
  level?: string;
  geometry?: any;
  rotation_deg?: number;
  template_id?: string;
  status?: 'draft' | 'published';
}

export interface Session {
  id: number;
  team_id?: number | null;
  venue_id: number;
  pitch_id?: number | null;
  segment_id?: number | null;
  start_ts?: string | null;
  end_ts?: string | null;
  notes?: string | null;
  share_token?: string | null;
  version_token?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionCreate {
  venue_id: number;
  pitch_id?: number | null;
  team_id?: number;
  segment_id?: number | null;
  start_ts?: string;
  end_ts?: string;
  notes?: string;
  share_token?: string;
}

export interface SessionUpdate {
  pitch_id?: number | null;
  team_id?: number;
  segment_id?: number | null;
  start_ts?: string;
  end_ts?: string;
  notes?: string;
  share_token?: string;
}

export type AssetType = 'goal' | 'bench' | 'light' | 'cone' | 'flag' | 'marker' | 'tree' | 'fence' | 'net' | 'scoreboard' | 'water_fountain' | 'trash_bin' | 'camera' | 'other';

export type AssetIcon = 'fa-futbol' | 'fa-basketball' | 'fa-volleyball' | 'fa-baseball' | 'fa-flag' | 'fa-bullseye' | 'fa-chair' | 'fa-lightbulb' | 'fa-tree' | 'fa-cone-striped' | 'fa-water' | 'fa-dumpster' | 'fa-square-parking' | 'fa-restroom' | 'fa-kit-medical' | 'fa-camera' | 'fa-wifi' | 'fa-phone' | 'fa-door-open' | 'fa-fence';

export interface Asset {
  id: number;
  layout_id: number;
  zone_id?: number | null;
  name: string;
  asset_type: AssetType;
  icon?: AssetIcon | null;
  geometry?: any; // GeoJSON Point or LineString
  rotation_deg?: number | null;
  properties?: Record<string, any> | null;
  version_token: string;
  created_at: string;
  updated_at: string;
}

export interface AssetCreate {
  layout_id: number;
  zone_id?: number | null;
  name: string;
  asset_type: AssetType;
  icon?: AssetIcon | null;
  geometry?: any;
  rotation_deg?: number;
  properties?: Record<string, any>;
}

export interface AssetUpdate {
  zone_id?: number | null;
  name?: string;
  asset_type?: AssetType;
  icon?: AssetIcon | null;
  geometry?: any;
  rotation_deg?: number;
  properties?: Record<string, any>;
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
  list: async (venueId?: number, limit = 50, cursor?: string) => {
    const response = await apiClient.get<PaginatedResponse<Pitch>>('/pitches', {
      params: { venue_id: venueId, limit, cursor },
    });
    return response.data;
  },

  getById: async (id: number | string) => {
    const response = await apiClient.get<{ data: Pitch }>(`/pitches/${id}`);
    return response.data.data;
  },

  create: async (data: PitchCreate) => {
    const response = await apiClient.post<{ data: Pitch }>('/pitches', data);
    return response.data.data;
  },

  update: async (id: number | string, data: PitchUpdate, versionToken: string) => {
    const response = await apiClient.put<{ data: Pitch }>(`/pitches/${id}`, data, {
      headers: { 'If-Match': versionToken },
    });
    return response.data.data;
  },

  delete: async (id: number | string, versionToken: string) => {
    const response = await apiClient.delete(`/pitches/${id}`, {
      headers: { 'If-Match': versionToken },
    });
    return response.data;
  },
};

export const sessionApi = {
  list: async (venueId?: number, pitchId?: number, limit = 50, cursor?: string) => {
    const response = await apiClient.get<PaginatedResponse<Session>>('/sessions', {
      params: { venue_id: venueId, pitch_id: pitchId, limit, cursor },
    });
    return response.data;
  },

  getById: async (id: number | string) => {
    const response = await apiClient.get<{ data: Session }>(`/sessions/${id}`);
    return response.data.data;
  },

  create: async (data: SessionCreate) => {
    const response = await apiClient.post<{ data: Session }>('/sessions', data);
    return response.data.data;
  },

  update: async (id: number | string, data: SessionUpdate, versionToken: string) => {
    const response = await apiClient.put<{ data: Session }>(`/sessions/${id}`, data, {
      headers: { 'If-Match': versionToken },
    });
    return response.data.data;
  },

  delete: async (id: number | string, versionToken: string) => {
    const response = await apiClient.delete(`/sessions/${id}`, {
      headers: { 'If-Match': versionToken },
    });
    return response.data;
  },
};

export const assetApi = {
  list: async (layoutId?: number, zoneId?: number, assetType?: AssetType, limit = 50, cursor?: string) => {
    const response = await apiClient.get<PaginatedResponse<Asset>>('/assets', {
      params: { layout_id: layoutId, zone_id: zoneId, asset_type: assetType, limit, cursor },
    });
    return response.data;
  },

  getById: async (id: number | string) => {
    const response = await apiClient.get<{ data: Asset }>(`/assets/${id}`);
    return response.data.data;
  },

  create: async (data: AssetCreate) => {
    const response = await apiClient.post<{ data: Asset }>('/assets', data);
    return response.data.data;
  },

  update: async (id: number | string, data: AssetUpdate, versionToken: string) => {
    const response = await apiClient.put<{ data: Asset }>(`/assets/${id}`, data, {
      headers: { 'If-Match': versionToken },
    });
    return response.data.data;
  },

  delete: async (id: number | string, versionToken: string) => {
    const response = await apiClient.delete(`/assets/${id}`, {
      headers: { 'If-Match': versionToken },
    });
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
