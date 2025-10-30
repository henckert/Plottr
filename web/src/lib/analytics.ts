/**
 * Analytics tracking utility for Plottr
 * 
 * Provides event tracking for product analytics.
 * Currently logs to console (can be extended to PostHog, Segment, GA, etc.)
 * 
 * Usage:
 *   trackEvent('wizard_completed', { intent: 'sports_tournament', template: 'gaa-pitch' })
 */

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp?: string;
  userId?: string;
}

export type EventName =
  // Intent Wizard Events
  | 'wizard_opened'
  | 'wizard_step_completed'
  | 'wizard_completed'
  | 'wizard_cancelled'
  | 'intent_selected'
  | 'template_selected'
  | 'layout_created'

  // Rotation Events
  | 'rotation_keyboard_used' // Q/E keys
  | 'rotation_slider_used'
  | 'rotation_quick_button_used' // 90°, -90°
  | 'rotation_snap_toggled'

  // Save Events
  | 'layout_saved' // Manual save via button or Ctrl+S
  | 'save_shortcut_used' // Ctrl+S specifically

  // Workbench Navigation
  | 'workbench_viewed'
  | 'workbench_tab_switched'
  | 'site_detail_viewed'
  | 'layout_editor_opened'
  | 'search_used';

/**
 * Track an analytics event
 */
export function trackEvent(name: EventName, properties?: Record<string, any>): void {
  const event: AnalyticsEvent = {
    name,
    properties,
    timestamp: new Date().toISOString(),
  };

  // Log to console (dev mode)
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics]', event.name, event.properties || {});
  }

  // TODO: Send to analytics service (PostHog, Segment, etc.)
  // Example:
  // if (window.posthog) {
  //   window.posthog.capture(event.name, event.properties);
  // }
  // if (window.analytics) {
  //   window.analytics.track(event.name, event.properties);
  // }
}

/**
 * Track page view
 */
export function trackPageView(page: string, properties?: Record<string, any>): void {
  trackEvent('workbench_viewed', { page, ...properties });
}

/**
 * Helper to track wizard step progression
 */
export function trackWizardStep(step: number, intent?: string, template?: string): void {
  trackEvent('wizard_step_completed', {
    step,
    intent,
    template,
  });
}

/**
 * Helper to track rotation interactions
 */
export function trackRotation(
  method: 'keyboard' | 'slider' | 'quick_button',
  value?: number,
  snap?: boolean
): void {
  const eventMap = {
    keyboard: 'rotation_keyboard_used',
    slider: 'rotation_slider_used',
    quick_button: 'rotation_quick_button_used',
  } as const;

  trackEvent(eventMap[method], { value, snap });
}

/**
 * Helper to track save interactions
 */
export function trackSave(method: 'button' | 'shortcut' | 'auto', success: boolean): void {
  trackEvent(method === 'shortcut' ? 'save_shortcut_used' : 'layout_saved', {
    method,
    success,
  });
}

/**
 * Initialize analytics (call once on app mount)
 */
export function initAnalytics(userId?: string): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics] Initialized', { userId });
  }

  // TODO: Initialize analytics services
  // Example:
  // if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  //   posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
  //     api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  //   });
  // }
}
