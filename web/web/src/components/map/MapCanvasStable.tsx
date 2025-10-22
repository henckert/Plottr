"use client";
import React, { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MapLibreMap, LngLatBoundsLike } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { waitForStyleReady, addOrUpdateGeoJSONSource, ensureLayer } from "@/components/map/maplibre-stable";

type Zone = {
  id: string;
  name: string;
  color?: string;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
};

const SOURCE_ID = "zones";
const FILL_LAYER_ID = "zones-fill";
const LINE_LAYER_ID = "zones-line";

function toFeatureCollection(zones: Zone[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: zones.map((z) => ({
      type: "Feature",
      id: z.id,
      properties: { id: z.id, name: z.name, color: z.color ?? "#2b8a3e" },
      geometry: z.geometry as any,
    })),
  };
}

async function fetchZones(signal?: AbortSignal): Promise<Zone[]> {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3001";
  const res = await fetch(`${base}/api/zones?limit=400`, { signal, headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error(`Failed to fetch zones: ${res.status}`);
  const body = await res.json();
  return (body?.data ?? []) as Zone[];
}

function computeBounds(zones: Zone[]): LngLatBoundsLike | null {
  const coords: [number, number][]= [];
  for (const z of zones) {
    const geom = z.geometry;
    if (geom.type === "Polygon") {
      for (const ring of geom.coordinates) coords.push(...(ring as any));
    } else if (geom.type === "MultiPolygon") {
      for (const poly of geom.coordinates) for (const ring of poly) coords.push(...(ring as any));
    }
  }
  if (!coords.length) return null;
  let minLng = 180, minLat = 90, maxLng = -180, maxLat = -90;
  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }
  return [[minLng, minLat],[maxLng, maxLat]];
}

export default function MapCanvasStable() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [status, setStatus] = useState<"idle"|"loading"|"ready"|"error">("idle");
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [-6.2603, 53.3498],
      zoom: 10,
      attributionControl: true
    });

    mapRef.current = map;
    setStatus("loading");

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

    const abort = new AbortController();

    (async () => {
      try {
        await waitForStyleReady(map);
        const zones = await fetchZones(abort.signal);
        const fc = toFeatureCollection(zones);
        addOrUpdateGeoJSONSource(map, SOURCE_ID, fc);

        ensureLayer(map, {
          id: FILL_LAYER_ID, type: "fill", source: SOURCE_ID,
          paint: { "fill-color": ["coalesce", ["get", "color"], "#2b8a3e"], "fill-opacity": 0.35 }
        } as any);
        ensureLayer(map, {
          id: LINE_LAYER_ID, type: "line", source: SOURCE_ID,
          paint: { "line-color": "#1f2937", "line-width": 1.5 }
        } as any);

        const b = computeBounds(zones);
        if (b) { try { map.fitBounds(b, { padding: 40, duration: 0 }); } catch {} }

        map.on("click", FILL_LAYER_ID, (e) => {
          const f = e.features?.[0];
          if (f) console.log("Zone clicked:", { id: f.properties?.id, name: f.properties?.name });
        });

        setStatus("ready");
      } catch (e: any) {
        console.error("Map init error:", e);
        setErr(String(e?.message || e));
        setStatus("error");
      }
    })();

    return () => { abort.abort(); try { map.remove(); } catch {}; mapRef.current = null; };
  }, []);

  return (
    <ErrorBoundary>
      <div className="flex flex-col gap-2">
        <div className="text-sm text-gray-600">Map status: {status}{err ? ` – ${err}` : ""}</div>
        <div ref={containerRef} style={{ width: "100%", height: "70vh", borderRadius: 12, overflow: "hidden",
          boxShadow: "0 0 0 1px #e5e7eb inset" }} />
      </div>
    </ErrorBoundary>
  );
}
