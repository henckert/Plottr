# Exporting Layouts

**Export your field layouts** to PNG images, GeoJSON files, or PDF documents for use in presentations, GIS software, or offline documentation.

---

## Table of Contents

1. [Overview](#overview)
2. [PNG Export](#png-export)
3. [GeoJSON Export](#geojson-export)
4. [PDF Export](#pdf-export)
5. [Export Best Practices](#export-best-practices)
6. [Troubleshooting](#troubleshooting)

---

## Overview

### Available Export Formats

| Format | Use Case | File Size | Quality |
|--------|----------|-----------|---------|
| **PNG** | Presentations, posters, web | 2-10 MB | Raster (pixel-based) |
| **GeoJSON** | GIS software, data exchange | <1 MB | Vector (full precision) |
| **PDF** | Printing, documents, reports | 1-5 MB | Vector (scalable) |

### Export Features

- ✅ **Preserve colors**: Zones maintain their assigned colors
- ✅ **Include labels**: Zone/asset names appear on exports
- ✅ **Scalable**: Choose resolution for PNG, vector for GeoJSON/PDF
- ✅ **Metadata**: Include layout name, description, timestamp
- ✅ **Legend**: Optional legend table (PDF only)

---

## PNG Export

**PNG (Portable Network Graphics)** exports create raster images suitable for presentations and web use.

### When to Use PNG

- ✅ Presentations (PowerPoint, Google Slides)
- ✅ Websites and blogs
- ✅ Social media posts
- ✅ Email attachments
- ✅ Quick previews

### How to Export PNG

> **Note:** PNG export UI is coming soon. The API is ready for integration.

**Coming Soon in UI:**
1. Open layout in editor
2. Click **Export** button → **PNG Image**
3. Choose resolution:
   - **Low** (1280×720): 1-2 MB, fast export, web use
   - **Medium** (1920×1080): 2-5 MB, standard quality, presentations
   - **High** (3840×2160): 5-10 MB, high quality, printing
4. Click **Download PNG**
5. File downloads to your browser's default location

### PNG Export Settings

**Resolution Options:**
- Low: 1280×720 (720p) - ~1-2 MB
- Medium: 1920×1080 (1080p) - ~2-5 MB  
- High: 3840×2160 (4K) - ~5-10 MB

**What's Included:**
- Map tiles (satellite or OSM basemap)
- Zones with colors and labels
- Assets with icons
- Legend (optional)
- Layout name and timestamp (optional)

**What's NOT Included:**
- Interactive controls (zoom, pan)
- Clickable popups
- Animations

### PNG Quality Tips

1. **Choose Resolution Based on Use:**
   - Web/Email: Low (720p)
   - Presentations: Medium (1080p)
   - Printing: High (4K)

2. **Optimize File Size:**
   - Use Low resolution when possible
   - Compress after export if needed
   - Consider GeoJSON for data exchange instead

3. **Background:**
   - Satellite tiles add file size
   - OSM (OpenStreetMap) is lighter
   - Plain white background is smallest

---

## GeoJSON Export

**GeoJSON** is a geographic data format for use in GIS software (QGIS, ArcGIS) and mapping libraries.

### When to Use GeoJSON

- ✅ Import into GIS software (QGIS, ArcGIS, MapBox)
- ✅ Data exchange with other systems
- ✅ Integration with mapping applications
- ✅ Preserve full geometric precision
- ✅ Machine-readable format

### How to Export GeoJSON

> **Note:** GeoJSON export UI is coming soon. The API is ready for integration.

**Coming Soon in UI:**
1. Open layout detail page
2. Click **Export** button → **GeoJSON**
3. Click **Download GeoJSON**
4. File downloads as `layout-name.geojson`

### GeoJSON Structure

**FeatureCollection Format:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": "zone-1",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[-122.4194, 37.7749], ...]]
      },
      "properties": {
        "name": "Pitch 1",
        "zone_type": "pitch",
        "surface": "grass",
        "color": "#10b981",
        "area_sqm": 7140,
        "perimeter_m": 346
      }
    },
    {
      "type": "Feature",
      "id": "asset-1",
      "geometry": {
        "type": "Point",
        "coordinates": [-122.4194, 37.7749]
      },
      "properties": {
        "name": "North Goal",
        "asset_type": "goal",
        "icon": "fa-futbol",
        "rotation_deg": 0
      }
    }
  ]
}
```

### Using GeoJSON

**In QGIS:**
1. Open QGIS
2. Layer → Add Layer → Add Vector Layer
3. Select your `.geojson` file
4. Zones and assets appear as separate layers

**In ArcGIS:**
1. Open ArcGIS Pro
2. Map → Add Data
3. Browse to `.geojson` file
4. Confirm projection (WGS84 / EPSG:4326)

**In Web Maps:**
```javascript
import maplibregl from 'maplibre-gl';

fetch('layout.geojson')
  .then(res => res.json())
  .then(data => {
    map.addSource('layout', {
      type: 'geojson',
      data: data
    });
    map.addLayer({
      id: 'zones',
      type: 'fill',
      source: 'layout',
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': 0.6
      }
    });
  });
```

---

## PDF Export

**PDF (Portable Document Format)** exports create vector documents ideal for printing and reports.

### When to Use PDF

- ✅ Printing (posters, handouts)
- ✅ Reports and documentation
- ✅ Client deliverables
- ✅ Archival (long-term storage)
- ✅ Email attachments (professional)

### How to Export PDF

> **Note:** PDF export UI is coming soon. The API is ready for integration.

**Coming Soon in UI:**
1. Open layout detail page
2. Click **Export** button → **PDF Document**
3. Choose options:
   - **Include Legend**: Show zone/asset types table
   - **Include Metadata**: Show layout name, date, description
   - **Page Size**: A4, Letter, Tabloid
   - **Orientation**: Portrait or Landscape
4. Click **Generate PDF**
5. File downloads as `layout-name.pdf`

### PDF Features

**What's Included:**
- Vector outlines of zones (scalable, no pixelation)
- Asset markers with labels
- Legend table (optional)
- Layout metadata (name, description, date)
- Scale bar and north arrow

**What's NOT Included:**
- Satellite imagery (vector outlines only)
- Interactive features
- Animations

**Why No Satellite Imagery?**
- Keeps file size small (1-5 MB vs. 50+ MB)
- Focuses on designed layout, not background
- Prints cleanly in black & white
- Scales to any size without quality loss

### PDF Settings

**Page Sizes:**
- **A4**: 210 × 297 mm (international standard)
- **Letter**: 8.5 × 11 inches (US standard)
- **Tabloid**: 11 × 17 inches (large format)

**Orientation:**
- **Portrait**: Vertical (best for tall layouts)
- **Landscape**: Horizontal (best for wide layouts)

**Legend Options:**
- **Include Legend**: Shows table with zone colors and types
- **Exclude Legend**: Map only, more space for layout

---

## Export Best Practices

### Choosing the Right Format

| Use Case | Recommended Format | Why |
|----------|-------------------|-----|
| **Presentation slide** | PNG (Medium) | Easy to embed, good quality |
| **Website display** | PNG (Low) | Fast loading, web-optimized |
| **Print poster** | PDF or PNG (High) | Scalable or high resolution |
| **GIS analysis** | GeoJSON | Full precision, editable |
| **Client report** | PDF | Professional, printable |
| **Data backup** | GeoJSON | Complete data, lossless |
| **Email attachment** | PDF or PNG (Medium) | Universal compatibility |

### Before Exporting

**1. Review Your Layout:**
- ✅ All zones labeled clearly
- ✅ Colors are distinct and meaningful
- ✅ Assets placed accurately
- ✅ No test/debug data present

**2. Optimize for Output:**
- Use high-contrast colors for printing
- Ensure labels are readable at target size
- Remove unnecessary zones/assets
- Check zone names are professional

**3. Test the Export:**
- Export a small test first
- Verify quality and file size
- Open in target application (PowerPoint, QGIS, etc.)
- Make adjustments if needed

### After Exporting

**File Management:**
- Use descriptive filenames: `riverside-soccer-summer2025.pdf`
- Include version numbers if iterating: `layout-v2.png`
- Store in organized folders by project/date
- Keep source layout in Plottr for future edits

**Sharing:**
- Compress PNG files if needed (tools: TinyPNG, ImageOptim)
- Use cloud storage for large files (Google Drive, Dropbox)
- Provide context in emails (what the export shows)
- Include expiration dates if time-sensitive

---

## Troubleshooting

### Export Button Not Available

**Possible Causes:**
1. Export feature not yet implemented in UI
2. No zones in layout
3. Browser compatibility issue

**Solutions:**
- Wait for UI implementation (coming soon)
- Use API endpoints directly (see below)
- Add at least one zone to enable export
- Try a different browser (Chrome, Firefox, Edge)

### File Too Large

**Problem:** PNG export exceeds 10 MB

**Solutions:**
1. Choose lower resolution (Low instead of High)
2. Use OSM basemap instead of satellite
3. Export smaller area of layout
4. Use GeoJSON or PDF instead (smaller file size)

### Quality Too Low

**Problem:** PNG looks blurry when zoomed in

**Solutions:**
1. Use High resolution setting
2. Switch to PDF for scalable vector output
3. Export smaller area at higher zoom level
4. Use GeoJSON and render in high-quality GIS software

### PDF Won't Print

**Problem:** PDF prints blank or with errors

**Solutions:**
1. Update PDF reader (Adobe Acrobat, Preview, etc.)
2. Try "Print as Image" option in print dialog
3. Re-export PDF with different settings
4. Convert to PNG and print that instead

---

## API Usage

For developers, exports can be generated via API:

```bash
# Export to PNG
GET /api/layouts/:id/export/png?resolution=medium
# Returns PNG image (Content-Type: image/png)

# Export to GeoJSON
GET /api/layouts/:id/export/geojson
# Returns GeoJSON file (Content-Type: application/geo+json)

# Export to PDF
GET /api/layouts/:id/export/pdf?include_legend=true&page_size=a4&orientation=landscape
# Returns PDF document (Content-Type: application/pdf)
```

**Query Parameters:**

**PNG:**
- `resolution`: `low` | `medium` | `high` (default: `medium`)
- `include_labels`: `true` | `false` (default: `true`)

**PDF:**
- `page_size`: `a4` | `letter` | `tabloid` (default: `a4`)
- `orientation`: `portrait` | `landscape` (default: `landscape`)
- `include_legend`: `true` | `false` (default: `true`)
- `include_metadata`: `true` | `false` (default: `true`)

---

## Examples

### Example 1: Presentation Export

**Scenario:** Add layout to PowerPoint presentation

**Steps:**
1. Export as PNG (Medium resolution)
2. Download `soccer-complex.png`
3. Open PowerPoint
4. Insert → Picture → `soccer-complex.png`
5. Resize as needed (maintains quality)

**Result:** Clean, professional slide with field layout

---

### Example 2: GIS Integration

**Scenario:** Analyze layouts in QGIS for planning

**Steps:**
1. Export all layouts as GeoJSON
2. Open QGIS
3. Add Vector Layer for each `.geojson` file
4. Overlay with city planning data
5. Perform spatial analysis (buffer zones, proximity, etc.)

**Result:** Layouts integrated with GIS planning tools

---

### Example 3: Client Deliverable

**Scenario:** Send professional PDF to client

**Steps:**
1. Review layout for accuracy
2. Export as PDF (A4, Landscape, with legend)
3. Open PDF, verify quality
4. Attach to email with explanation
5. Client can print or view on any device

**Result:** Professional deliverable, ready to print or present

---

## Coming Soon

**Planned Features:**
- ✨ Batch export (export multiple layouts at once)
- ✨ Custom watermarks
- ✨ Export templates (save export settings)
- ✨ Scheduled exports (automatic weekly/monthly exports)
- ✨ Cloud storage integration (auto-upload to Google Drive/Dropbox)

---

## Next Steps

- **Share Your Layouts**: [User Guide: Sharing](./USER_GUIDE_SHARING.md)
- **Apply Templates**: [User Guide: Templates](./USER_GUIDE_TEMPLATES.md)
- **API Reference**: [Full API Documentation](./API_REFERENCE.md)

---

**Last Updated:** October 27, 2025  
**Version:** 1.0.0  
**Previous Guide:** [← Sharing Layouts](./USER_GUIDE_SHARING.md)  
**Next Guide:** [API Reference →](./API_REFERENCE.md)

---

**Note:** Export functionality is currently available via API only. The UI implementation is coming in a future update. For now, use the API endpoints documented above or wait for the UI release.
