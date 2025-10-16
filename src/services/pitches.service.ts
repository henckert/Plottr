import { PitchesRepo } from '../data/pitches.repo';
import { AppError } from '../errors';

/**
 * Converts PostGIS geometry output to GeoJSON.
 * PostGIS may return geometry in various formats; we need to handle them.
 */
function convertGeometryToGeoJSON(geom: any): any {
  if (!geom) return undefined;
  
  // If it's already a GeoJSON-like object with type and coordinates, return as-is
  if (geom.type && geom.coordinates) {
    return geom;
  }
  
  // If it's a string (WKT format), we'd need a parser
  // For now, return as-is since PostGIS should handle the conversion
  return geom;
}

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
      geometry: convertGeometryToGeoJSON(r.geometry),
      rotation_deg: r.rotation_deg,
      template_id: r.template_id,
      status: r.status,
      version_token: r.version_token,
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
      geometry: convertGeometryToGeoJSON(row.geometry),
      rotation_deg: row.rotation_deg,
      template_id: row.template_id,
      status: row.status,
      version_token: row.version_token,
      created_at: toIso(row.created_at),
      updated_at: toIso(row.updated_at),
    };
  }

  async create(payload: any) {
    const created = await this.repo.create(payload);
    // Convert geometry to GeoJSON for response
    return {
      ...created,
      geometry: convertGeometryToGeoJSON(created.geometry),
    };
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
    // Convert geometry to GeoJSON for response
    return {
      ...updated,
      geometry: convertGeometryToGeoJSON(updated.geometry),
    };
  }
}
