import { describe, it, expect } from 'vitest';
import { selectRhodesVoicingRole } from './rhodesVoicingRoles.js';

// Reference voicing: C3 E3 G3 B3 (rootless Cmaj7-ish, ascending)
const VOICING = ['C3', 'E3', 'G3', 'B3'];

describe('selectRhodesVoicingRole', () => {
  describe('positional roles (delegated to piano selectVoicingRole)', () => {
    it('chord returns the full voicing', () => {
      expect(selectRhodesVoicingRole(VOICING, 'chord')).toEqual(VOICING);
    });

    it('shell returns the two lowest voices', () => {
      expect(selectRhodesVoicingRole(VOICING, 'shell')).toEqual(['C3', 'E3']);
    });

    it('top returns the highest voice', () => {
      expect(selectRhodesVoicingRole(VOICING, 'top')).toEqual(['B3']);
    });

    it('bass returns the lowest voice', () => {
      expect(selectRhodesVoicingRole(VOICING, 'bass')).toEqual(['C3']);
    });

    it('upper returns voices above the shell', () => {
      const result = selectRhodesVoicingRole(VOICING, 'upper');
      expect(result).toEqual(['G3', 'B3']);
    });
  });

  describe('arp roles (positional voicing notes)', () => {
    it('arp1 returns the lowest note', () => {
      expect(selectRhodesVoicingRole(VOICING, 'arp1')).toEqual(['C3']);
    });

    it('arp2 returns the second note', () => {
      expect(selectRhodesVoicingRole(VOICING, 'arp2')).toEqual(['E3']);
    });

    it('arp3 returns the third note', () => {
      expect(selectRhodesVoicingRole(VOICING, 'arp3')).toEqual(['G3']);
    });

    it('arp4 returns the highest note', () => {
      expect(selectRhodesVoicingRole(VOICING, 'arp4')).toEqual(['B3']);
    });

    it('wraps for voicings shorter than 4 notes', () => {
      const short = ['C3', 'E3'];
      // arp3 of a 2-note voicing wraps: (3-1) % 2 = 0 → first note
      expect(selectRhodesVoicingRole(short, 'arp3')).toEqual(['C3']);
      // arp4: (4-1) % 2 = 1 → second note
      expect(selectRhodesVoicingRole(short, 'arp4')).toEqual(['E3']);
    });

    it('returns single note for each arp role', () => {
      for (const role of ['arp1', 'arp2', 'arp3', 'arp4'] as const) {
        const result = selectRhodesVoicingRole(VOICING, role);
        expect(result).toHaveLength(1);
      }
    });
  });

  describe('edge cases', () => {
    it('returns empty array for empty voicing', () => {
      expect(selectRhodesVoicingRole([], 'chord')).toEqual([]);
      expect(selectRhodesVoicingRole([], 'arp1')).toEqual([]);
    });

    it('handles single-note voicing', () => {
      const single = ['C3'];
      expect(selectRhodesVoicingRole(single, 'arp1')).toEqual(['C3']);
      expect(selectRhodesVoicingRole(single, 'arp4')).toEqual(['C3']);
      expect(selectRhodesVoicingRole(single, 'chord')).toEqual(['C3']);
    });
  });
});
