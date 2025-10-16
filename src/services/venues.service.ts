import { VenuesRepo } from '../data/venues.repo';
import type { Venue } from '../schemas/venues.schema';

export class VenuesService {
  private repo = new VenuesRepo();

  async list(): Promise<Venue[]> {
    const rows = await this.repo.listAll();
    const toIso = (v: any) => {
      if (v == null) return undefined;
      if (typeof v === 'string') return v;
      if (v instanceof Date) return v.toISOString();
      try {
        return new Date(v).toISOString();
      } catch {
        return String(v);
      }
    };

    return rows.map((r: any) => ({
      id: r.id,
      club_id: r.club_id,
      name: r.name,
      address: r.address,
      center_point: r.center_point,
      bbox: r.bbox,
      tz: r.tz,
      published: r.published,
      version_token: r.version_token,
      created_at: toIso(r.created_at),
      updated_at: toIso(r.updated_at),
    } as Venue));
  }

  async get(id: number): Promise<Venue | null> {
    const row = await this.repo.getById(id);
    if (!row) return null;
    const toIso = (v: any) => {
      if (v == null) return undefined;
      if (typeof v === 'string') return v;
      if (v instanceof Date) return v.toISOString();
      try {
        return new Date(v).toISOString();
      } catch {
        return String(v);
      }
    };
    return {
      id: row.id,
      club_id: row.club_id,
      name: row.name,
      address: row.address,
      center_point: row.center_point,
      bbox: row.bbox,
      tz: row.tz,
      published: row.published,
      version_token: row.version_token,
      created_at: toIso(row.created_at),
      updated_at: toIso(row.updated_at),
    } as Venue;
  }

  async create(payload: Partial<Venue>): Promise<Venue> {
    return this.repo.create(payload as Venue);
  }
}
