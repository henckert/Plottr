import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { IntentType } from '@/components/wizard/IntentSelectionStep';
import { getToolPreset } from '@/config/toolPresets';
import { useEditorStore } from '@/store/editor.store';

interface CreateLayoutFromIntentParams {
  intent: IntentType;
  subtype?: string;
  location?: { lat: number; lng: number };
  address?: string;
}

interface Site {
  id: number;
  name: string;
  address?: string;
  center_point?: any;
}

interface Layout {
  id: number;
  site_id: number;
  name: string;
  metadata?: {
    intent?: string;
    subtype?: string;
  };
}

/**
 * React Query mutation hook to create a layout from Intent Wizard selections
 * 
 * Workflow:
 * 1. If location provided → create/find site with that location
 * 2. Create draft layout with intent metadata
 * 3. Apply tool preset to editor store
 * 4. Invalidate layouts query to refresh recent plans
 * 5. Return layout for navigation
 */
export function useCreateLayoutFromIntent() {
  const queryClient = useQueryClient();
  const applyToolPreset = useEditorStore((state) => state.applyToolPreset);

  return useMutation({
    mutationFn: async (params: CreateLayoutFromIntentParams): Promise<Layout> => {
      const { intent, subtype, location, address } = params;

      let siteId: number;

      // Step 1: Create or find site
      if (location && address) {
        // Create new site with location
        const centerPoint = {
          type: 'Point',
          coordinates: [location.lng, location.lat],
        };

        const siteResponse = await apiClient.post<{ data: Site }>('/sites', {
          name: address,
          address,
          center_point: centerPoint,
          published: false,
        });

        siteId = siteResponse.data.data.id;
      } else {
        // Create placeholder site
        const siteResponse = await apiClient.post<{ data: Site }>('/sites', {
          name: 'New Site',
          published: false,
        });

        siteId = siteResponse.data.data.id;
      }

      // Step 2: Create layout with intent metadata
      const layoutName = generateLayoutName(intent, subtype);
      const metadata = {
        intent,
        ...(subtype && { subtype }),
      };

      const layoutResponse = await apiClient.post<{ data: Layout }>('/layouts', {
        site_id: siteId,
        name: layoutName,
        status: 'draft',
        metadata,
      });

      // Step 3: Apply tool preset for the intent/subtype
      const toolPreset = getToolPreset(intent, subtype);
      applyToolPreset(toolPreset);

      return layoutResponse.data.data;
    },

    onSuccess: () => {
      // Invalidate layouts query to refresh recent plans panel
      queryClient.invalidateQueries({ queryKey: ['layouts'] });
    },

    onError: (error) => {
      console.error('Failed to create layout from intent:', error);
    },
  });
}

/**
 * Generate layout name based on intent and subtype
 */
function generateLayoutName(intent: IntentType, subtype?: string): string {
  const intentLabels: Record<IntentType, string> = {
    sports_tournament: 'Tournament',
    sports_training: 'Training',
    market: 'Market',
    festival: 'Festival',
    construction: 'Construction',
    emergency: 'Emergency',
    film: 'Film',
    car_park: 'Car Park',
    custom: 'Custom Layout',
  };

  const baseLabel = intentLabels[intent] || 'Layout';

  if (subtype) {
    // Capitalize subtype
    const formattedSubtype = subtype
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    return `${formattedSubtype} ${baseLabel}`;
  }

  return baseLabel;
}
