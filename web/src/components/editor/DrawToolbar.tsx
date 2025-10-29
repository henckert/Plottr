'use client';

import React from 'react';
import { Trash2, Square, Hand, X } from 'lucide-react';

export type DrawMode = 'none' | 'draw_polygon' | 'simple_select' | 'direct_select';

interface DrawToolbarProps {
  currentMode: DrawMode;
  onModeChange: (mode: DrawMode) => void;
  onDelete?: () => void;
  hasSelection?: boolean;
  disabled?: boolean;
}

/**
 * Drawing toolbar for polygon creation and editing
 * Provides buttons for: Draw, Select, Edit, Delete modes
 */
export function DrawToolbar({
  currentMode,
  onModeChange,
  onDelete,
  hasSelection = false,
  disabled = false,
}: DrawToolbarProps) {
  const buttonBaseClass =
    'flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const activeClass = 'bg-blue-600 text-white hover:bg-blue-700';
  const inactiveClass = 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50';

  return (
    <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-md border border-gray-200">
      {/* Draw Polygon */}
      <button
        onClick={() => onModeChange('draw_polygon')}
        disabled={disabled}
        className={`${buttonBaseClass} ${currentMode === 'draw_polygon' ? activeClass : inactiveClass}`}
        title="Draw new polygon (Click to place vertices, double-click to finish)"
      >
        <Square className="w-4 h-4" />
        <span className="hidden sm:inline">Draw Polygon</span>
      </button>

      {/* Select Mode */}
      <button
        onClick={() => onModeChange('simple_select')}
        disabled={disabled}
        className={`${buttonBaseClass} ${currentMode === 'simple_select' ? activeClass : inactiveClass}`}
        title="Select zones (Click to select, drag to move)"
      >
        <Hand className="w-4 h-4" />
        <span className="hidden sm:inline">Select</span>
      </button>

      {/* Divider */}
      <div className="w-px h-8 bg-gray-300" />

      {/* Delete */}
      <button
        onClick={onDelete}
        disabled={disabled || !hasSelection}
        className={`${buttonBaseClass} ${inactiveClass} text-red-600 hover:bg-red-50 disabled:text-gray-400`}
        title="Delete selected zone"
      >
        <Trash2 className="w-4 h-4" />
        <span className="hidden sm:inline">Delete</span>
      </button>

      {/* Cancel/Clear Selection */}
      {(currentMode !== 'none' || hasSelection) && (
        <button
          onClick={() => onModeChange('none')}
          disabled={disabled}
          className={`${buttonBaseClass} ${inactiveClass} text-gray-600`}
          title="Cancel current action / Clear selection"
        >
          <X className="w-4 h-4" />
          <span className="hidden sm:inline">Cancel</span>
        </button>
      )}

      {/* Mode Indicator */}
      <div className="ml-auto flex items-center gap-2 text-sm text-gray-600 hidden md:flex">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span>
          {currentMode === 'draw_polygon' && 'Drawing...'}
          {currentMode === 'simple_select' && 'Select Mode'}
          {currentMode === 'none' && 'Ready'}
        </span>
      </div>
    </div>
  );
}
