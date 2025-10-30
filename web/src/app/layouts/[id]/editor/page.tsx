/**
 * Layout Editor Page
 * Full-screen map editor for drawing and managing zones within a layout
 * Route: /layouts/[id]/editor
 */

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useCallback, useEffect } from 'react';
import { useLayout } from '@/hooks/useLayouts';
import { useSite } from '@/hooks/useSites';
import { useZones, useDeleteZone } from '@/hooks/useZones';
import { MapCanvasWithDraw } from '@/components/editor/MapCanvasWithDraw';
import { LayoutHeader } from '@/components/editor/LayoutHeader';
import { ZoneDetailPanel } from '@/components/editor/ZoneDetailPanel';
import { QuickStartWizard } from '@/components/editor/QuickStartWizard';
import { Toolbar } from '@/components/editor/Toolbar';
import { BottomStatus } from '@/components/editor/BottomStatus';
import { LeftRail } from '@/components/editor/LeftRail';
import { CommandPalette } from '@/components/editor/CommandPalette';
import { RuralModePanel } from '@/components/editor/RuralModePanel';
import { EmptyState } from '@/components/editor/EmptyState';
import { GridOverlay } from '@/components/editor/GridOverlay';
import { DraggablePanel } from '@/components/editor/DraggablePanel';
import { MapGeocodingSearch } from '@/components/editor/MapGeocodingSearch';
import { useEditorStore } from '@/store/editor.store';

export default function LayoutEditorPage() {
  const params = useParams();
  const router = useRouter();
  const layoutId = Number(params.id);

  // Editor store
  const { 
    openQuickStart, 
    snapEnabled, 
    showRuralPanel, 
    setShowRuralPanel,
    rotationSnap,
    rotationSnapEnabled,
  } = useEditorStore();

  // State
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'unsaved'>('saved');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Data fetching
  const { data: layout, isLoading: layoutLoading, error: layoutError } = useLayout(layoutId);
  const { data: site, isLoading: siteLoading } = useSite(layout?.site_id ?? null);
  const { data: zonesResponse, isLoading: zonesLoading } = useZones({
    layoutId,
    limit: 100,
  });

  const deleteZoneMutation = useDeleteZone();

  const zones = zonesResponse?.data || [];
  const selectedZone = zones.find((z) => z.id === selectedZoneId);

  // Map state - default to site location or Dublin, Ireland
  const [mapCenter, setMapCenter] = useState<[number, number]>([-6.2603, 53.3498]);
  const [mapZoom, setMapZoom] = useState<number>(15);

  // Update map center when site data loads
  useEffect(() => {
    if (site?.location?.coordinates) {
      setMapCenter([site.location.coordinates[0], site.location.coordinates[1]]);
      setMapZoom(16);
    }
  }, [site]);

  // Handlers for QuickStart and EmptyState
  const handleQuickStartComplete = useCallback(() => {
    // TODO: Handle template/rectangle/trace creation
    useEditorStore.getState().setOpenQuickStart(false);
  }, []);

  const handleTemplate = useCallback(() => {
    // TODO: Open template gallery
    console.log('Open template gallery');
  }, []);

  const handleRectangle = useCallback(() => {
    // TODO: Start rectangle drawing mode
    useEditorStore.getState().setTool('draw');
  }, []);

  const handleTrace = useCallback(() => {
    // TODO: Enable rural mode for tracing
    useEditorStore.getState().setRuralMode(true);
  }, []);

  // Handle geocoding search result
  const handleGeocodingResult = useCallback((result: any) => {
    // Fly to the selected location
    const [lng, lat] = result.center;
    setMapCenter([lng, lat]);
    setMapZoom(result.bbox ? 15 : 17); // Use higher zoom if no bbox
  }, []);

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

  // Manual save handler
  const handleManualSave = useCallback(() => {
    if (!hasUnsavedChanges || saveStatus === 'saving') {
      return; // Nothing to save or already saving
    }

    console.log('[Manual Save] Triggered by user');
    // TODO: Implement actual save logic
    // For now, this is a placeholder that simulates saving
    setSaveStatus('saving');
    setHasUnsavedChanges(false);

    // Simulate API call
    setTimeout(() => {
      setSaveStatus('saved');
      console.log('[Manual Save] Complete');
    }, 500);
  }, [hasUnsavedChanges, saveStatus]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input field
      const activeElement = document.activeElement;
      const isTyping = 
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA';

      // Ctrl+S / Cmd+S: Manual save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleManualSave();
        return;
      }

      // ESC: Cancel/deselect
      if (e.key === 'Escape') {
        setSelectedZoneId(null);
        setIsEditMode(false);
      }

      // Q: Rotate counter-clockwise
      if (e.key === 'q' || e.key === 'Q') {
        if (!isTyping && selectedZone) {
          e.preventDefault();
          const step = rotationSnapEnabled ? rotationSnap : 5;
          // TODO: Add rotation_deg field to zones schema
          // const currentRotation = selectedZone.rotation_deg || 0;
          const currentRotation = 0; // Placeholder until zones support rotation
          const newRotation = ((currentRotation - step) % 360 + 360) % 360;
          // TODO: Update zone rotation via mutation
          console.log(`Rotate CCW: ${currentRotation}° → ${newRotation}°`);
          setHasUnsavedChanges(true);
          setSaveStatus('unsaved');
        }
      }

      // E: Rotate clockwise
      if (e.key === 'e' || e.key === 'E') {
        if (!isTyping && selectedZone) {
          e.preventDefault();
          const step = rotationSnapEnabled ? rotationSnap : 5;
          // TODO: Add rotation_deg field to zones schema
          // const currentRotation = selectedZone.rotation_deg || 0;
          const currentRotation = 0; // Placeholder until zones support rotation
          const newRotation = (currentRotation + step) % 360;
          // TODO: Update zone rotation via mutation
          console.log(`Rotate CW: ${currentRotation}° → ${newRotation}°`);
          setHasUnsavedChanges(true);
          setSaveStatus('unsaved');
        }
      }

      // Delete/Backspace: Delete selected zone
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedZone && !isEditMode) {
        if (!isTyping) {
          e.preventDefault();
          handleDeleteZone();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedZone, isEditMode, handleDeleteZone, rotationSnap, rotationSnapEnabled, handleManualSave]);

  // Loading state
  if (layoutLoading || zonesLoading || siteLoading) {
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
      {/* QuickStart Wizard (shows on first load or when openQuickStart is true) */}
      {openQuickStart && <QuickStartWizard onComplete={handleQuickStartComplete} />}

      {/* Command Palette (Cmd+K) */}
      <CommandPalette />

      {/* Header */}
      <LayoutHeader
        layout={layout}
        zoneCount={zones.length}
        saveStatus={saveStatus}
        onBack={() => router.push(`/layouts/${layoutId}`)}
      />

      {/* Main Editor Layout */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Left Rail (Templates/Shapes/Layers/Props) */}
        <LeftRail />

        {/* Map Canvas Container */}
        <div className="flex-1 relative">
          {/* Empty State (when no zones exist) */}
          {zones.length === 0 && (
            <EmptyState
              onTemplate={handleTemplate}
              onRectangle={handleRectangle}
              onTrace={handleTrace}
            />
          )}

          <MapCanvasWithDraw
            layoutId={layoutId}
            zones={zones}
            selectedZoneId={selectedZoneId}
            onZoneClick={handleZoneClick}
            isLoading={zonesLoading}
            center={mapCenter}
            zoom={mapZoom}
          />

          {/* Grid Overlay (when snap enabled) */}
          {snapEnabled && <GridOverlay />}

          {/* Location Search Bar (top-left) */}
          <div className="absolute top-4 left-4 z-10 w-80">
            <MapGeocodingSearch onResultSelect={handleGeocodingResult} />
          </div>

          {/* Toolbar (top-right floating, below map controls) */}
          <div className="absolute top-16 right-4 z-10">
            <DraggablePanel 
              defaultPosition={{ x: 0, y: 0 }}
              storageKey="editor-toolbar-position"
            >
              <Toolbar 
                onSave={handleManualSave}
                saveStatus={saveStatus}
                hasUnsavedChanges={hasUnsavedChanges}
              />
            </DraggablePanel>
          </div>

          {/* Rural Mode Panel (bottom-right floating) */}
          {showRuralPanel && (
            <div className="absolute bottom-20 right-4 z-10">
              <DraggablePanel
                defaultPosition={{ x: 0, y: 0 }}
                storageKey="editor-rural-panel-position"
              >
                <RuralModePanel onClose={() => setShowRuralPanel(false)} />
              </DraggablePanel>
            </div>
          )}

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

      {/* Bottom Status Bar */}
      <BottomStatus />
    </div>
  );
}
