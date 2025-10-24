import { SessionsRepo } from '../data/sessions.repo';
import { AppError } from '../errors';
import { decodeCursor } from '../lib/pagination';

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

const mapRow = (r: any) => ({
  id: r.id,
  team_id: r.team_id,
  venue_id: r.venue_id,
  pitch_id: r.pitch_id,
  segment_id: r.segment_id,
  start_ts: toIso(r.start_ts),
  end_ts: toIso(r.end_ts),
  notes: r.notes,
  share_token: r.share_token,
  version_token: r.version_token,
  created_at: toIso(r.created_at),
  updated_at: toIso(r.updated_at),
});

export class SessionsService {
  private repo = new SessionsRepo();

  async list() {
    const rows = await this.repo.listAll();
    return rows.map(mapRow);
  }

  async listPaginated(limit: number, cursor?: string) {
    let cursorParams;
    if (cursor) {
      cursorParams = decodeCursor(cursor);
    }
    const rows = await this.repo.listAllPaginated(limit, cursorParams);
    return rows.map(mapRow);
  }

  async get(id: number) {
    const row = await this.repo.getById(id);
    if (!row) return null;
    return mapRow(row);
  }

  async create(payload: any) {
    // Check for overlapping sessions if pitch is specified
    if (payload.pitch_id && payload.start_ts && payload.end_ts) {
      await this.checkSessionOverlap(
        payload.pitch_id,
        payload.start_ts,
        payload.end_ts
      );
    }
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
    
    // Check for overlapping sessions if pitch or time is being updated
    const pitchId = payload.pitch_id !== undefined ? payload.pitch_id : current.pitch_id;
    const startTs = payload.start_ts !== undefined ? payload.start_ts : current.start_ts;
    const endTs = payload.end_ts !== undefined ? payload.end_ts : current.end_ts;
    
    if (pitchId && startTs && endTs) {
      await this.checkSessionOverlap(pitchId, startTs, endTs, id);
    }
    
    const updated = await this.repo.update(id, payload);
    if (!updated) throw new AppError('Session not found after update', 404, 'NOT_FOUND');
    return updated;
  }

  /**
   * Check if a session overlaps with existing sessions on the same pitch
   * Throws AppError with code SESSION_CONFLICT if overlap detected
   * 
   * @param pitchId - Pitch ID to check
   * @param startTs - Session start time
   * @param endTs - Session end time
   * @param excludeSessionId - Session ID to exclude from check (for updates)
   */
  private async checkSessionOverlap(
    pitchId: number | null,
    startTs: string | Date,
    endTs: string | Date,
    excludeSessionId?: number
  ) {
    const overlapping = await this.repo.findOverlappingSessions(
      pitchId,
      startTs,
      endTs,
      excludeSessionId
    );

    if (overlapping.length > 0) {
      // Format the conflict message with the overlapping session details
      const conflictSession = overlapping[0];
      const conflictStart = new Date(conflictSession.start_ts).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      const conflictEnd = new Date(conflictSession.end_ts).toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      throw new AppError(
        `This pitch already has a session overlapping ${conflictStart} – ${conflictEnd}.`,
        409,
        'SESSION_CONFLICT'
      );
    }
  }
}
