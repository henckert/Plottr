# Sharing Layouts

**Share your field layouts** with teammates, coaches, event planners, or the public. Generate secure links with optional expiration dates and track view analytics.

---

## Table of Contents

1. [Overview](#overview)
2. [Creating a Share Link](#creating-a-share-link)
3. [Managing Share Links](#managing-share-links)
4. [Viewing Share Analytics](#viewing-share-analytics)
5. [Revoking Access](#revoking-access)
6. [Public Share View](#public-share-view)
7. [Best Practices](#best-practices)

---

## Overview

### What Are Share Links?

A **share link** is a unique URL that provides read-only access to a layout without requiring login.

**Example Share URL:**
```
https://plottr.app/share/a8f3k9m2
```

### Key Features

- ✅ **No authentication required**: Recipients don't need an account
- ✅ **Read-only access**: Viewers can't edit your layout
- ✅ **Optional expiration**: Set links to expire after a date/time
- ✅ **View analytics**: Track how many times the link has been accessed
- ✅ **Easy revocation**: Delete links anytime to stop sharing

### Use Cases

- **Event Planning**: Share venue layouts with event organizers
- **Team Coordination**: Give coaches access to field configurations
- **Client Presentations**: Show facility options to potential clients
- **Public Information**: Let community members view park layouts
- **Temporary Access**: Create expiring links for time-limited events

---

## Creating a Share Link

### Step 1: Navigate to Layout Detail

1. Go to **Layouts**
2. Click on the layout you want to share
3. You'll see the layout detail page

### Step 2: Create Share Link

1. Click **Create Share Link** button
2. The "Create Share Link" modal appears

### Step 3: Configure Link Settings

**Required: None** (all settings are optional)

**Optional Settings:**

**Expiration Date/Time:**
- Leave blank for a permanent link
- Set a date/time for the link to expire
- Use the datetime picker to select when access should end

**When to Set Expiration:**
- ✅ Event-specific layouts (expire after event)
- ✅ Temporary collaborations
- ✅ Time-limited promotions
- ⬜ Permanent public information

**Example Expiration Scenarios:**
- "Soccer tournament on June 15" → Expire June 16
- "Monthly field review" → Expire end of month
- "Public park layout" → No expiration

### Step 4: Create the Link

1. Review your settings
2. Click **Create Share Link**
3. The link appears in the Share Links list

**✅ Created!** Your share link is ready to use.

---

## Managing Share Links

### Viewing All Share Links

On the **Layout Detail** page, you'll see the **Share Links** section showing:

- **Share URL**: Full URL (click to copy)
- **View Count**: Number of times the link has been accessed
- **Last Accessed**: When the link was last viewed (if ever)
- **Expires**: Expiration date/time (if set)
- **Created**: When the link was created
- **Status**: Active or Expired

### Copying a Share Link

**Option 1: Copy Button**
1. Find the share link in the list
2. Click the **Copy** button (clipboard icon)
3. Toast notification confirms copy
4. Paste anywhere (email, Slack, SMS, etc.)

**Option 2: Manual Copy**
1. Click the URL to select
2. Press `Ctrl+C` (Windows) or `Cmd+C` (Mac)
3. Paste anywhere

### Multiple Share Links

You can create multiple share links for the same layout:

**Why Create Multiple Links?**
- Different expiration dates for different audiences
- Track which distribution channel gets most views
- Separate links for internal vs. external sharing
- Easy revocation of specific audience access

**Example:**
- Link 1: For coaches (expires end of season)
- Link 2: For parents (permanent)
- Link 3: For tournament organizers (expires after event)

---

## Viewing Share Analytics

### Available Metrics

For each share link, you can see:

**View Count:**
- Total number of times the link has been accessed
- Increments each time someone loads the public page
- Useful for gauging interest and reach

**Last Accessed:**
- Timestamp of most recent view
- Shows "Never" if link hasn't been used
- Helps identify stale/unused links

**Expiration Status:**
- Shows days remaining if expiring soon (<7 days)
- "Expired" badge if past expiration date
- Expired links return 404 when accessed

### Analytics Dashboard (Coming Soon)

Future features planned:
- View count over time (chart)
- Geographic distribution of views
- Referrer information (where viewers came from)
- Most popular layouts

---

## Revoking Access

### When to Revoke

- Event has ended
- Collaboration is complete
- Link was shared accidentally
- Layout has been significantly updated
- Security concerns

### How to Revoke

1. Go to **Layout Detail** page
2. Find the share link in the list
3. Click **Revoke** button
4. Confirm deletion

**⚠️ Effect of Revocation:**
- Link immediately stops working
- Viewers see 404 error if they try to access
- View count/analytics are preserved for your records
- Revocation cannot be undone (create new link if needed)

### Revoke vs. Delete Layout

| Action | Effect on Share Links |
|--------|----------------------|
| **Revoke Share Link** | Only that specific link stops working; layout remains accessible via other links |
| **Delete Layout** | All share links for that layout stop working; layout is completely removed |

---

## Public Share View

### What Viewers See

When someone accesses a share link, they see a **read-only public page** with:

**Layout Information:**
- Layout name
- Description
- Site name and location
- Last updated timestamp

**Interactive Map:**
- MapLibre GL map with OpenStreetMap basemap
- Zones displayed as colored polygons
- Assets displayed as markers/lines
- Click zones/assets for details (popup)
- Zoom/pan controls
- Navigation controls

**Zones List:**
- Zone name
- Zone type (pitch, court, etc.)
- Area (m² and acres)
- Color indicator

**Assets List:**
- Asset name
- Asset type (goal, bench, etc.)
- Icon preview

**Share Link Info:**
- View count
- Expiration status (if applicable)

### What Viewers CANNOT Do

- ❌ Edit the layout
- ❌ Add/delete zones or assets
- ❌ See who created the layout
- ❌ Access other layouts
- ❌ See analytics
- ❌ Create new share links

### Mobile-Friendly

The public share view is fully responsive:
- Works on phones, tablets, desktops
- Touch-friendly map controls
- Readable text at all sizes
- Collapsible sidebars on mobile

---

## Best Practices

### Security

**1. Use Expiration Dates for Sensitive Layouts**
- Set expiration for layouts with sensitive information
- Review and remove old links regularly
- Don't share permanent links for temporary needs

**2. Monitor View Counts**
- Unusual spikes may indicate unwanted sharing
- Revoke and create new link if compromised
- Track which links are actively used

**3. Be Careful with Permanent Links**
- Only use for truly public information
- Understand links can be shared further
- Consider expiration for controlled distribution

### Distribution

**1. Choose the Right Channel**
- Email: For specific recipients
- Slack/Teams: For team collaboration
- Social Media: For public awareness
- QR Code: For physical locations (posters, signs)

**2. Provide Context**
- Include layout name in message
- Explain what viewers will see
- Note expiration date if applicable

**3. Track Distribution**
- Create separate links for different channels
- Compare view counts to see most effective channel
- Adjust strategy based on analytics

### Organization

**1. Name Layouts Clearly**
- Layout name appears on share page
- Use descriptive names viewers will understand
- Include date/version if relevant

**2. Clean Up Old Links**
- Review share links monthly
- Revoke expired or unused links
- Keep only active, necessary links

**3. Use Descriptions**
- Add helpful descriptions to layouts
- Viewers see this on the public page
- Explain purpose, dates, or special features

---

## Troubleshooting

### Link Returns 404

**Possible Causes:**
1. Link has expired
2. Link has been revoked
3. Layout has been deleted
4. Typo in the URL

**Solutions:**
- Check expiration date
- Verify link hasn't been revoked
- Create a new share link
- Double-check the URL

### View Count Not Increasing

**Possible Causes:**
1. Same person viewing multiple times (may not increment)
2. Browser caching
3. Analytics delay

**Solutions:**
- Try accessing from different device/browser
- Clear browser cache
- Wait a few minutes for analytics to update

### Can't Create Share Link

**Possible Causes:**
1. Don't have permission to share layout
2. Layout is in draft mode
3. Database connection issue

**Solutions:**
- Verify you own or have access to the layout
- Publish the layout first (change from Draft to Published)
- Contact support if issue persists

---

## API Usage

For developers, share links can be managed via API:

```bash
# Create share link
POST /api/share-links
{
  "layout_id": 123,
  "expires_at": "2025-12-31T23:59:59Z"  # Optional
}

# List share links for a layout
GET /api/share-links?layout_id=123

# Get share link details
GET /api/share-links/:id

# Revoke share link
DELETE /api/share-links/:id

# Public access (no auth required)
GET /share/:slug
```

**Response Example:**
```json
{
  "data": {
    "id": 42,
    "layout_id": 123,
    "slug": "a8f3k9m2",
    "expires_at": "2025-12-31T23:59:59Z",
    "view_count": 156,
    "last_accessed_at": "2025-10-27T14:30:00Z",
    "created_at": "2025-10-01T10:00:00Z"
  }
}
```

---

## Examples

### Example 1: Event Sharing

**Scenario:** Youth soccer tournament on June 15, 2025

**Steps:**
1. Create layout "Summer Tournament 2025"
2. Add all pitches and facilities
3. Create share link with expiration: June 16, 2025
4. Email link to coaches and parents
5. Post link on tournament website

**Result:** Everyone sees the same layout, link auto-expires after event

---

### Example 2: Client Presentation

**Scenario:** Showing facility options to a potential client

**Steps:**
1. Create layouts for 3 different configurations
2. Create permanent share links for each
3. Send all three links to client
4. Track which layout gets most views
5. Revoke links after client makes decision

**Result:** Client can review at their own pace, you see which option is most interesting

---

### Example 3: Public Park Information

**Scenario:** Community park layout for public reference

**Steps:**
1. Create layout "Central Park - Current Configuration"
2. Include all fields, courts, playgrounds, parking
3. Create permanent share link (no expiration)
4. Post link on city website
5. Print QR code on park entrance sign

**Result:** Permanent public access, track community engagement via view count

---

## Next Steps

- **Export Your Layouts**: [User Guide: Export](./USER_GUIDE_EXPORT.md)
- **Apply Templates**: [User Guide: Templates](./USER_GUIDE_TEMPLATES.md)
- **API Reference**: [Full API Documentation](./API_REFERENCE.md)

---

**Last Updated:** October 27, 2025  
**Version:** 1.0.0  
**Previous Guide:** [← Using Templates](./USER_GUIDE_TEMPLATES.md)  
**Next Guide:** [Export Layouts →](./USER_GUIDE_EXPORT.md)
