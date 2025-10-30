'use client';

import { useEffect, useState } from 'react';
import { X, Info } from 'lucide-react';

export default function MigrationBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has previously accessed /sites or /layouts
    const hasDismissed = localStorage.getItem('workbench-migration-banner-dismissed');
    
    // Check cookies (set by middleware) or localStorage fallback
    const hasVisitedSites = document.cookie.includes('visited-sites-page=true');
    const hasVisitedLayouts = document.cookie.includes('visited-layouts-page=true');
    const hasVisitedLegacy = 
      hasVisitedSites ||
      hasVisitedLayouts ||
      localStorage.getItem('visited-sites-page') === 'true' ||
      localStorage.getItem('visited-layouts-page') === 'true';

    if (!hasDismissed && hasVisitedLegacy) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('workbench-migration-banner-dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="bg-blue-50 border-b border-blue-200">
      <div className="container mx-auto px-4 py-3 max-w-7xl">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-blue-900">
              <strong>Sites & Layouts have merged into Workbench</strong>
              {' — '}
              All your existing sites and layouts are still here. The Workbench provides
              a unified place to create new plans and access your recent work.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-blue-600 hover:text-blue-800 transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
