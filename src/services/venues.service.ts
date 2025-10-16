import { VenuesRepo } from '../data/venues.repo';
import { AppError } from '../errors';
import type { Venue, VenueUpdate } from '../schemas/venues.schema';

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

  async update(id: number, ifMatch: string, payload: VenueUpdate): Promise<Venue> {
    const current = await this.repo.getById(id);
    if (!current) throw new AppError('Venue not found', 404, 'NOT_FOUND');
    // Allow "null-token" to represent null version_token (for clients with null tokens)
    const tokenMatches = ifMatch === 'null-token' ? current.version_token === null : current.version_token === ifMatch;
    if (!tokenMatches) {
      throw new AppError('Resource version mismatch (stale version_token)', 409, 'CONFLICT');
    }
    const updated = await this.repo.update(id, payload as Venue);
    if (!updated) throw new AppError('Venue not found after update', 404, 'NOT_FOUND');
    return updated;
  }
}
