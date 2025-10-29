"use client";

import { useEffect, useRef, useState } from "react";
import StylePresetSwitcher, { StylePreset } from "./StylePresetSwitcher";
import { GeolocateButton } from "./GeolocateButton";
import "maplibre-gl/dist/maplibre-gl.css";

const RASTER_FALLBACK: any = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

const STYLE_URLS: Record<StylePreset, string> = {
  rural: "/styles/rural-view.json",
  greyscale: "/styles/greyscale-view.json",
  minimal: "/styles/minimal-view.json",
  night: "/styles/night-view.json",
};

export default function SiteLocationMap({
  lat,
  lng,
  onChange,
  showStyleSwitcher = true,
}: {
  lat: number;
  lng: number;
  onChange?: (lat: number, lng: number) => void;
  showStyleSwitcher?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  
  // Load saved style preference from localStorage, default to 'rural'
  const [preset, setPreset] = useState<StylePreset>(() => {
    if (typeof window === 'undefined') return 'rural';
    const saved = localStorage.getItem('plotiq:mapStyle');
    return (saved as StylePreset) || 'rural';
  });

  // Persist style preference to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('plotiq:mapStyle', preset);
    }
  }, [preset]);

  // Init map once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        console.log("[PlotIQ] Starting map initialization...");
        const maplibreModule = await import("maplibre-gl");
        const maplibregl = maplibreModule.default;
        
        if (cancelled) {
          console.log("[PlotIQ] Map init cancelled");
          return;
        }
        
        if (!mapDivRef.current) {
          console.error("[PlotIQ] Map container ref is null");
          return;
        }

        console.log("[PlotIQ] Creating map instance...", { lng, lat });
        const map = new maplibregl.Map({
          container: mapDivRef.current,
          style: RASTER_FALLBACK, // start with safe raster
          center: [lng, lat],
          zoom: 14,
          attributionControl: false,
        });
        mapRef.current = map;

        // diagnostics
        map.on("error", (e: any) => console.warn("[PlotIQ map error]", e?.error || e));
        map.on("load", () => {
          console.log("[PlotIQ] Map loaded successfully");
          // Try to load saved/default vector style
          swapStyle(preset);
        });

        // marker
        const marker = new maplibregl.Marker({ draggable: true, color: "#3B82F6" })
          .setLngLat([lng, lat])
          .addTo(map);
        markerRef.current = marker;
        console.log("[PlotIQ] Marker added at", { lng, lat });

        marker.on("dragend", () => {
          const p = marker.getLngLat();
          onChange?.(p.lat, p.lng);
        });
      } catch (error) {
        console.error("[PlotIQ] Map initialization failed:", error);
      }
    })();
    return () => {
      cancelled = true;
      try {
        markerRef.current?.remove?.();
        mapRef.current?.remove?.();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to preset changes
  useEffect(() => {
    swapStyle(preset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset]);

  // Keep marker/map in sync with external coords
  useEffect(() => {
    if (markerRef.current && mapRef.current) {
      markerRef.current.setLngLat([lng, lat]);
      mapRef.current.setCenter([lng, lat]);
    }
  }, [lat, lng]);

  async function swapStyle(p: StylePreset) {
    const map = mapRef.current;
    if (!map) return;

    const url = STYLE_URLS[p];

    // Try fetch first to avoid setStyle loop on 404
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`Style ${p} not found (${res.status})`);
      // Apply style
      map.setStyle(url + "?v=1");
      map.once("styledata", () => {
        // re-add marker after style swap
        try {
          markerRef.current?.addTo(map);
        } catch {}
      });
    } catch (err) {
      console.warn(`[PlotIQ] vector style failed (${p}):`, err);
      // Fall back to raster, keep UX alive
      map.setStyle(RASTER_FALLBACK);
      map.once("styledata", () => {
        try {
          markerRef.current?.addTo(map);
        } catch {}
      });
    }
  }

  return (
    <div ref={wrapRef} className="relative w-full h-[520px] rounded-xl overflow-hidden border border-gray-300 bg-gray-100">
      {/* Style switcher */}
      {showStyleSwitcher && (
        <StylePresetSwitcher
          value={preset}
          onChange={setPreset}
          className="absolute top-3 left-3 z-20 bg-white rounded-xl shadow-lg px-3 py-2 border border-gray-200"
        />
      )}
      
      {/* Geolocate Button */}
      <div className="absolute top-3 right-3 z-20">
        <GeolocateButton
          map={mapRef.current}
          onLocationFound={(lat, lon) => {
            onChange?.(lat, lon);
            if (markerRef.current) {
              markerRef.current.setLngLat([lon, lat]);
            }
          }}
          onError={(error) => {
            console.warn('[PlotIQ] Geolocation error:', error);
          }}
        />
      </div>
      
      <div ref={mapDivRef} className="w-full h-full bg-gray-50" />
    </div>
  );
}
