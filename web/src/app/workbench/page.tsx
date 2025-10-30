'use client';

import { Suspense } from 'react';
import QuickStartPanel from '@/components/workbench/QuickStartPanel';
import RecentPlansPanel from '@/components/workbench/RecentPlansPanel';
import MigrationBanner from '@/components/workbench/MigrationBanner';
import { Loader2 } from 'lucide-react';

export default function WorkbenchPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Migration banner for users coming from /sites or /layouts */}
      <MigrationBanner />

      {/* Main container */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Workbench</h1>
          <p className="text-gray-600 mt-1">
            Create a new plan or resume working on your recent layouts
          </p>
        </div>

        {/* Two-panel layout: Quick Start (left) + Recent Plans (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Quick Start Panel - 40% width on desktop */}
          <div className="lg:col-span-2">
            <Suspense fallback={<PanelSkeleton />}>
              <QuickStartPanel />
            </Suspense>
          </div>

          {/* Recent Plans Panel - 60% width on desktop */}
          <div className="lg:col-span-3">
            <Suspense fallback={<PanelSkeleton />}>
              <RecentPlansPanel />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    </div>
  );
}
