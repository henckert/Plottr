import { SessionsRepo } from '../data/sessions.repo';
import { AppError } from '../errors';

export class SessionsService {
  private repo = new SessionsRepo();

  async list() {
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
      team_id: r.team_id,
      venue_id: r.venue_id,
      pitch_id: r.pitch_id,
      segment_id: r.segment_id,
      start_ts: toIso(r.start_ts),
      end_ts: toIso(r.end_ts),
      notes: r.notes,
      share_token: r.share_token,
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
      team_id: row.team_id,
      venue_id: row.venue_id,
      pitch_id: row.pitch_id,
      segment_id: row.segment_id,
      start_ts: toIso(row.start_ts),
      end_ts: toIso(row.end_ts),
      notes: row.notes,
      share_token: row.share_token,
      created_at: toIso(row.created_at),
      updated_at: toIso(row.updated_at),
    };
  }

  async create(payload: any) {
    return this.repo.create(payload);
  }

  async update(id: number, ifMatch: string, payload: any) {
    const current = await this.repo.getById(id);
    if (!current) throw new AppError('Session not found', 404, 'NOT_FOUND');
    // Allow "null-token" to represent null version_token (for clients with null tokens)
    const tokenMatches = ifMatch === 'null-token' ? current.version_token === null : current.version_token === ifMatch;
    if (!tokenMatches) {
      throw new AppError('Resource version mismatch (stale version_token)', 409, 'CONFLICT');
    }
    const updated = await this.repo.update(id, payload);
    if (!updated) throw new AppError('Session not found after update', 404, 'NOT_FOUND');
    return updated;
  }
}
