'use client';

import { useMemo, useState } from 'react';
import { Search, ChevronRight } from 'lucide-react';
import { filterTemplates, getAllTemplates } from '@/config/templateRegistry';
import type { PitchTemplate } from '@/types/template.types';
import type { IntentType } from '@/components/wizard/IntentSelectionStep';

interface TemplatesPanelProps {
  onSelectTemplate: (template: PitchTemplate) => void;
  intent?: IntentType;
  subtype?: string;
}

/**
 * TemplatesPanel - Browse and select pitch layout templates
 * 
 * Features:
 * - Intent-based filtering (shows relevant templates for wizard-selected intent)
 * - Search by name/description/tags
 * - Category grouping
 * - Click to apply template
 */
export default function TemplatesPanel({
  onSelectTemplate,
  intent,
  subtype,
}: TemplatesPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter templates based on intent/subtype/search
  const filteredTemplates = useMemo(() => {
    return filterTemplates({
      intent,
      subtype,
      search: searchQuery,
    });
  }, [intent, subtype, searchQuery]);

  // Group templates by category
  const groupedTemplates = useMemo(() => {
    const groups: Record<string, PitchTemplate[]> = {};
    
    filteredTemplates.forEach((template) => {
      const category = template.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(template);
    });
    
    return groups;
  }, [filteredTemplates]);

  const allTemplates = useMemo(() => getAllTemplates(), []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-3">
        <h4 className="font-semibold mb-1 text-white">Pitch Templates</h4>
        <p className="text-white/60 text-xs mb-3">
          {intent 
            ? `Showing templates for ${intent.replace('_', ' ')}`
            : 'Select a preset pitch to insert'
          }
        </p>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
          />
        </div>
      </div>

      {/* Templates List */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-8 text-white/40 text-sm">
            {searchQuery 
              ? 'No templates match your search'
              : intent
              ? 'No templates available for this intent'
              : 'No templates found'
            }
          </div>
        ) : (
          Object.entries(groupedTemplates).map(([category, templates]) => (
            <div key={category}>
              {/* Category Header */}
              <div className="text-white/40 text-xs font-medium uppercase tracking-wide mb-2">
                {category.replace('_', ' ')}
              </div>
              
              {/* Template Cards */}
              <div className="space-y-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => onSelectTemplate(template)}
                    className="w-full text-left px-3 py-2.5 rounded-lg border border-white/10 hover:bg-white/5 hover:border-sky-400/50 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white text-sm mb-0.5 group-hover:text-sky-400 transition-colors">
                          {template.name}
                        </div>
                        <div className="text-white/50 text-xs line-clamp-2">
                          {template.description}
                        </div>
                        
                        {/* Dimensions */}
                        <div className="mt-1.5 text-white/40 text-xs">
                          {template.defaultDimensions.width}m × {template.defaultDimensions.length}m
                          {template.sportType && ` • ${template.sportType.toUpperCase()}`}
                        </div>
                        
                        {/* Tags */}
                        {template.tags && template.tags.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {template.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="px-1.5 py-0.5 bg-white/5 rounded text-white/40 text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-sky-400 transition-colors flex-shrink-0 mt-1" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Stats */}
      <div className="mt-3 pt-3 border-t border-white/10 text-white/40 text-xs">
        Showing {filteredTemplates.length} of {allTemplates.length} templates
        {intent && ' (filtered by intent)'}
      </div>
    </div>
  );
}
