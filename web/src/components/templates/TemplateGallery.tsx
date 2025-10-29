'use client';

import React, { useState, useEffect } from 'react';
import { templateApi, type Template } from '@/lib/api';

interface TemplateGalleryProps {
  onApplyTemplate?: (template: Template, layoutId: number) => void;
  className?: string;
}

/**
 * TemplateGallery - Browse and apply field layout templates
 * 
 * Features:
 * - Grid layout with template cards
 * - Sport type filter
 * - Template preview (zones + assets count)
 * - Apply template button
 * - Pagination support
 */
export const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  onApplyTemplate,
  className = '',
}) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sportFilter, setSportFilter] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);

  // Fetch templates on mount and when filter changes
  useEffect(() => {
    fetchTemplates();
  }, [sportFilter]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters: any = { is_public: true, limit: 50 };
      if (sportFilter !== 'all') {
        filters.sport_type = sportFilter;
      }

      const response = await templateApi.list(filters);
      setTemplates(response.data);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
      setError('Failed to load templates. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyClick = (template: Template) => {
    setSelectedTemplate(template);
    setShowApplyModal(true);
  };

  const handleApplyConfirm = async (layoutId: number) => {
    if (!selectedTemplate) return;

    try {
      await templateApi.applyToLayout(selectedTemplate.id, layoutId);
      setShowApplyModal(false);
      
      if (onApplyTemplate) {
        onApplyTemplate(selectedTemplate, layoutId);
      }

      alert(`Template "${selectedTemplate.name}" applied successfully! Now draw the zone geometries.`);
    } catch (err) {
      console.error('Failed to apply template:', err);
      alert('Failed to apply template. Please try again.');
    }
  };

  // Get unique sport types from templates
  const sportTypes = ['all', ...new Set(
    templates.map(t => t.sport_type).filter((type): type is string => type !== null && type !== undefined)
  )];

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading templates...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <p className="text-red-800">{error}</p>
        <button
          onClick={fetchTemplates}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header & Filter */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Field Templates</h2>
        
        <select
          value={sportFilter}
          onChange={(e) => setSportFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {sportTypes.map((type) => (
            <option key={type} value={type}>
              {type === 'all' ? 'All Sports' : type.charAt(0).toUpperCase() + type.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Template Grid */}
      {templates.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No templates found for the selected filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onApply={() => handleApplyClick(template)}
            />
          ))}
        </div>
      )}

      {/* Apply Modal */}
      {showApplyModal && selectedTemplate && (
        <ApplyTemplateModal
          template={selectedTemplate}
          onConfirm={handleApplyConfirm}
          onCancel={() => setShowApplyModal(false)}
        />
      )}
    </div>
  );
};

/**
 * TemplateCard - Individual template preview card
 */
interface TemplateCardProps {
  template: Template;
  onApply: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onApply }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Thumbnail Placeholder */}
      <div className="h-40 bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
        <svg
          className="w-16 h-16 text-white opacity-50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          />
        </svg>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
          {template.sport_type && (
            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
              {template.sport_type}
            </span>
          )}
        </div>

        {template.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.description}</p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
              />
            </svg>
            <span>{template.zones.length} zones</span>
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
              />
            </svg>
            <span>{template.assets.length} assets</span>
          </div>
        </div>

        {/* Zone List Preview */}
        {template.zones.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-700 mb-1">Zones:</p>
            <div className="text-xs text-gray-600 space-y-1">
              {template.zones.slice(0, 3).map((zone, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  {zone.color && (
                    <div
                      className="w-3 h-3 rounded border border-gray-300"
                      style={{ backgroundColor: zone.color }}
                    />
                  )}
                  <span className="truncate">{zone.name}</span>
                </div>
              ))}
              {template.zones.length > 3 && (
                <p className="text-gray-400">+{template.zones.length - 3} more</p>
              )}
            </div>
          </div>
        )}

        {/* Apply Button */}
        <button
          onClick={onApply}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Apply Template
        </button>
      </div>
    </div>
  );
};

/**
 * ApplyTemplateModal - Modal for selecting layout to apply template to
 */
interface ApplyTemplateModalProps {
  template: Template;
  onConfirm: (layoutId: number) => void;
  onCancel: () => void;
}

const ApplyTemplateModal: React.FC<ApplyTemplateModalProps> = ({
  template,
  onConfirm,
  onCancel,
}) => {
  const [layoutId, setLayoutId] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(layoutId, 10);
    if (!isNaN(id) && id > 0) {
      onConfirm(id);
    } else {
      alert('Please enter a valid layout ID');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          Apply Template: {template.name}
        </h3>

        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Note:</strong> This will create placeholder zones and assets without geometry.
            You'll need to draw the zone boundaries using the map editor after applying.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="layoutId" className="block text-sm font-medium text-gray-700 mb-1">
              Layout ID
            </label>
            <input
              type="number"
              id="layoutId"
              value={layoutId}
              onChange={(e) => setLayoutId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter layout ID"
              min="1"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              The layout where this template will be applied
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Apply
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
