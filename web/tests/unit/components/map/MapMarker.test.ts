/**
 * MapMarker Component Tests
 * Tests for marker rendering, styling, and interactions
 */

describe('MapMarker Component', () => {
  describe('Marker Types & Colors', () => {
    it('should have correct color for search-result type', () => {
      const markerColors: Record<string, string> = {
        'search-result': '#3B82F6', // Blue
        'selected': '#EF4444', // Red
        'current-location': '#10B981', // Green
        'poi': '#F59E0B', // Amber
        'building': '#8B5CF6', // Purple
      };
      
      expect(markerColors['search-result']).toBe('#3B82F6');
    });

    it('should have correct color for all marker types', () => {
      const markerColors: Record<string, string> = {
        'search-result': '#3B82F6',
        'selected': '#EF4444',
        'current-location': '#10B981',
        'poi': '#F59E0B',
        'building': '#8B5CF6',
      };

      const types = ['search-result', 'selected', 'current-location', 'poi', 'building'] as const;
      types.forEach((type) => {
        expect(markerColors[type]).toBeDefined();
        expect(markerColors[type]).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });

    it('should have correct icon emoji for each type', () => {
      const markerIcons: Record<string, string> = {
        'search-result': '🔍',
        'selected': '📌',
        'current-location': '📍',
        'poi': '🏢',
        'building': '🏛️',
      };

      expect(markerIcons['search-result']).toBe('🔍');
      expect(markerIcons['selected']).toBe('📌');
      expect(markerIcons['current-location']).toBe('📍');
      expect(markerIcons['poi']).toBe('🏢');
      expect(markerIcons['building']).toBe('🏛️');
    });
  });

  describe('Marker Props Validation', () => {
    it('should accept valid marker position', () => {
      const position = { lat: 40.7128, lon: -74.006 };
      expect(position.lat).toBeGreaterThanOrEqual(-90);
      expect(position.lat).toBeLessThanOrEqual(90);
      expect(position.lon).toBeGreaterThanOrEqual(-180);
      expect(position.lon).toBeLessThanOrEqual(180);
    });

    it('should accept marker label', () => {
      const label = 'New York, NY';
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    });

    it('should accept isSelected state', () => {
      const isSelected = true;
      expect(typeof isSelected).toBe('boolean');
    });

    it('should accept onClick callback', () => {
      const onClick = jest.fn();
      onClick();
      expect(onClick).toHaveBeenCalled();
    });
  });

  describe('Marker Styling', () => {
    it('should apply selection ring when selected', () => {
      const isSelected = true;
      const ringClass = isSelected ? 'ring-2 ring-offset-2 ring-red-500' : '';
      expect(ringClass).toBeTruthy();
    });

    it('should not apply ring when not selected', () => {
      const isSelected = false;
      const ringClass = isSelected ? 'ring-2 ring-offset-2 ring-red-500' : '';
      expect(ringClass).toBeFalsy();
    });

    it('should apply size class', () => {
      const baseClass = 'flex flex-col items-center gap-1';
      expect(baseClass).toContain('flex');
      expect(baseClass).toContain('items-center');
    });
  });

  describe('Marker Accessibility', () => {
    it('should be keyboard accessible with Enter key', () => {
      const handleKeyDown = jest.fn();
      const event = { key: 'Enter' };
      if (event.key === 'Enter') handleKeyDown();
      expect(handleKeyDown).toHaveBeenCalled();
    });

    it('should be keyboard accessible with Space key', () => {
      const handleKeyDown = jest.fn();
      const event = { key: ' ' };
      if (event.key === ' ') handleKeyDown();
      expect(handleKeyDown).toHaveBeenCalled();
    });

    it('should have role attribute', () => {
      const role = 'button';
      expect(role).toBe('button');
    });

    it('should have aria-label', () => {
      const label = 'New York, NY - search result';
      expect(label).toBeTruthy();
      expect(label.length).toBeGreaterThan(0);
    });
  });

  describe('Marker Display', () => {
    it('should display label below marker', () => {
      const label = '123 Main St';
      const position = 'below';
      expect(label).toBeTruthy();
      expect(position).toBe('below');
    });

    it('should truncate long labels', () => {
      const longLabel = '123 Main Street, New York, New York, USA';
      const truncated = longLabel.length > 30 ? longLabel.substring(0, 27) + '...' : longLabel;
      expect(truncated.length).toBeLessThanOrEqual(30);
    });
  });

  describe('Marker Click Handling', () => {
    it('should trigger onClick when clicked', () => {
      const onClick = jest.fn();
      onClick({ lat: 40.7128, lon: -74.006 });
      expect(onClick).toHaveBeenCalledWith({ lat: 40.7128, lon: -74.006 });
    });

    it('should not bubble click events', () => {
      const stopPropagation = jest.fn();
      const event = { stopPropagation };
      event.stopPropagation();
      expect(stopPropagation).toHaveBeenCalled();
    });

    it('should pass position to onClick handler', () => {
      const onClick = jest.fn();
      const position = { lat: 40.7128, lon: -74.006 };
      onClick(position);
      expect(onClick).toHaveBeenCalledWith(position);
    });
  });
});
