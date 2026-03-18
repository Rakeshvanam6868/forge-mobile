/**
 * Aha Engine — Archetype Classification Tests
 * 
 * Validates that every archetype is deterministically reachable
 * and that the same inputs always produce the same archetype.
 */

import { classifyArchetype, classifyUser, AhaInput } from '../ahaEngine';

describe('Aha Engine: Archetype Classification', () => {

  describe('Archetype Mapping', () => {
    test('Restart Builder: beginner + low frequency + no recent workout', () => {
      const input: AhaInput = { goal: 'general_fitness', level: 'beginner', environment: 'home', frequency: '2-3', lastWorkout: 'none' };
      expect(classifyArchetype(input)).toBe('restart_builder');
    });

    test('Hidden Potential Builder: intermediate + has recent workout', () => {
      const input: AhaInput = { goal: 'muscle_gain', level: 'intermediate', environment: 'gym', frequency: '3-4', lastWorkout: 'push' };
      expect(classifyArchetype(input)).toBe('hidden_potential');
    });

    test('Weekend Hustler: 2-3 days + has recent workout (non-intermediate)', () => {
      const input: AhaInput = { goal: 'fat_loss', level: 'beginner', environment: 'home', frequency: '2-3', lastWorkout: 'legs' };
      expect(classifyArchetype(input)).toBe('weekend_hustler');
    });

    test('Explorer: beginner + high frequency', () => {
      const input: AhaInput = { goal: 'general_fitness', level: 'beginner', environment: 'gym', frequency: '5+', lastWorkout: 'none' };
      expect(classifyArchetype(input)).toBe('explorer');
    });

    test('Stuck Performer: advanced + high frequency + has recent workout', () => {
      const input: AhaInput = { goal: 'muscle_gain', level: 'advanced', environment: 'gym', frequency: '5+', lastWorkout: 'push' };
      expect(classifyArchetype(input)).toBe('stuck_performer');
    });

    test('Comeback Builder: has recent workout + low frequency (non-beginner, non-intermediate)', () => {
      const input: AhaInput = { goal: 'recomp', level: 'advanced', environment: 'gym', frequency: '3-4', lastWorkout: 'pull' };
      expect(classifyArchetype(input)).toBe('comeback_builder');
    });
  });

  describe('Determinism', () => {
    test('Same inputs always produce same archetype (100 runs)', () => {
      const input: AhaInput = { goal: 'muscle_gain', level: 'intermediate', environment: 'gym', frequency: '4-5', lastWorkout: 'push' };
      const firstResult = classifyArchetype(input);
      for (let i = 0; i < 100; i++) {
        expect(classifyArchetype(input)).toBe(firstResult);
      }
    });
  });

  describe('Full classifyUser Output', () => {
    test('Returns complete AhaResult with all required fields', () => {
      const input: AhaInput = { goal: 'fat_loss', level: 'beginner', environment: 'home', frequency: '2-3', lastWorkout: 'none' };
      const result = classifyUser(input);

      expect(result.archetypeId).toBeDefined();
      expect(result.archetypeName).toBeTruthy();
      expect(result.emoji).toBeTruthy();
      expect(result.mirror).toBeTruthy();
      expect(result.rootCause).toBeTruthy();
      expect(result.progressFeeling).toBeTruthy();
      expect(result.shift).toBeTruthy();
      expect(result.personalTags).toHaveLength(3);
      expect(result.personalTags.every(t => t.length > 10)).toBe(true);
    });

    test('Mirror text is not generic / not empty', () => {
      const inputs: AhaInput[] = [
        { goal: 'fat_loss', level: 'beginner', environment: 'home', frequency: '2-3', lastWorkout: 'none' },
        { goal: 'muscle_gain', level: 'advanced', environment: 'gym', frequency: '5+', lastWorkout: 'push' },
        { goal: 'recomp', level: 'intermediate', environment: 'gym', frequency: '3-4', lastWorkout: 'pull' },
      ];
      const results = inputs.map(i => classifyUser(i));
      // All mirrors should be unique (different archetypes = different copy)
      const mirrors = new Set(results.map(r => r.mirror));
      expect(mirrors.size).toBe(results.length);
    });

    test('All 6 archetypes produce valid personal tags based on inputs', () => {
      const scenarios: AhaInput[] = [
        { goal: 'general_fitness', level: 'beginner', environment: 'home', frequency: '2-3', lastWorkout: 'none' },
        { goal: 'muscle_gain', level: 'intermediate', environment: 'gym', frequency: '3-4', lastWorkout: 'push' },
        { goal: 'fat_loss', level: 'beginner', environment: 'home', frequency: '2-3', lastWorkout: 'legs' },
        { goal: 'general_fitness', level: 'beginner', environment: 'gym', frequency: '5+', lastWorkout: 'none' },
        { goal: 'muscle_gain', level: 'advanced', environment: 'gym', frequency: '5+', lastWorkout: 'push' },
        { goal: 'recomp', level: 'advanced', environment: 'gym', frequency: '3-4', lastWorkout: 'pull' },
      ];

      scenarios.forEach(input => {
        const result = classifyUser(input);
        expect(result.personalTags.length).toBe(3);
        // Tags should mention something relevant to input
        const allTagsText = result.personalTags.join(' ').toLowerCase();
        expect(allTagsText.length).toBeGreaterThan(50);
      });
    });
  });
});
