import dynamic from "next/dynamic";
const MapCanvasStable = dynamic(() => import("@/components/map/MapCanvasStable"), { ssr: false });

export default function Page() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-3">Map Test (Fixed Pipeline)</h1>
      <p className="text-sm text-gray-600 mb-4">
        Style-ready guard, API-backed zones, idempotent layers, ErrorBoundary.
      </p>
      <MapCanvasStable />
    </main>
  );
}
