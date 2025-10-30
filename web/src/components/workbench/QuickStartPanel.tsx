'use client';

import { useState } from 'react';
import { PlusCircle, FileJson, Shapes } from 'lucide-react';
import IntentWizard from '@/components/workbench/IntentWizard';

export default function QuickStartPanel() {
  const [showWizard, setShowWizard] = useState(false);

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Start</h2>
        <p className="text-gray-600 text-sm mb-6">
          Choose how you'd like to begin your new plan
        </p>

        <div className="space-y-3">
          {/* Primary: Create New Plan (launches Intent Wizard) */}
          <button
            onClick={() => setShowWizard(true)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusCircle className="w-5 h-5 flex-shrink-0" />
            <div className="text-left">
              <div className="font-medium">Create New Plan</div>
              <div className="text-sm text-blue-100">
                Use wizard to set up your layout
              </div>
            </div>
          </button>

          {/* Secondary: Import GeoJSON */}
          <button
            onClick={() => {
              // TODO: Implement GeoJSON import in future release
              alert('Coming Soon: Import existing GeoJSON files to convert into layouts');
            }}
            className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileJson className="w-5 h-5 flex-shrink-0 text-gray-500" />
            <div className="text-left">
              <div className="font-medium">Import GeoJSON</div>
              <div className="text-sm text-gray-500">
                Coming soon
              </div>
            </div>
          </button>

          {/* Secondary: Start from Template */}
          <button
            onClick={() => {
              // TODO: Open template browser modal
              alert('Coming Soon: Browse and select from pre-built templates');
            }}
            className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Shapes className="w-5 h-5 flex-shrink-0 text-gray-500" />
            <div className="text-left">
              <div className="font-medium">Start from Template</div>
              <div className="text-sm text-gray-500">
                Coming soon
              </div>
            </div>
          </button>
        </div>

        {/* Additional info */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            First time here? The wizard will guide you through selecting the right tools
            and templates for your specific use case.
          </p>
        </div>
      </div>

      {/* Intent Wizard Modal */}
      {showWizard && (
        <IntentWizard onClose={() => setShowWizard(false)} />
      )}
    </>
  );
}
