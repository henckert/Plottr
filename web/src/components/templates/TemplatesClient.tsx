'use client';

import { useRouter } from 'next/navigation';
import { TemplateGallery } from './TemplateGallery';
import type { Template } from '@/lib/api';

export default function TemplatesClient() {
  const router = useRouter();

  const handleApplyTemplate = (template: Template, layoutId: number) => {
    console.log(`Applied template ${template.id} to layout ${layoutId}`);
    // Navigate to the layout editor after applying template
    router.push(`/layouts/${layoutId}/edit`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Field Layout Templates</h1>
          <p className="mt-2 text-gray-600">
            Browse and apply pre-configured field layouts to quickly set up your venues.
          </p>
        </div>

        <TemplateGallery onApplyTemplate={handleApplyTemplate} />
      </div>
    </div>
  );
}
