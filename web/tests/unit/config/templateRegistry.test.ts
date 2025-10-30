/**
 * Unit tests for template registry
 * Tests template filtering, retrieval, and sport matching
 */

import {
  TEMPLATE_REGISTRY,
  getAllTemplates,
  filterTemplates,
  getTemplateById,
} from '@/config/templateRegistry';

describe('Template Registry', () => {
  test('TEMPLATE_REGISTRY contains all templates', () => {
    expect(TEMPLATE_REGISTRY.length).toBeGreaterThan(0);
    expect(TEMPLATE_REGISTRY.length).toBeGreaterThanOrEqual(10); // At least 10 templates
    
    // Check that we have various sport types
    const sportTypes = TEMPLATE_REGISTRY.map((t: any) => t.template?.sportType).filter(Boolean);
    expect(sportTypes).toContain('gaa');
    expect(sportTypes).toContain('rugby');
    expect(sportTypes).toContain('soccer');
    expect(sportTypes).toContain('hockey');
  });

  test('getAllTemplates returns all templates', () => {
    const all = getAllTemplates();
    expect(all.length).toBe(TEMPLATE_REGISTRY.length);
    expect(all.length).toBeGreaterThan(0);
  });
});

describe('filterTemplates', () => {
  test('filters templates by intent tag', () => {
    const tournamentTemplates = filterTemplates({ intent: 'sports_tournament' });
    
    expect(tournamentTemplates.length).toBeGreaterThan(0);
    tournamentTemplates.forEach((template: any) => {
      expect(template.intentTags).toContain('sports_tournament');
    });
  });

  test('filters templates by sportType', () => {
    const gaaTemplates = filterTemplates({ sportType: 'gaa' });
    
    expect(gaaTemplates.length).toBeGreaterThan(0);
    gaaTemplates.forEach((template: any) => {
      expect(template.sportType).toBe('gaa');
    });
  });

  test('filters templates by sports_training intent', () => {
    const trainingTemplates = filterTemplates({ intent: 'sports_training' });
    
    expect(trainingTemplates.length).toBeGreaterThan(0);
    trainingTemplates.forEach((template: any) => {
      expect(template.intentTags).toContain('sports_training');
    });
  });

  test('filters by multiple criteria (sport + intent)', () => {
    const soccerTraining = filterTemplates({
      sportType: 'soccer',
      intent: 'sports_training',
    });
    
    expect(soccerTraining.length).toBeGreaterThan(0);
    soccerTraining.forEach((template: any) => {
      expect(template.sportType).toBe('soccer');
      expect(template.intentTags).toContain('sports_training');
    });
  });

  test('returns all templates when no filter provided', () => {
    const all = filterTemplates({});
    expect(all.length).toBe(TEMPLATE_REGISTRY.length);
  });

  test('returns empty array for non-existent sport', () => {
    const none = filterTemplates({ sportType: 'cricket' });
    
    expect(none).toEqual([]);
  });

  test('returns empty array for non-existent intent', () => {
    const none = filterTemplates({ intent: 'invalid-intent' });
    
    expect(none).toEqual([]);
  });

  test('filters by search text', () => {
    const searchResults = filterTemplates({ search: 'GAA' });
    
    expect(searchResults.length).toBeGreaterThan(0);
    // Check that results contain 'gaa' in name, description, or tags
    searchResults.forEach((template: any) => {
      const matchesSearch = 
        template.name.toLowerCase().includes('gaa') ||
        template.description.toLowerCase().includes('gaa') ||
        template.tags?.some((tag: string) => tag.toLowerCase().includes('gaa'));
      expect(matchesSearch).toBe(true);
    });
  });
});

describe('getTemplateById', () => {
  test('retrieves template by valid ID', () => {
    const entry = getTemplateById('gaa-full-pitch');
    
    expect(entry).toBeDefined();
    expect(entry?.template?.id).toBe('gaa-full-pitch');
    expect(entry?.template?.sportType).toBe('gaa');
  });

  test('returns undefined for non-existent ID', () => {
    const entry = getTemplateById('non-existent-template');
    
    expect(entry).toBeUndefined();
  });

  test('retrieves event template by ID', () => {
    const entry = getTemplateById('parking-standard-grid');
    
    expect(entry).toBeDefined();
    expect(entry?.template?.id).toBe('parking-standard-grid');
  });
});

describe('Template Dimensions', () => {
  test('GAA pitch has correct dimensions', () => {
    const template = getTemplateById('gaa-full-pitch');
    
    expect(template?.template?.defaultDimensions).toEqual({ width: 90, length: 145 });
  });

  test('Soccer pitch has correct dimensions', () => {
    const template = getTemplateById('soccer-full-pitch');
    
    expect(template?.template?.defaultDimensions).toEqual({ width: 68, length: 105 });
  });

  test('Rugby pitch has correct dimensions', () => {
    const template = getTemplateById('rugby-full-pitch');
    
    expect(template?.template?.defaultDimensions).toEqual({ width: 70, length: 100 });
  });
});

describe('Template Structure', () => {
  test('all templates have required fields', () => {
    const allTemplates = getAllTemplates();
    
    allTemplates.forEach((template: any) => {
      expect(template.id).toBeDefined();
      expect(template.name).toBeDefined();
      expect(template.description).toBeDefined();
      expect(template.category).toBeDefined();
      expect(template.defaultDimensions).toBeDefined();
      expect(template.zones).toBeDefined();
      expect(Array.isArray(template.zones)).toBe(true);
      expect(template.zones.length).toBeGreaterThan(0);
    });
  });

  test('all templates have valid zone structures', () => {
    const allTemplates = getAllTemplates();
    
    allTemplates.forEach((template: any) => {
      template.zones.forEach((zone: any) => {
        expect(zone.id).toBeDefined();
        expect(zone.name).toBeDefined();
        expect(zone.zoneType).toBeDefined();
      });
    });
  });

  test('sport templates have sportType field', () => {
    const sportTemplates = filterTemplates({ intent: 'sports_tournament' });
    
    sportTemplates.forEach((template: any) => {
      expect(template.sportType).toBeDefined();
      expect(typeof template.sportType).toBe('string');
    });
  });

  test('event templates have category field', () => {
    const eventTemplates = filterTemplates({ intent: 'market' });
    
    eventTemplates.forEach((template: any) => {
      expect(template.category).toBeDefined();
      expect(typeof template.category).toBe('string');
    });
  });
});
