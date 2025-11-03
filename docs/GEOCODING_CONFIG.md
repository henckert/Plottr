# Geocoding Configuration

## Overview

PlotIQ uses a provider-based geocoding system that supports both Mapbox Geocoding API (primary) and Nominatim/OpenStreetMap (fallback). The system automatically selects the appropriate provider based on configuration and gracefully falls back when needed.

## Environment Variables

### Required Configuration

Add these variables to your `.env` file:

```bash
# Geocoding Provider Configuration
GEOCODER_PROVIDER=mapbox          # Options: 'mapbox' or 'nominatim'
MAPBOX_ACCESS_TOKEN=pk.xxxxx      # Your Mapbox access token
MAPBOX_LANGUAGE=en                # Language for results (ISO 639-1 code)
MAPBOX_COUNTRY_BIAS=ie            # Default country bias (ISO 3166-1 alpha-2)
MAPBOX_PROXIMITY=-6.2603,53.3498  # Default proximity point (Dublin lng,lat)
```

### Provider Selection Logic

The system automatically chooses a provider based on:

1. **Use Mapbox** when:
   - `GEOCODER_PROVIDER=mapbox` (default)
   - `MAPBOX_ACCESS_TOKEN` is set and valid

2. **Use Nominatim** when:
   - `GEOCODER_PROVIDER=nominatim` OR
   - `GEOCODER_PROVIDER=nom` OR
   - Mapbox token is missing/invalid

## Features

### Eircode Support (Irish Postal Codes)

The system has special handling for Eircodes:

- **Pattern Detection**: Automatically detects Eircode format (`E91 VF83`, `E91VF83`)
- **Mapbox First**: Tries Mapbox with `types=postcode,address`
- **Nominatim Fallback**: If Mapbox returns 0 results, falls back to Nominatim
- **Country Lock**: Always uses `country=ie` for Eircode queries

Example:
```javascript
// Query: "E91 VF83"
// 1. Detects as Eircode
// 2. Queries Mapbox with country=ie, types=postcode,address
// 3. If empty, queries Nominatim with postalcode search
// 4. Returns results from whichever provider succeeds
```

### Caching

- **In-Memory LRU Cache**: 60-second TTL
- **Cache Key**: `provider|query|country|limit|proximity|language`
- **Automatic Cleanup**: Removes entries older than 60s when cache size > 100

### Rate Limiting

- **Token Bucket**: 10 requests per minute (global)
- **Refill Rate**: 1 token per 6 seconds
- **429 Response**: Returns `RATE_LIMIT` error when exceeded

### Request Parameters

All geocoding requests support:

- `q` (required): Search query
- `country`: Country bias (ISO 3166-1 alpha-2, e.g., "ie", "gb")
- `limit`: Max results (clamped to 1-10, default 5)
- `proximity`: Proximity bias point as "lng,lat" (e.g., "-6.26,53.35")
- `language`: Result language (ISO 639-1, e.g., "en", "ga")

## API Endpoints

### Forward Geocoding

```
GET /api/geocode/search?q=Dublin&country=ie&limit=5&proximity=-6.26,53.35
```

**Response:**
```json
{
  "data": [
    {
      "id": "place.123",
      "label": "Dublin, Ireland",
      "name": "Dublin",
      "coordinates": [-6.2603, 53.3498],
      "address": {
        "line1": "",
        "city": "Dublin",
        "county": "Dublin",
        "state": "Leinster",
        "country": "Ireland",
        "country_code": "ie",
        "postcode": "D02"
      },
      "bbox": [-6.4, 53.2, -6.1, 53.4]
    }
  ]
}
```

### Reverse Geocoding

```
GET /api/geocode/reverse?lat=53.3498&lon=-6.2603
```

**Response:**
```json
{
  "data": {
    "lat": 53.3498,
    "lng": -6.2603,
    "displayName": "Dublin City Centre, Dublin, Ireland",
    "address": {
      "line1": "O'Connell Street",
      "city": "Dublin",
      "county": "Dublin",
      "postcode": "D01",
      "country": "Ireland"
    }
  }
}
```

## Testing

### Unit Tests

Run geocoding unit tests:
```bash
npm test -- tests/unit/services/geocoding
```

### Smoke Test

Quick validation of provider configuration:
```bash
npm run dev:geocode:smoke "E91 VF83" ie
```

Output shows:
- Which provider is active
- Configuration details
- Query results
- Response time

Example output:
```
============================================================
Geocoding Smoke Test
============================================================
Query: "E91 VF83"
Country: ie

Configuration:
  Provider: mapbox
  Mapbox Token: ***xyz
  Country Bias: ie
  Proximity: -6.2603,53.3498
  Language: en

Results:
  Count: 1
  Duration: 234ms

First Result:
  ID: postcode.123
  Label: E91 VF83, Galway, Ireland
  Name: Galway
  Coordinates: [-9.0568, 53.2707]
  Address:
    City: Galway
    Postcode: E91 VF83
    Country: Ireland

============================================================
✓ Smoke test completed successfully
============================================================
```

## Provider Comparison

| Feature | Mapbox | Nominatim |
|---------|--------|-----------|
| **Cost** | Paid (50k free/mo) | Free |
| **Rate Limit** | 600 req/min | 1 req/sec |
| **Accuracy** | Excellent | Good |
| **Coverage** | Global | Global |
| **Autocomplete** | Yes | Limited |
| **Eircode Support** | Good | Excellent |
| **Attribution** | Required | Required |

## Mapbox Pricing

- **Free Tier**: 50,000 requests/month
- **Pay-as-you-go**: $0.50 per 1,000 requests
- **Monthly Plans**: Available for high volume

See: https://www.mapbox.com/pricing

## Nominatim Usage Policy

When using Nominatim:
- Maximum 1 request per second
- Provide `User-Agent` header (already configured)
- Do not run your own mirror without permission
- See: https://operations.osmfoundation.org/policies/nominatim/

## Troubleshooting

### Mapbox Returns Empty Results

**Symptom**: Query returns no results with Mapbox
**Solution**: 
1. Check token is valid: `echo $MAPBOX_ACCESS_TOKEN`
2. Verify token has geocoding scope
3. Try Nominatim: `GEOCODER_PROVIDER=nominatim`

### Rate Limit Errors

**Symptom**: `429 Rate limit exceeded`
**Solution**:
1. Reduce request frequency
2. Implement client-side debouncing
3. Increase server token bucket size

### Eircode Not Found

**Symptom**: Eircode query returns no results
**Solution**:
1. Verify Eircode format: `E91 VF83` or `E91VF83`
2. System automatically tries both Mapbox and Nominatim
3. Check logs for fallback attempts

### Provider Not Switching

**Symptom**: Still using old provider after config change
**Solution**:
1. Restart server (provider is cached)
2. Check `.env` file is loaded: `console.log(getConfig())`
3. Verify no typos: `mapbox` not `Mapbox`

## Migration from Old System

### Breaking Changes

None! The new system maintains backward compatibility:

- `nominatimSearch()` still works (delegates to new system)
- `nominatimReverse()` unchanged
- Response format identical
- API endpoints unchanged

### Recommended Updates

1. **Update .env**: Add new geocoding variables
2. **Test**: Run smoke test to verify configuration
3. **Monitor**: Check logs for provider usage and errors
4. **Optimize**: Add proximity bias for better results

## Examples

### Basic Search
```typescript
import { geocodeSearch } from './services/geocode.service';

const results = await geocodeSearch('Dublin', {
  country: 'ie',
  limit: 5,
});
```

### With Proximity Bias
```typescript
// Favor results near user's location
const results = await geocodeSearch('Coffee Shop', {
  country: 'ie',
  proximity: '-6.2603,53.3498', // User's current location
  limit: 10,
});
```

### Eircode Lookup
```typescript
// Automatically handles Eircode with fallback
const results = await geocodeSearch('E91 VF83', {
  country: 'ie',
});
```

## Monitoring

Geocoding requests log the following metrics:

```
[Geocode] provider=mapbox q="Dublin" country=ie results=5 ms=234
[Geocode] provider=nominatim-fallback q="E91VF83" country=ie results=1 ms=456
[Geocode] Cache hit for "Dublin"
```

Watch for:
- High latency (>1000ms)
- Frequent fallbacks (may indicate token issues)
- High cache miss rate (adjust TTL)
- Rate limit errors (increase token bucket)
