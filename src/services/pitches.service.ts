import { PitchesRepo } from '../data/pitches.repo';
import { AppError } from '../errors';

export class PitchesService {
  private repo = new PitchesRepo();

  async list(venueId?: number) {
    const rows = await this.repo.listAll(venueId);
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
      venue_id: r.venue_id,
      name: r.name,
      code: r.code,
      sport: r.sport,
      level: r.level,
      geometry: r.geometry,
      rotation_deg: r.rotation_deg,
      template_id: r.template_id,
      status: r.status,
      created_at: toIso(r.created_at),
      updated_at: toIso(r.updated_at),
    }));
  }

  async get(id: number) {
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
      venue_id: row.venue_id,
      name: row.name,
      code: row.code,
      sport: row.sport,
      level: row.level,
      geometry: row.geometry,
      rotation_deg: row.rotation_deg,
      template_id: row.template_id,
      status: row.status,
      created_at: toIso(row.created_at),
      updated_at: toIso(row.updated_at),
    };
  }

  async create(payload: any) {
    return this.repo.create(payload);
  }

  async update(id: number, ifMatch: string, payload: any) {
    const current = await this.repo.getById(id);
    if (!current) throw new AppError('Pitch not found', 404, 'NOT_FOUND');
    // Allow "null-token" to represent null version_token (for clients with null tokens)
    const tokenMatches = ifMatch === 'null-token' ? current.version_token === null : current.version_token === ifMatch;
    if (!tokenMatches) {
      throw new AppError('Resource version mismatch (stale version_token)', 409, 'CONFLICT');
    }
    const updated = await this.repo.update(id, payload);
    if (!updated) throw new AppError('Pitch not found after update', 404, 'NOT_FOUND');
    return updated;
  }
}
