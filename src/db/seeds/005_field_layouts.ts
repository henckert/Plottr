import { Knex } from 'knex';

/**
 * Seed: Example Sites, Layouts, Zones, and Assets
 * 
 * Creates realistic field layout data for testing and development.
 * Uses the 3 existing sites from venues migration (Riverside Park, Central Sports Complex, Willow Field).
 * 
 * Data Structure:
 * - 3 existing sites (from venues migration)
 * - 6 layouts (2 per site)
 * - 18 zones (3 per layout - main pitch, goal area, training zone)
 * - 36 assets (6 per layout - goals, cones, lines)
 * - 3 templates (reusable layouts)
 * - 3 share links (1 per site)
 */

export async function seed(knex: Knex): Promise<void> {
  // Get existing sites from venues migration (with location as text)
  let sitesResult = await knex.raw(`
    SELECT id, name, ST_AsText(location::geometry) as location_text, ST_X(location::geometry) as lon, ST_Y(location::geometry) as lat
    FROM sites
    ORDER BY id
  `);
  let sites = sitesResult.rows;
  
  // If no sites exist, run the venues→sites migration
  if (sites.length === 0) {
    console.log('  → No sites found, migrating from venues...');
    
    const venueCount = await knex('venues').count('* as count').first();
    const count = parseInt(venueCount?.count as string || '0', 10);
    
    if (count === 0) {
      console.log('  ⚠️  No venues to migrate. Skipping seed.');
      return;
    }

    // Migrate venues to sites (same logic as migration 0013)
    await knex.raw(`
      INSERT INTO sites (
        club_id, name, address, city, state, country, postal_code,
        location, bbox, version_token, created_at, updated_at
      )
      SELECT 
        v.club_id, v.name, v.address,
        NULL as city, NULL as state, 'USA' as country, NULL as postal_code,
        v.center_point as location, v.bbox,
        gen_random_uuid() as version_token,
        v.created_at, v.updated_at
      FROM venues v
      ORDER BY v.id
    `);
    
    sitesResult = await knex.raw(`
      SELECT id, name, ST_AsText(location::geometry) as location_text, ST_X(location::geometry) as lon, ST_Y(location::geometry) as lat
      FROM sites
      ORDER BY id
    `);
    sites = sitesResult.rows;
    console.log(`  ✓ Migrated ${sites.length} venues to sites`);
  }

  console.log(`→ Seeding data for ${sites.length} sites...`);

  // Clear existing seed data (keep migrated sites)
  await knex('share_links').del();
  await knex('assets').del();
  await knex('zones').del();
  await knex('layouts').del();
  await knex('templates').del();

  // --- LAYOUTS ---
  const layouts = [];
  for (const site of sites) {
    // Layout 1: Match Day Setup
    layouts.push({
      site_id: site.id,
      name: `${site.name} - Match Day Setup`,
      description: 'Full field configuration for match days',
      is_published: true,
      created_by: 'seed-user-1',
    });

    // Layout 2: Training Setup
    layouts.push({
      site_id: site.id,
      name: `${site.name} - Training Setup`,
      description: 'Training zones and practice areas',
      is_published: false,
      created_by: 'seed-user-1',
    });
  }

  const insertedLayouts = await knex('layouts').insert(layouts).returning(['id', 'site_id', 'name']);
  console.log(`  ✓ Created ${insertedLayouts.length} layouts`);

  // --- ZONES ---
  const zones = [];
  for (const layout of insertedLayouts) {
    // Get site location for offset calculations
    const site = sites.find((s: any) => s.id === layout.site_id);
    if (!site || !site.lon || !site.lat) continue;

    const lon = parseFloat(site.lon);
    const lat = parseFloat(site.lat);

    // Zone 1: Main Pitch (105m x 68m)
    zones.push({
      layout_id: layout.id,
      name: 'Main Pitch',
      zone_type: 'pitch',
      surface: 'grass',
      color: '#22c55e', // green
      area_sqm: 7140, // 105m x 68m
      perimeter_m: 346,
      boundary: knex.raw(`ST_GeogFromText('POLYGON((
        ${lon - 0.0006} ${lat - 0.0004},
        ${lon + 0.0006} ${lat - 0.0004},
        ${lon + 0.0006} ${lat + 0.0004},
        ${lon - 0.0006} ${lat + 0.0004},
        ${lon - 0.0006} ${lat - 0.0004}
      ))')`),
    });

    // Zone 2: North Goal Area (18m x 5.5m)
    zones.push({
      layout_id: layout.id,
      name: 'North Goal Area',
      zone_type: 'goal_area',
      surface: 'grass',
      color: '#fbbf24', // amber
      area_sqm: 99,
      perimeter_m: 47,
      boundary: knex.raw(`ST_GeogFromText('POLYGON((
        ${lon - 0.00012} ${lat + 0.00038},
        ${lon + 0.00012} ${lat + 0.00038},
        ${lon + 0.00012} ${lat + 0.0004},
        ${lon - 0.00012} ${lat + 0.0004},
        ${lon - 0.00012} ${lat + 0.00038}
      ))')`),
    });

    // Zone 3: Training Zone (20m x 20m)
    zones.push({
      layout_id: layout.id,
      name: 'West Training Zone',
      zone_type: 'training_zone',
      surface: 'turf',
      color: '#60a5fa', // blue
      area_sqm: 400,
      perimeter_m: 80,
      boundary: knex.raw(`ST_GeogFromText('POLYGON((
        ${lon - 0.0008} ${lat - 0.0002},
        ${lon - 0.0006} ${lat - 0.0002},
        ${lon - 0.0006} ${lat + 0.0002},
        ${lon - 0.0008} ${lat + 0.0002},
        ${lon - 0.0008} ${lat - 0.0002}
      ))')`),
    });
  }

  await knex('zones').insert(zones);
  console.log(`  ✓ Created ${zones.length} zones`);

  // --- ASSETS ---
  const assets = [];
  for (const layout of insertedLayouts) {
    // Get site location for asset positioning
    const site = sites.find((s: any) => s.id === layout.site_id);
    if (!site || !site.lon || !site.lat) continue;

    const lon = parseFloat(site.lon);
    const lat = parseFloat(site.lat);

    // Asset 1: North Goal (POINT)
    assets.push({
      layout_id: layout.id,
      name: 'North Goal',
      asset_type: 'goal',
      geometry: knex.raw(`ST_GeogFromText('POINT(${lon} ${lat + 0.0004})')`),
      properties: { width_m: 7.32, height_m: 2.44, color: '#ffffff' },
    });

    // Asset 2: South Goal (POINT)
    assets.push({
      layout_id: layout.id,
      name: 'South Goal',
      asset_type: 'goal',
      geometry: knex.raw(`ST_GeogFromText('POINT(${lon} ${lat - 0.0004})')`),
      properties: { width_m: 7.32, height_m: 2.44, color: '#ffffff' },
    });

    // Asset 3: Center Line (LINESTRING)
    assets.push({
      layout_id: layout.id,
      name: 'Center Line',
      asset_type: 'other', // Line markings don't have a specific type in enum
      geometry: knex.raw(`ST_GeogFromText('LINESTRING(${lon - 0.0006} ${lat}, ${lon + 0.0006} ${lat})')`),
      properties: { width_m: 0.12, color: '#ffffff', line_type: 'solid' },
    });

    // Asset 4-6: Training Cones (POINT)
    for (let i = 0; i < 3; i++) {
      assets.push({
        layout_id: layout.id,
        name: `Training Cone ${i + 1}`,
        asset_type: 'cone',
        geometry: knex.raw(`ST_GeogFromText('POINT(${lon - 0.0007 + i * 0.0001} ${lat - 0.0001})')`),
        properties: { color: '#f97316', height_m: 0.3 },
      });
    }
  }

  await knex('assets').insert(assets);
  console.log(`  ✓ Created ${assets.length} assets`);

  // --- TEMPLATES ---
  const templates = [
    {
      name: 'Standard Soccer Field',
      sport_type: 'soccer',
      description: 'Full-size 11v11 soccer pitch with regulation markings',
      zones_json: JSON.stringify([
        { name: 'Main Pitch', zone_type: 'pitch', color: '#10b981' },
        { name: 'Goal Area North', zone_type: 'goal_area', color: '#3b82f6' },
        { name: 'Goal Area South', zone_type: 'goal_area', color: '#3b82f6' },
      ]),
      assets_json: JSON.stringify([
        { name: 'North Goal', asset_type: 'goal', icon: 'fa-futbol' },
        { name: 'South Goal', asset_type: 'goal', icon: 'fa-futbol' },
        { name: 'NW Corner Flag', asset_type: 'flag', icon: 'fa-flag' },
        { name: 'NE Corner Flag', asset_type: 'flag', icon: 'fa-flag' },
        { name: 'SW Corner Flag', asset_type: 'flag', icon: 'fa-flag' },
        { name: 'SE Corner Flag', asset_type: 'flag', icon: 'fa-flag' },
      ]),
      is_public: true,
      created_by: '00000000-0000-0000-0000-000000000000',
      preview_geometry: { type: 'Polygon', coordinates: [[[0,0],[0,1],[1,1],[1,0],[0,0]]] },
    },
    {
      name: 'Training Pitch 7v7',
      sport_type: 'soccer',
      description: 'Smaller training pitch for 7-a-side games',
      zones_json: JSON.stringify([
        { name: 'Small Pitch', zone_type: 'pitch', color: '#10b981' },
        { name: 'Training Zone', zone_type: 'training_zone', color: '#f59e0b' },
      ]),
      assets_json: JSON.stringify([
        { name: 'Small Goal North', asset_type: 'goal', icon: 'fa-futbol' },
        { name: 'Small Goal South', asset_type: 'goal', icon: 'fa-futbol' },
        { name: 'Training Cone 1', asset_type: 'cone', icon: 'fa-cone-striped' },
        { name: 'Training Cone 2', asset_type: 'cone', icon: 'fa-cone-striped' },
        { name: 'Training Cone 3', asset_type: 'cone', icon: 'fa-cone-striped' },
        { name: 'Training Cone 4', asset_type: 'cone', icon: 'fa-cone-striped' },
      ]),
      is_public: true,
      created_by: '00000000-0000-0000-0000-000000000000',
      preview_geometry: { type: 'Polygon', coordinates: [[[0,0],[0,1],[1,1],[1,0],[0,0]]] },
    },
    {
      name: 'Multi-Zone Training Complex',
      sport_type: 'training',
      description: 'Multiple training zones with drills setup',
      zones_json: JSON.stringify([
        { name: 'Drill Zone A', zone_type: 'training_zone', color: '#f59e0b' },
        { name: 'Drill Zone B', zone_type: 'training_zone', color: '#f59e0b' },
        { name: 'Drill Zone C', zone_type: 'training_zone', color: '#f59e0b' },
      ]),
      assets_json: JSON.stringify([
        { name: 'Cone 1', asset_type: 'cone', icon: 'fa-cone-striped' },
        { name: 'Cone 2', asset_type: 'cone', icon: 'fa-cone-striped' },
        { name: 'Marker 1', asset_type: 'marker', icon: 'fa-bullseye' },
        { name: 'Marker 2', asset_type: 'marker', icon: 'fa-bullseye' },
      ]),
      is_public: false,
      created_by: '00000000-0000-0000-0000-000000000000',
      preview_geometry: { type: 'Polygon', coordinates: [[[0,0],[0,1],[1,1],[1,0],[0,0]]] },
    },
  ];

  await knex('templates').insert(templates);
  console.log(`  ✓ Created ${templates.length} templates`);

  // --- SHARE LINKS ---
  const shareLinks = [];
  for (let i = 0; i < Math.min(3, insertedLayouts.length); i++) {
    const layout = insertedLayouts[i];
    shareLinks.push({
      layout_id: layout.id,
      slug: `demo${i + 1}xyz`,
      expires_at: i === 0 ? null : knex.raw(`NOW() + INTERVAL '${30 + i * 30} days'`), // First is permanent
      is_revoked: false,
      view_count: Math.floor(Math.random() * 20),
      created_by: 'seed-user-1',
    });
  }

  await knex('share_links').insert(shareLinks);
  console.log(`  ✓ Created ${shareLinks.length} share links`);

  // --- SUMMARY ---
  console.log('');
  console.log('✅ Seed data created successfully:');
  console.log(`   - ${sites.length} sites (from migration)`);
  console.log(`   - ${insertedLayouts.length} layouts`);
  console.log(`   - ${zones.length} zones`);
  console.log(`   - ${assets.length} assets`);
  console.log(`   - ${templates.length} templates`);
  console.log(`   - ${shareLinks.length} share links`);
}
