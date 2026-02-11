/**
 * Tests for Framework Loader Service
 */

import { loadUSSFrameworks, loadClubPhilosophy, getFrameworkForAgeGroup } from '../services/frameworkLoader.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Framework Loader Service', () => {
  describe('loadUSSFrameworks', () => {
    it('should load US Soccer framework documents', async () => {
      const frameworks = await loadUSSFrameworks();

      expect(frameworks).toHaveProperty('licenseLevels');
      expect(frameworks).toHaveProperty('playerDevelopmentFrameworks');
      expect(frameworks).toHaveProperty('methodologies');

      // Should have at least some license levels
      expect(Object.keys(frameworks.licenseLevels).length).toBeGreaterThan(0);
      
      // Should have player development frameworks
      expect(Object.keys(frameworks.playerDevelopmentFrameworks).length).toBeGreaterThan(0);
    });

    it('should load license level documents', async () => {
      const frameworks = await loadUSSFrameworks();

      // Check for D and C license documents
      if (frameworks.licenseLevels.D) {
        expect(frameworks.licenseLevels.D.length).toBeGreaterThan(0);
        expect(frameworks.licenseLevels.D).toContain('coaching license d');
      }

      if (frameworks.licenseLevels.C) {
        expect(frameworks.licenseLevels.C.length).toBeGreaterThan(0);
        expect(frameworks.licenseLevels.C).toContain('coaching license c');
      }
    });

    it('should load player development frameworks', async () => {
      const frameworks = await loadUSSFrameworks();

      // Should have frameworks for different formats
      const formats = Object.keys(frameworks.playerDevelopmentFrameworks);
      expect(formats.length).toBeGreaterThan(0);

      // Check content of at least one framework
      if (frameworks.playerDevelopmentFrameworks['4v4']) {
        expect(frameworks.playerDevelopmentFrameworks['4v4'].length).toBeGreaterThan(0);
      }
    });

    it('should load methodology documents', async () => {
      const frameworks = await loadUSSFrameworks();

      expect(Object.keys(frameworks.methodologies).length).toBeGreaterThan(0);
    });
  });

  describe('loadClubPhilosophy', () => {
    it('should load club philosophy with defaults', async () => {
      const philosophy = await loadClubPhilosophy();

      expect(philosophy).toHaveProperty('playingStyle');
      expect(philosophy).toHaveProperty('trainingMethodology');
      expect(philosophy).toHaveProperty('clubValues');
      expect(philosophy).toHaveProperty('nonNegotiables');

      expect(philosophy.playingStyle.length).toBeGreaterThan(0);
      expect(philosophy.trainingMethodology.length).toBeGreaterThan(0);
      expect(philosophy.clubValues.length).toBeGreaterThan(0);
      expect(Array.isArray(philosophy.nonNegotiables)).toBe(true);
      expect(philosophy.nonNegotiables.length).toBeGreaterThan(0);
    });

    it('should return default philosophy if files do not exist', async () => {
      const philosophy = await loadClubPhilosophy();

      // Should have default JOGA philosophy
      expect(philosophy.playingStyle).toContain('JOGA');
      expect(philosophy.nonNegotiables.length).toBeGreaterThan(0);
    });
  });

  describe('getFrameworkForAgeGroup', () => {
    it('should map U7-U8 to 4v4 format', () => {
      const frameworks = {
        licenseLevels: {},
        playerDevelopmentFrameworks: {
          '4v4': '4v4 framework content',
        },
        methodologies: {},
      };

      const result = getFrameworkForAgeGroup(frameworks, 'U7');
      expect(result.developmentFramework).toBe('4v4 framework content');
      expect(result.recommendedLicenseLevel).toBe('D');

      const result2 = getFrameworkForAgeGroup(frameworks, 'U8');
      expect(result2.developmentFramework).toBe('4v4 framework content');
      expect(result2.recommendedLicenseLevel).toBe('D');
    });

    it('should map U9-U10 to 7v7 format', () => {
      const frameworks = {
        licenseLevels: {},
        playerDevelopmentFrameworks: {
          '7v7': '7v7 framework content',
        },
        methodologies: {},
      };

      const result = getFrameworkForAgeGroup(frameworks, 'U9');
      expect(result.developmentFramework).toBe('7v7 framework content');
      expect(result.recommendedLicenseLevel).toBe('D');

      const result2 = getFrameworkForAgeGroup(frameworks, 'U10');
      expect(result2.developmentFramework).toBe('7v7 framework content');
      expect(result2.recommendedLicenseLevel).toBe('D');
    });

    it('should map U11-U12 to 9v9 format', () => {
      const frameworks = {
        licenseLevels: {},
        playerDevelopmentFrameworks: {
          '9v9': '9v9 framework content',
        },
        methodologies: {},
      };

      const result = getFrameworkForAgeGroup(frameworks, 'U11');
      expect(result.developmentFramework).toBe('9v9 framework content');
      expect(result.recommendedLicenseLevel).toBe('C');

      const result2 = getFrameworkForAgeGroup(frameworks, 'U12');
      expect(result2.developmentFramework).toBe('9v9 framework content');
      expect(result2.recommendedLicenseLevel).toBe('C');
    });

    it('should map U13+ to 11v11 format', () => {
      const frameworks = {
        licenseLevels: {},
        playerDevelopmentFrameworks: {
          '11v11': '11v11 framework content',
        },
        methodologies: {},
      };

      const result = getFrameworkForAgeGroup(frameworks, 'U13');
      expect(result.developmentFramework).toBe('11v11 framework content');
      expect(result.recommendedLicenseLevel).toBe('C');

      const result2 = getFrameworkForAgeGroup(frameworks, 'U18');
      expect(result2.developmentFramework).toBe('11v11 framework content');
      expect(result2.recommendedLicenseLevel).toBe('C');
    });

    it('should default to 11v11 for unknown age groups', () => {
      const frameworks = {
        licenseLevels: {},
        playerDevelopmentFrameworks: {
          '11v11': '11v11 framework content',
        },
        methodologies: {},
      };

      const result = getFrameworkForAgeGroup(frameworks, 'U99');
      expect(result.developmentFramework).toBe('11v11 framework content');
      expect(result.recommendedLicenseLevel).toBe('C');
    });
  });
});
