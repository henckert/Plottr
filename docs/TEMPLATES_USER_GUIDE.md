# Field Layout Templates - User Guide

## Overview

Field Layout Templates allow you to quickly set up sports venues with pre-configured zones and assets. Instead of manually creating each zone and asset, you can apply a template and then customize it to match your specific field.

## Key Concepts

### What is a Template?

A **template** is a pre-defined set of zones and assets for a specific sport or use case. For example:
- **Standard Soccer Field**: Full 11v11 pitch with goal areas, penalty areas, center circle
- **Training Pitch 7v7**: Smaller pitch for youth training sessions
- **Multi-Zone Training Complex**: Multiple drill zones for training exercises

### Template Components

Each template contains:
1. **Zones**: Named areas with types (e.g., "Main Pitch", "Goal Area", "Training Zone")
2. **Assets**: Equipment and markers (e.g., goals, corner flags, cones)
3. **Metadata**: Sport type, description, creation date

### Important: Geometry Drawing Required

When you apply a template, it creates **placeholder zones and assets without geometry**. You must then:
1. Navigate to the layout editor
2. Select each zone from the zones list
3. Use the map drawing tools to draw the zone boundary
4. Save the zone with real geometry

This approach gives you flexibility to adapt the template to your specific field dimensions.

---

## Using Templates

### 1. Browse Templates

**Via Templates Page**:
1. Navigate to `/templates` in your browser
2. View available templates in the gallery
3. Filter by sport type using the dropdown (Soccer, Rugby, Training, etc.)

**Via API**:
```bash
curl http://localhost:3001/api/templates
```

**Response**:
```json
{
  "data": [
    {
      "id": 1,
      "name": "Standard Soccer Field",
      "sport_type": "soccer",
      "description": "Full 11v11 pitch with standard markings",
      "zones": [
        {"name": "Main Pitch", "zone_type": "full_pitch", "color": "#00FF00"},
        {"name": "Goal Area North", "zone_type": "goal_area", "color": "#FFFF00"}
      ],
      "assets": [
        {"name": "North Goal", "asset_type": "goal"},
        {"name": "Corner Flag NW", "asset_type": "flag"}
      ],
      "is_public": true
    }
  ],
  "next_cursor": null,
  "has_more": false
}
```

### 2. Apply a Template to Your Layout

**Via UI**:
1. Click the **"Apply Template"** button on desired template card
2. A modal appears asking for the Layout ID
3. Enter your layout ID (e.g., `1`)
4. Click **"Apply"**
5. Template zones/assets are created (without geometry)

**Via API**:
```bash
curl -X POST http://localhost:3001/api/templates/1/apply \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "layout_id": 1,
    "clear_existing": true
  }'
```

**Response**:
```json
{
  "data": {
    "message": "Template applied successfully",
    "zones_created": ["Main Pitch", "Goal Area North", "Goal Area South"],
    "assets_created": ["North Goal", "South Goal", "Corner Flag NW"]
  }
}
```

**Parameters**:
- `layout_id`: The layout where zones/assets will be created
- `clear_existing`: (Optional) If `true`, deletes existing zones/assets before applying (default: `true`)

### 3. Draw Zone Geometry

After applying a template:

1. **Navigate to Layout Editor**:
   - Go to `/layouts/{layout_id}/edit` (or your layout editor route)

2. **View Placeholder Zones**:
   - Zones list shows all created zones
   - Each zone has a warning: "⚠️ No geometry - click to draw"

3. **Draw Zone Boundaries**:
   - Select a zone from the list
   - Activate the drawing tool (polygon mode)
   - Click on the map to draw the zone boundary
   - Close the polygon by clicking the first point again
   - Click "Save Zone"

4. **Repeat for All Zones**:
   - Continue until all zones have geometry
   - Assets can also be positioned by editing their geometry

5. **Result**:
   - Layout is now fully configured
   - Zones have real boundaries matching your field
   - Ready for session booking and sharing

---

## Creating Custom Templates

### Option 1: Save Existing Layout as Template

If you've already configured a layout and want to reuse it:

**Via API**:
```bash
curl -X POST http://localhost:3001/api/templates/from-layout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "layout_id": 5,
    "name": "My Custom Soccer Template",
    "sport_type": "soccer",
    "description": "Custom layout for our club fields",
    "is_public": false
  }'
```

**Parameters**:
- `layout_id`: The layout to extract zones/assets from
- `name`: Template name (displayed in gallery)
- `sport_type`: (Optional) Sport category (soccer, rugby, training, etc.)
- `description`: (Optional) Template description
- `thumbnail_url`: (Optional) Image URL for gallery preview
- `is_public`: (Optional) If `true`, visible to all users (default: `false`)

**Response**:
```json
{
  "data": {
    "id": 15,
    "name": "My Custom Soccer Template",
    "sport_type": "soccer",
    "zones": [...],
    "assets": [...],
    "is_public": false,
    "created_at": "2025-10-27T12:00:00Z"
  }
}
```

### Option 2: Manual Template Creation

For advanced users who want to create templates programmatically:

```javascript
// Example: Create template via API client
import { templateApi } from '@/lib/api';

const newTemplate = await templateApi.createFromLayout({
  layout_id: 10,
  name: "Elite Training Complex",
  sport_type: "training",
  description: "Advanced multi-zone training setup",
  is_public: true, // Share with community
});

console.log(`Template created with ID: ${newTemplate.id}`);
```

---

## Template Gallery UI

### Filter by Sport Type

Use the dropdown to filter templates:
- **All**: Show all templates
- **Soccer**: Soccer-specific layouts
- **Rugby**: Rugby pitch templates
- **Training**: Training/drill setups
- *(More categories as added)*

### Template Card Information

Each card shows:
- **Thumbnail**: Visual preview (gradient placeholder for now)
- **Name**: Template name (e.g., "Standard Soccer Field")
- **Sport Badge**: Sport type indicator
- **Description**: Brief description (up to 2 lines)
- **Stats**: Number of zones and assets
- **Zone Preview**: Up to 3 zones with color indicators
- **Apply Button**: Click to apply to your layout

### Loading & Error States

- **Loading**: Spinner shows while fetching templates
- **Error**: Error message with "Retry" button if fetch fails
- **Empty**: "No templates found" message if filter returns no results

---

## Use Cases

### 1. Quick Venue Setup
**Scenario**: New venue added, need to configure standard soccer pitch.

**Steps**:
1. Create venue and layout in system
2. Browse templates, select "Standard Soccer Field"
3. Apply template to layout
4. Draw zone boundaries in editor
5. Venue ready for booking

**Time**: ~2-3 minutes (vs. 10-15 minutes manually)

### 2. Consistent Multi-Venue Configuration
**Scenario**: Sports club with 5 venues, all need identical layout.

**Steps**:
1. Configure first venue manually
2. Save as custom template (private)
3. Apply template to other 4 venues
4. Draw geometry for each (can use satellite imagery to match)

**Benefit**: Consistent zone naming and asset placement across all venues

### 3. Training Session Planning
**Scenario**: Coach needs to set up multiple drill zones for training.

**Steps**:
1. Browse templates, select "Multi-Zone Training Complex"
2. Apply to training layout
3. Draw drill zone boundaries (3 separate zones)
4. Create session, assign to zones
5. Share session plan with team

**Benefit**: Reusable training layouts, easy session planning

### 4. Community Templates
**Scenario**: Create and share templates with other clubs.

**Steps**:
1. Configure ideal layout for your sport
2. Save as template with `is_public: true`
3. Other users discover in template gallery
4. Apply to their venues with local customization

**Benefit**: Community knowledge sharing, standardized layouts

---

## Troubleshooting

### Template Not Appearing in Gallery

**Possible Causes**:
1. Template is private (`is_public: false`)
2. Sport type filter excludes template
3. Template deleted or archived

**Solution**:
- Check filter: Select "All" sport types
- Verify template exists: `GET /api/templates/{id}`
- Check `is_public` flag in database

### Apply Template Returns 404

**Error**: `Layout not found`

**Cause**: Layout ID doesn't exist or user lacks permission.

**Solution**:
- Verify layout exists: `GET /api/layouts/{id}`
- Check user has access to layout
- Ensure layout belongs to user's club/organization

### Zones Created Without Geometry

**This is expected behavior!** Templates create placeholder zones.

**Next Steps**:
1. Navigate to layout editor
2. Select zone from zones list
3. Use drawing tools to add geometry
4. Save zone

### Template Apply Deletes Existing Zones

**Default behavior**: `clear_existing: true` removes old zones/assets.

**To preserve existing**:
```bash
curl -X POST .../templates/1/apply \
  -d '{"layout_id": 1, "clear_existing": false}'
```

**Warning**: May create duplicate zones if names overlap.

---

## API Reference

### List Templates
```
GET /api/templates
```

**Query Parameters**:
- `sport_type`: Filter by sport (e.g., `soccer`, `rugby`)
- `is_public`: Filter public templates (`true`/`false`)
- `created_by`: Filter by creator user ID
- `limit`: Results per page (default: 50, max: 100)
- `cursor`: Pagination cursor (from previous response)

**Response**: `PaginatedResponse<Template>`

---

### Get Template by ID
```
GET /api/templates/:id
```

**Response**: `{ data: Template }`

---

### Create Template from Layout
```
POST /api/templates/from-layout
```

**Headers**: `Authorization: Bearer <token>` (required)

**Body**:
```json
{
  "layout_id": 1,
  "name": "My Template",
  "sport_type": "soccer",
  "description": "Optional description",
  "thumbnail_url": "https://...",
  "is_public": false
}
```

**Response**: `{ data: Template }`

---

### Apply Template to Layout
```
POST /api/templates/:id/apply
```

**Headers**: `Authorization: Bearer <token>` (required)

**Body**:
```json
{
  "layout_id": 1,
  "clear_existing": true
}
```

**Response**:
```json
{
  "data": {
    "message": "Template applied successfully",
    "zones_created": ["Zone 1", "Zone 2"],
    "assets_created": ["Asset 1", "Asset 2"]
  }
}
```

---

### Delete Template
```
DELETE /api/templates/:id
```

**Headers**: `Authorization: Bearer <token>` (required)

**Permissions**: Only creator or admin can delete.

**Response**: `{ message: "Template deleted" }`

---

## Best Practices

### For Template Creators

1. **Use Descriptive Names**: "Standard Soccer Field" > "Template 1"
2. **Add Descriptions**: Explain use case and key features
3. **Choose Appropriate Sport Type**: Helps users filter effectively
4. **Include All Standard Zones**: Don't skip goal areas, penalty boxes, etc.
5. **Add Relevant Assets**: Goals, flags, markers for complete setup
6. **Test Before Sharing**: Apply to test layout, verify zones make sense
7. **Make Public Judiciously**: Only share well-tested, general-purpose templates

### For Template Users

1. **Review Before Applying**: Check zone list to ensure it matches your needs
2. **Use clear_existing Carefully**: Backup data if preserving existing zones
3. **Draw Geometry Immediately**: Don't leave placeholder zones indefinitely
4. **Customize to Fit**: Templates are starting points, adjust as needed
5. **Save Custom Variations**: If you modify, save as new private template

### For Administrators

1. **Curate Public Templates**: Remove duplicates, low-quality submissions
2. **Add Official Templates**: Create high-quality templates for common sports
3. **Monitor Usage**: Track which templates are most popular
4. **Add Thumbnails**: Visual previews improve template selection
5. **Version Templates**: Consider versioning for major layout changes

---

## Future Enhancements

Planned features (not yet implemented):

- **Template Categories/Tags**: Organize templates by use case (youth, professional, training)
- **Template Ratings**: User reviews and ratings
- **Template Search**: Full-text search by name/description
- **Template Thumbnails**: Upload actual field images for previews
- **Template Versioning**: Track changes over time
- **Template Duplication**: Clone existing template as starting point
- **Geometry Presets**: Include sample geometry (adjustable rectangles)
- **Asset Positioning**: Store asset coordinates for auto-placement

---

## Support

For issues or questions:
1. Check this guide's Troubleshooting section
2. Review API documentation in `DEVELOPER_GUIDE.md`
3. Contact your system administrator
4. Open an issue on GitHub (for developers)

---

**Last Updated**: October 27, 2025
**Version**: 1.0.0
