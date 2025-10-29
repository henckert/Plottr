# Getting Started with Plottr

**Welcome to Plottr!** This guide will walk you through creating your first sports field layout, from setting up a site to drawing zones and placing assets.

---

## Table of Contents

1. [Overview](#overview)
2. [Creating Your First Site](#creating-your-first-site)
3. [Creating a Layout](#creating-a-layout)
4. [Drawing Zones](#drawing-zones)
5. [Placing Assets](#placing-assets)
6. [Publishing Your Layout](#publishing-your-layout)
7. [Next Steps](#next-steps)

---

## Overview

**Plottr** is a field layout designer for sports venues. It helps you:

- **Map your facilities** with precise geographic locations
- **Design field layouts** with zones (pitches, courts, spectator areas)
- **Place assets** (goals, benches, lights, markers)
- **Share layouts** with teammates or the public
- **Export designs** to PNG, GeoJSON, or PDF

### Key Concepts

- **Site**: A physical location (e.g., "Riverside Sports Complex")
- **Layout**: A design for how zones/assets are arranged (e.g., "Summer 2025 Soccer Configuration")
- **Zone**: An area on the field (pitch, court, parking, spectator area)
- **Asset**: A point or line feature (goal, bench, fence, marker)

---

## Creating Your First Site

A **site** represents a physical venue where your layouts will be placed.

### Step 1: Navigate to Sites

1. Open Plottr in your browser: `http://localhost:3000`
2. Click **Sites** in the navigation bar
3. Click **Create Site** button

### Step 2: Enter Site Details

**Required Fields:**
- **Name**: E.g., "Riverside Sports Complex"

**Optional Fields:**
- **Address**: "123 Main St, Springfield"
- **City**: "Springfield"
- **State/Province**: "IL"
- **Country**: "United States"
- **Postal Code**: "62701"

### Step 3: Set Location on Map

**Option A: Use Geocoding (Recommended)**
1. Enter an address in the **Address** field
2. Click **Geocode Address** or blur the input
3. The map will center on the geocoded location
4. A draggable marker appears

**Option B: Manual Positioning**
1. Drag the map to your desired location
2. Click to place a marker
3. Drag the marker to fine-tune position

### Step 4: Save the Site

1. Review all details
2. Click **Create Site**
3. You'll be redirected to the site detail page

**✅ Success!** You've created your first site.

---

## Creating a Layout

A **layout** is a design version for your site (e.g., "Winter Hockey Setup", "Summer Soccer Configuration").

### Step 1: Navigate to Site Detail

1. Go to **Sites** → Click on your site (e.g., "Riverside Sports Complex")
2. Click **Create Layout** button

### Step 2: Enter Layout Details

**Required Fields:**
- **Name**: E.g., "Summer 2025 Soccer"

**Optional Fields:**
- **Description**: "6 full-size pitches + 2 training areas"
- **Visibility**: 
  - **Draft**: Only visible to you (default)
  - **Published**: Visible to others with access

### Step 3: Create the Layout

1. Click **Create Layout**
2. You'll be redirected to the **Layout Editor**

**✅ Success!** You're now in the editor, ready to draw zones.

---

## Drawing Zones

**Zones** are polygons representing areas on your field (pitches, courts, parking lots, etc.).

### Step 1: Open the Layout Editor

If not already there:
1. Go to **Layouts** → Find your layout
2. Click **Editor** button

### Step 2: Start Drawing

1. Click the **Draw Zone** button (polygon icon) in the toolbar
2. Click on the map to place vertices (corners of the polygon)
3. Complete the polygon by clicking the first vertex again
   - Or double-click the last vertex
   - Or press **Enter**

**Tips:**
- Zoom in for precision (use mouse wheel or `+`/`-` buttons)
- Pan by clicking and dragging the map
- Use the grid overlay for alignment (if enabled)

### Step 3: Set Zone Properties

After drawing, the **Zone Properties Panel** appears on the right.

**Required Fields:**
- **Name**: E.g., "Pitch 1"
- **Category**: Select from dropdown:
  - Pitch (soccer, football, rugby)
  - Court (basketball, tennis, volleyball)
  - Training Area
  - Spectator Area
  - Parking
  - Walking Path
  - Vendor Area
  - Competition Area
  - And more...

**Optional Fields:**
- **Surface**: Grass, Artificial Turf, Asphalt, Concrete, etc.
- **Color**: Click color picker to customize zone appearance
- **Notes**: "Home team pitch - regulation size"

**Read-Only Metrics:**
- **Area**: Calculated automatically (m² and acres)
- **Perimeter**: Polygon perimeter (meters and feet)

### Step 4: Save the Zone

1. Review all properties
2. Click **Save Zone**
3. The zone appears on the map with your chosen color

**✅ Success!** You've drawn your first zone.

### Drawing More Zones

Repeat the process to add more zones:
1. Click **Draw Zone** again
2. Draw another polygon
3. Fill in properties
4. Save

**Best Practices:**
- Name zones clearly (e.g., "Pitch 1", "Pitch 2", not just "Pitch")
- Use consistent colors for similar zone types
- Keep zones within the site boundary (if defined)
- Avoid overlapping zones unless intentional (e.g., training area within pitch)

---

## Placing Assets

**Assets** are point or line features on your map (goals, benches, lights, fences).

### Step 1: Open Asset Placement Tool

*Note: Full UI for asset placement is coming soon. For now, assets can be created via API.*

### Asset Types Available

**Point Assets** (single location):
- **Sports Equipment**: Goal, Net, Scoreboard, Flag
- **Furniture**: Bench, Light
- **Markers**: Cone, Marker
- **Facilities**: Water Fountain, Trash Bin, Restroom, Camera
- **Landscape**: Tree

**Line Assets** (path or boundary):
- Fence
- Walking Path
- Boundary Line

### Creating Assets (via API - Coming to UI Soon)

**Example: Place a goal on Pitch 1**

```bash
POST /api/assets
{
  "layout_id": 1,
  "zone_id": 5,  # ID of "Pitch 1" zone
  "name": "North Goal",
  "asset_type": "goal",
  "icon": "fa-futbol",
  "geometry": {
    "type": "Point",
    "coordinates": [-122.4194, 37.7749]
  },
  "rotation_deg": 0
}
```

**Frontend UI Coming Soon:**
- Click-to-place assets
- Asset icon picker with 20 FontAwesome icons
- Rotation controls for directional assets (goals, benches)
- Asset properties panel (similar to zones)

---

## Publishing Your Layout

When your layout is ready to share, publish it!

### Step 1: Review Your Layout

1. Click **Layouts** in navigation
2. Find your layout
3. Click to view details

### Step 2: Edit Layout Settings

1. Click **Edit** button
2. Change **Visibility** from **Draft** to **Published**
3. Click **Save Changes**

**✅ Published!** Your layout is now visible to others with access.

---

## Next Steps

### Explore More Features

1. **Apply Templates**: Use pre-built zone configurations
   - [User Guide: Templates](./USER_GUIDE_TEMPLATES.md)

2. **Share Your Layout**: Generate public share links
   - [User Guide: Sharing](./USER_GUIDE_SHARING.md)

3. **Export Designs**: Download PNG, GeoJSON, or PDF
   - [User Guide: Export](./USER_GUIDE_EXPORT.md)

### Advanced Techniques

- **Edit Zones**: Click a zone on the map → Edit Properties
- **Delete Zones**: Select zone → Click Delete → Confirm
- **Duplicate Zones**: Useful for creating similar zones quickly
- **Keyboard Shortcuts**:
  - `ESC`: Cancel current action or deselect
  - `Delete`/`Backspace`: Delete selected zone (with confirmation)
  - `+`/`-`: Zoom in/out
  - Arrow keys: Pan the map

### Get Help

- **API Documentation**: [API Reference](./API_REFERENCE.md)
- **Templates Guide**: [Using Templates](./USER_GUIDE_TEMPLATES.md)
- **Troubleshooting**: [Common Issues](./TROUBLESHOOTING.md)
- **GitHub Issues**: [Report bugs or request features](https://github.com/henckert/Plottr/issues)

---

## Quick Reference Card

| Action | Steps |
|--------|-------|
| **Create Site** | Sites → Create Site → Enter details → Set location → Save |
| **Create Layout** | Site Detail → Create Layout → Enter name → Create |
| **Draw Zone** | Layout Editor → Draw Zone → Click vertices → Set properties → Save |
| **Edit Zone** | Click zone on map → Edit in properties panel → Save |
| **Delete Zone** | Select zone → Delete button → Confirm |
| **Publish Layout** | Layout Detail → Edit → Change to Published → Save |
| **Share Layout** | Layout Detail → Create Share Link → Copy URL |

---

## Support

Need help? Contact us:
- **Email**: support@plottr.app
- **GitHub**: [Plottr Issues](https://github.com/henckert/Plottr/issues)
- **Documentation**: [docs.plottr.app](http://docs.plottr.app)

---

**Last Updated:** October 27, 2025  
**Version:** 1.0.0  
**Next Guide:** [Using Templates →](./USER_GUIDE_TEMPLATES.md)
