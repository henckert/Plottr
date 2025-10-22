import type { Map as MapLibreMap, AnyLayer, AnySourceImpl } from "maplibre-gl";

export async function waitForStyleReady(map: MapLibreMap): Promise<void> {
  if ((map as any).isStyleLoaded && (map as any).isStyleLoaded()) return;
  await new Promise<void>((resolve) => {
    const onIdle = () => {
      if ((map as any).isStyleLoaded && (map as any).isStyleLoaded()) {
        map.off("idle", onIdle);
        resolve();
      }
    };
    map.on("idle", onIdle);
  });
}

export function addOrUpdateGeoJSONSource(map: MapLibreMap, id: string, data: GeoJSON.FeatureCollection) {
  const src = map.getSource(id);
  if (src && typeof (src as any).setData === "function") {
    (src as any).setData(data);
  } else if (!src) {
    map.addSource(id, { type: "geojson", data } as AnySourceImpl);
  }
}

export function ensureLayer(map: MapLibreMap, layer: AnyLayer) {
  if (!map.getLayer(layer.id)) map.addLayer(layer);
}
