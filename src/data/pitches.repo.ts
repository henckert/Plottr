import { getKnex } from './knex';

/**
 * Converts GeoJSON coordinates to WKT polygon format for PostGIS.
 * Expects coordinates in [lon, lat] format (GeoJSON standard).
 * PostGIS WKT format: POLYGON((lon lat, lon lat, ...))
 */
function geoJsonToWkt(geojson: any): string {
  if (!geojson || geojson.type !== 'Polygon' || !geojson.coordinates[0]) {
    throw new Error('Invalid GeoJSON Polygon');
  }

  const coords = geojson.coordinates[0]
    .map((p: number[]) => `${p[0]} ${p[1]}`)
    .join(', ');
  return `POLYGON((${coords}))`;
}

const SELECT_FIELDS = [
  'id',
  'venue_id',
  'name',
  'code',
  'sport',
  'level',
  'rotation_deg',
  'template_id',
  'status',
  'version_token',
  'created_at',
  'updated_at'
];

export class PitchesRepo {
  private knex: any;

  constructor() {
    this.knex = getKnex();
  }

  async listAll(venueId?: number) {
    const q = this.knex('pitches')
      .select(
        ...SELECT_FIELDS,
        // Use ST_AsGeoJSON to convert PostGIS geometry to GeoJSON
        this.knex.raw("ST_AsGeoJSON(geometry)::jsonb as geometry"),
      );
    if (venueId) q.where({ venue_id: venueId });
    return q;
  }

  async listAllPaginated(venueId: number | undefined, limit: number, cursorParams?: { id: number; sortValue: any }) {
    let query = this.knex('pitches')
      .select(
        ...SELECT_FIELDS,
        this.knex.raw("ST_AsGeoJSON(geometry)::jsonb as geometry"),
      )
      .orderBy('updated_at', 'asc')
      .orderBy('id', 'asc');

    if (venueId) {
      query = query.where({ venue_id: venueId });
    }

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
    const row = await this.knex('pitches')
      .select(
        ...SELECT_FIELDS,
        this.knex.raw("ST_AsGeoJSON(geometry)::jsonb as geometry")
      )
      .where({ id })
      .first();
    return row || null;
  }

  async create(payload: any) {
    // Convert GeoJSON geometry to PostGIS format if provided
    const data = { ...payload };
    if (data.geometry) {
      const wkt = geoJsonToWkt(data.geometry);
      data.geometry = this.knex.raw(`ST_GeomFromText('${wkt}', 4326)`);
    }
    const [created] = await this.knex('pitches')
      .insert(data)
      .returning([
        ...SELECT_FIELDS,
        this.knex.raw("ST_AsGeoJSON(geometry)::jsonb as geometry"),
      ]);
    return created;
  }

  async update(id: number, payload: any) {
    // Filter out undefined values so we don't update columns with null
    const updateData = Object.fromEntries(Object.entries(payload).filter(([_k, v]) => v !== undefined));
    
    // Convert GeoJSON geometry to PostGIS format if provided
    if (updateData.geometry) {
      const wkt = geoJsonToWkt(updateData.geometry);
      updateData.geometry = this.knex.raw(`ST_GeomFromText('${wkt}', 4326)`);
    }
    
    const [updated] = await this.knex('pitches')
      .where({ id })
      .update({ ...updateData, updated_at: this.knex.fn.now() })
      .returning([
        ...SELECT_FIELDS,
        this.knex.raw("ST_AsGeoJSON(geometry)::jsonb as geometry"),
      ]);
    return updated || null;
  }
}
