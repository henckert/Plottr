/**
 * Simple Map Test - No dependencies, just MapLibre
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export default function SimpleMapPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('Initializing...');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    console.log('[MAP]', msg);
    setLogs(prev => [...prev, `${new Date().toISOString().split('T')[1].split('.')[0]} - ${msg}`]);
  };

  useEffect(() => {
    addLog('useEffect started');
    
    if (!mapContainer.current) {
      addLog('ERROR: mapContainer.current is null!');
      setStatus('Error: Container not found');
      return; // No cleanup needed if map not created
    }

    addLog('Container found, creating map...');
    setStatus('Creating map...');
    
    try {
      const map = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            'osm': {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap'
            }
          },
          layers: [
            {
              id: 'osm-layer',
              type: 'raster',
              source: 'osm'
            }
          ]
        },
        center: [-9.26, 53.27], // Galway, Ireland
        zoom: 14
      });

      addLog('Map instance created');
      setStatus('Map instance created, waiting for load...');

      map.on('load', () => {
        addLog('Map loaded successfully!');
        setStatus('✓ Map loaded successfully!');
      });

      map.on('error', (e) => {
        const errorMsg = e.error?.message || String(e.error);
        addLog('ERROR: ' + errorMsg);
        setStatus('Error: ' + errorMsg);
      });

      return () => {
        addLog('Cleanup: removing map');
        map.remove();
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      addLog('EXCEPTION: ' + errorMsg);
      setStatus('Exception: ' + errorMsg);
      return undefined; // Explicit return for consistency
    }
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Simple Map Test (Debug Mode)</h1>
      <p className="text-lg font-semibold mb-2" style={{ 
        color: status.includes('Error') || status.includes('Exception') ? 'red' : 
               status.includes('✓') ? 'green' : 'blue'
      }}>
        Status: {status}
      </p>
      
      <div className="mb-4 p-3 bg-gray-100 rounded" style={{ maxHeight: '200px', overflow: 'auto' }}>
        <h3 className="font-semibold mb-2">Debug Logs:</h3>
        {logs.length === 0 ? (
          <p className="text-sm text-gray-500">No logs yet...</p>
        ) : (
          <ul className="text-xs font-mono space-y-1">
            {logs.map((log, i) => (
              <li key={i} className={log.includes('ERROR') ? 'text-red-600' : 'text-gray-700'}>
                {log}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div 
        ref={mapContainer} 
        style={{ 
          width: '100%', 
          height: '500px',
          border: '2px solid #ccc',
          borderRadius: '8px',
          backgroundColor: '#f5f5f5'
        }} 
      />
    </div>
  );
}
