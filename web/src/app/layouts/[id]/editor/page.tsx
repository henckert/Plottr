/**
 * Layout Editor Page
 * Full-screen map editor for drawing and managing zones within a layout
 * Route: /layouts/[id]/editor
 */

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useCallback, useEffect } from 'react';
import { useLayout } from '@/hooks/useLayouts';
import { useZones, useDeleteZone } from '@/hooks/useZones';
import { MapCanvasWithDraw } from '@/components/editor/MapCanvasWithDraw';
import { LayoutHeader } from '@/components/editor/LayoutHeader';
import { ZoneDetailPanel } from '@/components/editor/ZoneDetailPanel';

export default function LayoutEditorPage() {
  const params = useParams();
  const router = useRouter();
  const layoutId = Number(params.id);

  // State
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  // Data fetching
  const { data: layout, isLoading: layoutLoading, error: layoutError } = useLayout(layoutId);
  const { data: zonesResponse, isLoading: zonesLoading } = useZones({
    layoutId,
    limit: 100,
  });

  const deleteZoneMutation = useDeleteZone();

  const zones = zonesResponse?.data || [];
  const selectedZone = zones.find((z) => z.id === selectedZoneId);

  // Handlers
  const handleZoneClick = useCallback((zoneId: number) => {
    setSelectedZoneId(zoneId);
    setIsEditMode(false);
    setSaveStatus('saved');
  }, []);

  const handleEditZone = useCallback(() => {
    setIsEditMode(true);
    setSelectedZoneId(null); // Close detail panel, ZonePropertiesPanel will open in MapCanvasWithDraw
  }, []);

  const handleDeleteZone = useCallback(() => {
    if (!selectedZone) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${selectedZone.name}"? This action cannot be undone.`
    );

    if (confirmed) {
      setSaveStatus('saving');
      deleteZoneMutation.mutate(
        {
          zoneId: selectedZone.id,
          versionToken: selectedZone.version_token || '',
        },
        {
          onSuccess: () => {
            setSelectedZoneId(null);
            setSaveStatus('saved');
          },
          onError: (error: any) => {
            alert(`Failed to delete zone: ${error.message}`);
            setSaveStatus('error');
          },
        }
      );
    }
  }, [selectedZone, deleteZoneMutation]);

  const handleClosePanel = useCallback(() => {
    setSelectedZoneId(null);
    setIsEditMode(false);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC: Cancel/deselect
      if (e.key === 'Escape') {
        setSelectedZoneId(null);
        setIsEditMode(false);
      }

      // Delete/Backspace: Delete selected zone
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedZone && !isEditMode) {
        // Only if not editing a text input
        const activeElement = document.activeElement;
        if (
          activeElement?.tagName !== 'INPUT' &&
          activeElement?.tagName !== 'TEXTAREA'
        ) {
          e.preventDefault();
          handleDeleteZone();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedZone, isEditMode, handleDeleteZone]);

  // Loading state
  if (layoutLoading || zonesLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto"></div>
          <p className="text-gray-600">Loading layout editor...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (layoutError || !layout) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Layout Not Found</h1>
          <p className="text-gray-600 mb-4">
            {layoutError
              ? `Error: ${(layoutError as any).message}`
              : 'The requested layout does not exist.'}
          </p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <LayoutHeader
        layout={layout}
        zoneCount={zones.length}
        saveStatus={saveStatus}
        onBack={() => router.push(`/layouts/${layoutId}`)}
      />

      {/* Map Canvas */}
      <div className="flex-1 relative">
        <MapCanvasWithDraw
          layoutId={layoutId}
          zones={zones}
          selectedZoneId={selectedZoneId}
          onZoneClick={handleZoneClick}
          isLoading={zonesLoading}
        />

        {/* Zone Detail Panel (when zone selected and not editing) */}
        {selectedZone && !isEditMode && (
          <ZoneDetailPanel
            zone={selectedZone}
            onEdit={handleEditZone}
            onDelete={handleDeleteZone}
            onClose={handleClosePanel}
          />
        )}
      </div>
    </div>
  );
}
