'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Loader2 } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import { getZoneColor } from '@/lib/maplibre-draw-styles';
import { calculateArea, calculatePerimeter, formatArea, formatPerimeter } from '@/lib/geospatial-client';

// Zone types from PRD (16 categories)
export const ZONE_TYPES = [
  { value: 'vendor', label: 'Vendor' },
  { value: 'parking', label: 'Parking' },
  { value: 'competition', label: 'Competition Area' },
  { value: 'stage', label: 'Stage' },
  { value: 'restroom', label: 'Restroom' },
  { value: 'entrance', label: 'Entrance' },
  { value: 'medical', label: 'Medical' },
  { value: 'security', label: 'Security' },
  { value: 'vip', label: 'VIP Area' },
  { value: 'media', label: 'Media' },
  { value: 'catering', label: 'Catering' },
  { value: 'storage', label: 'Storage' },
  { value: 'green_space', label: 'Green Space' },
  { value: 'buffer', label: 'Buffer Zone' },
  { value: 'restricted', label: 'Restricted' },
  { value: 'other', label: 'Other' },
] as const;

export const SURFACE_TYPES = [
  { value: 'grass', label: 'Grass' },
  { value: 'turf', label: 'Artificial Turf' },
  { value: 'concrete', label: 'Concrete' },
  { value: 'asphalt', label: 'Asphalt' },
  { value: 'gravel', label: 'Gravel' },
  { value: 'dirt', label: 'Dirt' },
  { value: 'indoor', label: 'Indoor' },
] as const;

interface ZoneData {
  id?: number;
  tempId?: string;
  name: string;
  zone_type: string;
  surface_type: string | null;
  color: string;
  notes: string | null;
  geometry: any;
  area_m2?: number;
  perimeter_m?: number;
}

interface ZonePropertiesPanelProps {
  zone: ZoneData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ZoneData) => void;
  onDelete?: () => void;
  isSaving?: boolean;
  isDeleting?: boolean;
  imperialUnits?: boolean;
}

/**
 * Zone properties panel - form for zone details
 * Displays after polygon creation or when editing existing zone
 */
export function ZonePropertiesPanel({
  zone,
  isOpen,
  onClose,
  onSave,
  onDelete,
  isSaving = false,
  isDeleting = false,
  imperialUnits = false,
}: ZonePropertiesPanelProps) {
  const [formData, setFormData] = useState<ZoneData>({
    name: '',
    zone_type: 'other',
    surface_type: null,
    color: getZoneColor('other'),
    notes: null,
    geometry: null,
  });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate area and perimeter from geometry
  const measurements = zone?.geometry
    ? {
        area: calculateArea(zone.geometry),
        perimeter: calculatePerimeter(zone.geometry),
      }
    : null;

  // Reset form when zone changes
  useEffect(() => {
    if (zone) {
      setFormData({
        id: zone.id,
        tempId: zone.tempId,
        name: zone.name || '',
        zone_type: zone.zone_type || 'other',
        surface_type: zone.surface_type || null,
        color: zone.color || getZoneColor(zone.zone_type || 'other'),
        notes: zone.notes || null,
        geometry: zone.geometry,
        area_m2: zone.area_m2,
        perimeter_m: zone.perimeter_m,
      });
      setErrors({});
    }
  }, [zone]);

  // Update color when zone type changes
  const handleZoneTypeChange = (zoneType: string) => {
    setFormData((prev) => ({
      ...prev,
      zone_type: zoneType,
      color: getZoneColor(zoneType),
    }));
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Name must be 100 characters or less';
    }

    if (!formData.zone_type) {
      newErrors.zone_type = 'Zone type is required';
    }

    if (formData.color && !/^#[0-9A-Fa-f]{6}$/.test(formData.color)) {
      newErrors.color = 'Invalid hex color';
    }

    if (formData.notes && formData.notes.length > 500) {
      newErrors.notes = 'Notes must be 500 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
    }
  };

  if (!isOpen || !zone) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          {zone.id ? 'Edit Zone' : 'New Zone'}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          disabled={isSaving || isDeleting}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Name */}
        <div>
          <label htmlFor="zone-name" className="block text-sm font-medium text-gray-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="zone-name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., Vendor Area A"
            maxLength={100}
            disabled={isSaving || isDeleting}
          />
          {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
        </div>

        {/* Zone Type */}
        <div>
          <label htmlFor="zone-type" className="block text-sm font-medium text-gray-700 mb-1">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            id="zone-type"
            value={formData.zone_type}
            onChange={(e) => handleZoneTypeChange(e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.zone_type ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={isSaving || isDeleting}
          >
            {ZONE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          {errors.zone_type && <p className="mt-1 text-sm text-red-500">{errors.zone_type}</p>}
        </div>

        {/* Surface Type */}
        <div>
          <label htmlFor="surface-type" className="block text-sm font-medium text-gray-700 mb-1">
            Surface Type
          </label>
          <select
            id="surface-type"
            value={formData.surface_type || ''}
            onChange={(e) => setFormData({ ...formData, surface_type: e.target.value || null })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSaving || isDeleting}
          >
            <option value="">None</option>
            {SURFACE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Color */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-md border-2 border-gray-300 cursor-pointer hover:border-gray-400 transition-colors"
              style={{ backgroundColor: formData.color }}
              onClick={() => setShowColorPicker(!showColorPicker)}
            />
            <input
              type="text"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm ${
                errors.color ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="#3B82F6"
              maxLength={7}
              disabled={isSaving || isDeleting}
            />
          </div>
          {showColorPicker && (
            <div className="mt-2">
              <HexColorPicker color={formData.color} onChange={(color) => setFormData({ ...formData, color })} />
            </div>
          )}
          {errors.color && <p className="mt-1 text-sm text-red-500">{errors.color}</p>}
        </div>

        {/* Area & Perimeter (Read-only) */}
        {measurements && (
          <div className="bg-gray-50 rounded-md p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">Area:</span>
              <span className="text-gray-900">
                {imperialUnits ? formatArea(measurements.area.m2, true) : formatArea(measurements.area.m2, false)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">Perimeter:</span>
              <span className="text-gray-900">
                {imperialUnits
                  ? formatPerimeter(measurements.perimeter.m, true)
                  : formatPerimeter(measurements.perimeter.m, false)}
              </span>
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label htmlFor="zone-notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            id="zone-notes"
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
              errors.notes ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Additional notes..."
            rows={4}
            maxLength={500}
            disabled={isSaving || isDeleting}
          />
          <div className="flex justify-between items-center mt-1">
            {errors.notes && <p className="text-sm text-red-500">{errors.notes}</p>}
            <p className="text-xs text-gray-500 ml-auto">{formData.notes?.length || 0}/500</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={isSaving || isDeleting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save
              </>
            )}
          </button>

          {zone.id && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={isSaving || isDeleting}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
