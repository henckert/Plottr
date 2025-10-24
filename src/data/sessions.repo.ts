import { getKnex } from './knex';

export class SessionsRepo {
  private knex: any;

  constructor() {
    this.knex = getKnex();
  }

  async listAll() {
    return this.knex('sessions').select('*').orderBy('id', 'asc');
  }

  async listAllPaginated(limit: number, cursorParams?: { id: number; sortValue: any }) {
    let query = this.knex('sessions').select('*').orderBy('updated_at', 'asc').orderBy('id', 'asc');

    // Apply cursor filtering if provided
    if (cursorParams) {
      query = query.where((builder: any) => {
        builder
          .where('updated_at', '>', cursorParams.sortValue)
          .orWhere((b: any) =>
            b.where('updated_at', '=', cursorParams.sortValue).andWhere('id', '>', cursorParams.id)
          );
      });
    }

    return query.limit(limit);
  }

  async getById(id: number) {
    const row = await this.knex('sessions').where({ id }).first();
    return row || null;
  }

  async create(payload: any) {
    const [created] = await this.knex('sessions').insert(payload).returning('*');
    return created;
  }

  async update(id: number, payload: any) {
    // Filter out undefined values so we don't update columns with null
    const updateData = Object.fromEntries(Object.entries(payload).filter(([_k, v]) => v !== undefined));
    const [updated] = await this.knex('sessions')
      .where({ id })
      .update({ ...updateData, updated_at: this.knex.fn.now() })
      .returning('*');
    return updated || null;
  }

  /**
   * Check for overlapping sessions on the same pitch
   * Returns conflicting sessions where [start_ts, end_ts) overlaps with the given time range
   * 
   * @param pitchId - The pitch ID to check (null means check all pitches at venue)
   * @param startTs - Start timestamp (ISO string or Date)
   * @param endTs - End timestamp (ISO string or Date)
   * @param excludeSessionId - Optional session ID to exclude from check (for updates)
   * @returns Array of overlapping session records
   */
  async findOverlappingSessions(
    pitchId: number | null,
    startTs: string | Date,
    endTs: string | Date,
    excludeSessionId?: number
  ) {
    // If no pitch specified, no conflict check needed (session not assigned to specific pitch)
    if (pitchId === null) {
      return [];
    }

    let query = this.knex('sessions')
      .where({ pitch_id: pitchId })
      .whereNotNull('start_ts')
      .whereNotNull('end_ts')
      // Check for overlap: existing session overlaps if it starts before our end and ends after our start
      // Overlap condition: start_ts < endTs AND end_ts > startTs
      .where('start_ts', '<', endTs)
      .where('end_ts', '>', startTs);

    // Exclude the current session if updating
    if (excludeSessionId !== undefined) {
      query = query.whereNot('id', excludeSessionId);
    }

    return query.select('*');
  }
}
