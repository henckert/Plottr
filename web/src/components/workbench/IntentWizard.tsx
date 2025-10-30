'use client';

interface IntentWizardProps {
  onClose: () => void;
}

/**
 * Intent Wizard - 3-step modal to guide users from idea to first layout
 * 
 * This is a placeholder component. Full implementation will be in T-002.
 * 
 * Steps:
 * 1. Intent Selection (Sports/Training/Market/Festival/Construction/Emergency/Film/CarPark/Custom)
 * 2. Subtype Selection (conditional based on intent)
 * 3. Location Input (geocoding + map picker)
 */
export default function IntentWizard({ onClose }: IntentWizardProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Intent Wizard (Coming Soon)
        </h2>
        <p className="text-gray-600 mb-6">
          The Intent Wizard will guide you through:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 mb-6">
          <li>Selecting your use case (Sports, Events, Construction, etc.)</li>
          <li>Choosing specific subtypes (GAA, Rugby, Soccer, etc.)</li>
          <li>Setting your location with geocoding or map picker</li>
        </ul>
        <p className="text-sm text-gray-500 mb-6">
          This will be implemented in Task T-002.
        </p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
