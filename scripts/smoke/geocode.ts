/**
 * Smoke test for geocoding providers
 * Usage: npm run dev:geocode:smoke "E91 VF83" ie
 */

import { geocodeSearch } from '../../src/services/geocode.service';
import { getConfig } from '../../src/config';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: npm run dev:geocode:smoke "<query>" [country]');
    console.error('Example: npm run dev:geocode:smoke "E91 VF83" ie');
    process.exit(1);
  }

  const query = args[0];
  const country = args[1] || 'ie';

  console.log('='.repeat(60));
  console.log('Geocoding Smoke Test');
  console.log('='.repeat(60));
  console.log(`Query: "${query}"`);
  console.log(`Country: ${country}`);
  console.log('');

  const config = getConfig();
  console.log('Configuration:');
  console.log(`  Provider: ${config.geocoder.provider}`);
  console.log(`  Mapbox Token: ${config.geocoder.mapboxToken ? '***' + config.geocoder.mapboxToken.slice(-4) : 'not set'}`);
  console.log(`  Country Bias: ${config.geocoder.countryBias}`);
  console.log(`  Proximity: ${config.geocoder.proximity}`);
  console.log(`  Language: ${config.geocoder.language}`);
  console.log('');

  try {
    const startTime = Date.now();
    const results = await geocodeSearch(query, {
      country,
      limit: 5,
    });
    const duration = Date.now() - startTime;

    console.log('Results:');
    console.log(`  Count: ${results.length}`);
    console.log(`  Duration: ${duration}ms`);
    console.log('');

    if (results.length > 0) {
      console.log('First Result:');
      const first = results[0];
      console.log(`  ID: ${first.id}`);
      console.log(`  Label: ${first.label}`);
      console.log(`  Name: ${first.name}`);
      console.log(`  Coordinates: [${first.coordinates[0]}, ${first.coordinates[1]}]`);
      
      if (first.address) {
        console.log('  Address:');
        if (first.address.line1) console.log(`    Line1: ${first.address.line1}`);
        if (first.address.city) console.log(`    City: ${first.address.city}`);
        if (first.address.county) console.log(`    County: ${first.address.county}`);
        if (first.address.postcode) console.log(`    Postcode: ${first.address.postcode}`);
        if (first.address.country) console.log(`    Country: ${first.address.country}`);
      }

      if (first.bbox) {
        console.log(`  BBox: [${first.bbox.join(', ')}]`);
      }
      console.log('');

      if (results.length > 1) {
        console.log('All Results:');
        results.forEach((r, i) => {
          console.log(`  ${i + 1}. ${r.label}`);
        });
      }
    } else {
      console.log('No results found.');
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('✓ Smoke test completed successfully');
    console.log('='.repeat(60));

    process.exit(0);
  } catch (err: any) {
    console.error('');
    console.error('='.repeat(60));
    console.error('✗ Smoke test failed');
    console.error('='.repeat(60));
    console.error('Error:', err.message);
    if (err.stack) {
      console.error('');
      console.error('Stack trace:');
      console.error(err.stack);
    }
    process.exit(1);
  }
}

main();
