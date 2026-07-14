/**
 * Resolution of a {@link RhodesVoicingRole} against a resolved chord voicing.
 *
 * Reuses `selectVoicingRole` from pianoVoicing for the positional roles
 * (chord/shell/top/bass/upper), and adds `arp1..arp4` — selecting the n-th
 * note of the ascending voicing (with wrapping for short voicings). `arp1`
 * is the lowest voice, `arp4` the highest.
 */
import { selectVoicingRole } from './pianoVoicing.js';
import type { VoiceRole } from './pianoVoicing.js';
import type { RhodesVoicingRole } from './rhodesPatternTypes.js';

const ARP_ROLES = new Set<RhodesVoicingRole>(['arp1', 'arp2', 'arp3', 'arp4']);

/** Map an arp role to its 1-based positional index. */
function arpIndex(role: RhodesVoicingRole): number {
  switch (role) {
    case 'arp1':
      return 1;
    case 'arp2':
      return 2;
    case 'arp3':
      return 3;
    case 'arp4':
      return 4;
    default:
      return 1;
  }
}

/**
 * Slice a voicing by Rhodes role.
 *
 * - Positional roles (chord/shell/top/bass/upper) delegate to piano's
 *   {@link selectVoicingRole}.
 * - `arp1..arp4` pick the n-th note of the ascending voicing, wrapping for
 *   voicings shorter than 4 notes (so e.g. arp3 of a 2-note shell returns
 *   the 1st note — never undefined).
 */
export function selectRhodesVoicingRole(
  voicing: readonly string[],
  role: RhodesVoicingRole,
): string[] {
  if (voicing.length === 0) return [];

  if (ARP_ROLES.has(role)) {
    const idx = (arpIndex(role) - 1) % voicing.length;
    return [voicing[idx]!];
  }

  // Delegate positional roles to the shared piano resolver.
  return selectVoicingRole(voicing, role as VoiceRole);
}

export default selectRhodesVoicingRole;
