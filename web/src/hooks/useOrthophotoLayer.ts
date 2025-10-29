// web/src/hooks/useOrthophotoLayer.ts
import { useEffect } from "react";

/**
 * Add/remove orthophoto raster overlay to MapLibre map
 * @param map MapLibre GL map instance
 * @param enabled Whether to show orthophoto overlay
 * @param opacity Opacity of overlay (0-1)
 */
export function useOrthophotoLayer(map?: any, enabled?: boolean, opacity: number = 0.6) {
  useEffect(() => {
    if (!map) return;

    const id = "orthophoto-overlay";

    if (enabled) {
      // Add or update layer
      if (!map.getSource(id)) {
        map.addSource(id, {
          type: "raster",
          tiles: [
            // TODO: configure legal orthophoto tiles for dev; leave commented if not available
            // Example: USGS, Bing, or custom tile server
            // "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          ],
          tileSize: 256,
          attribution: "© Orthophoto Provider",
        });

        map.addLayer(
          {
            id,
            type: "raster",
            source: id,
            paint: {
              "raster-opacity": opacity,
            },
          },
          undefined // Insert before layer ID (optional)
        );
      } else {
        // Update opacity
        map.setPaintProperty(id, "raster-opacity", opacity);
      }
    } else {
      // Remove layer and source
      if (map.getLayer(id)) {
        map.removeLayer(id);
      }
      if (map.getSource(id)) {
        map.removeSource(id);
      }
    }
  }, [map, enabled, opacity]);
}
