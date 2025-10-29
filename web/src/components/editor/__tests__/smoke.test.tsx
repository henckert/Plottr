/**
 * Smoke tests for editor UX components
 * Basic tests to ensure components export and are defined
 */

import { QuickStartWizard } from '../QuickStartWizard';
import { Toolbar } from '../Toolbar';
import { BottomStatus } from '../BottomStatus';
import { LeftRail } from '../LeftRail';
import { CommandPalette } from '../CommandPalette';
import { RuralModePanel } from '../RuralModePanel';
import { EmptyState } from '../EmptyState';
import { GridOverlay } from '../GridOverlay';
import { TransformControls } from '../TransformControls';

describe('Editor UX Components - Smoke Tests', () => {
  describe('Component Exports', () => {
    it('QuickStartWizard is defined', () => {
      expect(QuickStartWizard).toBeDefined();
      expect(typeof QuickStartWizard).toBe('function');
    });

    it('Toolbar is defined', () => {
      expect(Toolbar).toBeDefined();
      expect(typeof Toolbar).toBe('function');
    });

    it('BottomStatus is defined', () => {
      expect(BottomStatus).toBeDefined();
      expect(typeof BottomStatus).toBe('function');
    });

    it('LeftRail is defined', () => {
      expect(LeftRail).toBeDefined();
      expect(typeof LeftRail).toBe('function');
    });

    it('CommandPalette is defined', () => {
      expect(CommandPalette).toBeDefined();
      expect(typeof CommandPalette).toBe('function');
    });

    it('RuralModePanel is defined', () => {
      expect(RuralModePanel).toBeDefined();
      expect(typeof RuralModePanel).toBe('function');
    });

    it('EmptyState is defined', () => {
      expect(EmptyState).toBeDefined();
      expect(typeof EmptyState).toBe('function');
    });

    it('GridOverlay is defined', () => {
      expect(GridOverlay).toBeDefined();
      expect(typeof GridOverlay).toBe('function');
    });

    it('TransformControls is defined', () => {
      expect(TransformControls).toBeDefined();
      expect(typeof TransformControls).toBe('function');
    });
  });

  describe('Component Type Checking', () => {
    it('all components are React components', () => {
      const components = [
        QuickStartWizard,
        Toolbar,
        BottomStatus,
        LeftRail,
        CommandPalette,
        RuralModePanel,
        EmptyState,
        GridOverlay,
        TransformControls,
      ];

      components.forEach((Component) => {
        expect(typeof Component).toBe('function');
        expect(Component.name).toBeTruthy();
      });
    });
  });
});
