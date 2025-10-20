'use client';

import React from 'react';

export interface MapLayerType {
  id: string;
  name: string;
  visible: boolean;
  editable: boolean;
  color?: string;
  itemCount?: number;
}

interface MapLayerProps {
  layers: MapLayerType[];
  onToggleVisibility?: (layerId: string) => void;
  onToggleEdit?: (layerId: string) => void;
  onDelete?: (layerId: string) => void;
  onRename?: (layerId: string, newName: string) => void;
  selectedLayerId?: string;
  onSelect?: (layerId: string) => void;
}

/**
 * MapLayer component for managing map layers
 * Displays layer list with visibility, lock, and delete controls
 */
export const MapLayer: React.FC<MapLayerProps> = ({
  layers,
  onToggleVisibility,
  onToggleEdit,
  onDelete,
  onRename,
  selectedLayerId,
  onSelect,
}) => {
  const [renamingId, setRenamingId] = React.useState<string | null>(null);
  const [newName, setNewName] = React.useState('');

  const handleRenameStart = (layer: MapLayerType) => {
    setRenamingId(layer.id);
    setNewName(layer.name);
  };

  const handleRenameSave = (layerId: string) => {
    if (newName.trim() && newName !== layers.find((l) => l.id === layerId)?.name) {
      onRename?.(layerId, newName);
    }
    setRenamingId(null);
  };

  return (
    <div className="flex flex-col gap-2 p-3 bg-white border border-gray-200 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">Layers</h3>
        <span className="text-xs text-gray-500">{layers.length}</span>
      </div>

      {/* Layers List */}
      <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
        {layers.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-4">No layers</div>
        ) : (
          layers.map((layer) => (
            <div
              key={layer.id}
              className={`
                flex items-center gap-2 p-2 rounded border transition-colors
                ${selectedLayerId === layer.id ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}
              `}
              onClick={() => onSelect?.(layer.id)}
            >
              {/* Color Indicator */}
              {layer.color && (
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: layer.color }}
                  title={layer.color}
                />
              )}

              {/* Layer Name/Input */}
              <div className="flex-1 min-w-0">
                {renamingId === layer.id ? (
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onBlur={() => handleRenameSave(layer.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleRenameSave(layer.id);
                      } else if (e.key === 'Escape') {
                        setRenamingId(null);
                      }
                    }}
                    className="w-full px-2 py-1 text-sm border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                ) : (
                  <div
                    className="text-sm font-medium text-gray-700 truncate cursor-text"
                    onDoubleClick={() => handleRenameStart(layer)}
                    title={layer.name}
                  >
                    {layer.name}
                  </div>
                )}
              </div>

              {/* Item Count */}
              {layer.itemCount !== undefined && (
                <span className="text-xs text-gray-500 flex-shrink-0">({layer.itemCount})</span>
              )}

              {/* Visibility Toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleVisibility?.(layer.id);
                }}
                className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0 text-sm"
                title={layer.visible ? 'Hide layer' : 'Show layer'}
                aria-label={`Toggle visibility for ${layer.name}`}
              >
                {layer.visible ? '👁️' : '🙈'}
              </button>

              {/* Edit Lock Toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleEdit?.(layer.id);
                }}
                className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0 text-sm"
                title={layer.editable ? 'Lock layer' : 'Unlock layer'}
                aria-label={`Toggle edit lock for ${layer.name}`}
              >
                {layer.editable ? '🔓' : '🔒'}
              </button>

              {/* Delete Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Delete layer "${layer.name}"?`)) {
                    onDelete?.(layer.id);
                  }
                }}
                className="p-1 hover:bg-red-100 rounded transition-colors flex-shrink-0 text-sm"
                title="Delete layer"
                aria-label={`Delete ${layer.name}`}
              >
                🗑️
              </button>
            </div>
          ))
        )}
      </div>

      {/* Info */}
      <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
        <p>Double-click to rename layer</p>
      </div>
    </div>
  );
};
