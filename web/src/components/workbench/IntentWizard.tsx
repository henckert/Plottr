'use client';

import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import IntentSelectionStep, { type IntentType } from '../wizard/IntentSelectionStep';
import SubtypeSelectionStep from '../wizard/SubtypeSelectionStep';
import LocationInputStep from '../wizard/LocationInputStep';
import MapPickerModal from '../wizard/MapPickerModal';
import { useCreateLayoutFromIntent } from '@/hooks/useCreateLayoutFromIntent';

interface IntentWizardProps {
  onClose: () => void;
}

type WizardStep = 1 | 2 | 3;

/**
 * Intent Wizard - 3-step modal to guide users from idea to first layout
 * 
 * Steps:
 * 1. Intent Selection (Sports/Training/Market/Festival/Construction/Emergency/Film/CarPark/Custom)
 * 2. Subtype Selection (conditional based on intent)
 * 3. Location Input (geocoding + map picker)
 */
export default function IntentWizard({ onClose }: IntentWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [selectedIntent, setSelectedIntent] = useState<IntentType | null>(null);
  const [selectedSubtype, setSelectedSubtype] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState('');
  const [showMapPicker, setShowMapPicker] = useState(false);

  const createLayoutMutation = useCreateLayoutFromIntent();

  // Determine if we should skip step 2 (for custom intent)
  const shouldSkipStep2 = selectedIntent === 'custom';

  const handleNext = () => {
    if (currentStep === 1 && shouldSkipStep2) {
      setCurrentStep(3);
    } else if (currentStep < 3) {
      setCurrentStep((prev) => (prev + 1) as WizardStep);
    }
  };

  const handleBack = () => {
    if (currentStep === 3 && shouldSkipStep2) {
      setCurrentStep(1);
    } else if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as WizardStep);
    }
  };

  const handleFinish = async () => {
    if (!selectedIntent) return;

    try {
      // Create layout with intent metadata
      const layout = await createLayoutMutation.mutateAsync({
        intent: selectedIntent,
        subtype: selectedSubtype || undefined,
        location: location || undefined,
        address: address || undefined,
      });

      // Navigate to editor with intent context
      const params = new URLSearchParams({
        intent: selectedIntent,
      });
      if (selectedSubtype) {
        params.set('subtype', selectedSubtype);
      }

      router.push(`/layouts/${layout.id}/editor?${params.toString()}`);
    } catch (error) {
      console.error('Failed to create layout:', error);
      alert('Failed to create layout. Please try again.');
    }
  };

  const handleLocationSet = (newLocation: { lat: number; lng: number }, newAddress: string) => {
    setLocation(newLocation);
    setAddress(newAddress);
  };

  const handleSkipLocation = () => {
    setLocation(null);
    setAddress('');
    handleFinish();
  };

  const handleMapPickerConfirm = (newLocation: { lat: number; lng: number }) => {
    setLocation(newLocation);
    setAddress(`${newLocation.lat.toFixed(4)}, ${newLocation.lng.toFixed(4)}`);
    setShowMapPicker(false);
  };

  // Determine if can proceed to next step
  const canProceed = () => {
    if (currentStep === 1) return selectedIntent !== null;
    if (currentStep === 2) return selectedSubtype !== null || shouldSkipStep2;
    if (currentStep === 3) return true; // Location is optional
    return false;
  };

  // Calculate total steps (2 if custom, 3 otherwise)
  const totalSteps = shouldSkipStep2 ? 2 : 3;
  const displayStep = currentStep === 3 && shouldSkipStep2 ? 2 : currentStep;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Create New Plan</h2>
              <p className="text-sm text-gray-500 mt-1">
                Step {displayStep} of {totalSteps}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="px-6 pt-4">
            <div className="flex gap-2">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    i < displayStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {currentStep === 1 && (
              <IntentSelectionStep
                selectedIntent={selectedIntent}
                onSelectIntent={setSelectedIntent}
              />
            )}

            {currentStep === 2 && selectedIntent && (
              <SubtypeSelectionStep
                intent={selectedIntent}
                selectedSubtype={selectedSubtype}
                onSelectSubtype={setSelectedSubtype}
              />
            )}

            {currentStep === 3 && (
              <LocationInputStep
                location={location}
                address={address}
                onAddressChange={setAddress}
                onLocationSet={handleLocationSet}
                onSkip={handleSkipLocation}
                onOpenMapPicker={() => setShowMapPicker(true)}
              />
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={currentStep === 1 ? onClose : handleBack}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {currentStep === 1 ? (
                'Cancel'
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </>
              )}
            </button>

            {currentStep < 3 ? (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={createLayoutMutation.isPending}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {createLayoutMutation.isPending ? 'Creating...' : 'Create Layout'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Map Picker Modal */}
      {showMapPicker && (
        <MapPickerModal
          onClose={() => setShowMapPicker(false)}
          onConfirm={handleMapPickerConfirm}
          initialLocation={location || undefined}
        />
      )}
    </>
  );
}
