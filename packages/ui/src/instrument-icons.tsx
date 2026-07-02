import type { InstrumentId } from '@jazz/music-core';
import type { FC, SVGProps } from 'react';

type SvgProps = SVGProps<SVGSVGElement>;
const Svg: FC<SvgProps> = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  />
);

// ─── Drums ──────────────────────────────────────────────────────────────────

export function DrumsIcon(props: SvgProps) {
  return (
    <Svg {...props}>
      {/* Bass drum */}
      <ellipse cx="12" cy="17" rx="5" ry="3" />
      <ellipse cx="12" cy="17" rx="4" ry="2" />
      {/* Floor tom */}
      <ellipse cx="5" cy="11" rx="2.5" ry="1.5" />
      {/* Snare */}
      <ellipse cx="19" cy="10" rx="2.5" ry="1.5" />
      {/* Hi-hat stand */}
      <line x1="19" y1="10" x2="19" y2="5" />
      <line x1="17" y1="8.5" x2="21" y2="8.5" />
      {/* Cymbal (ride) */}
      <ellipse cx="5" cy="6" rx="2" ry="1" />
      <line x1="5" y1="6" x2="5" y2="11" />
    </Svg>
  );
}

// ─── Modern Drums ───────────────────────────────────────────────────────────

export function ModernKitIcon(props: SvgProps) {
  return (
    <Svg {...props}>
      {/* Bass drum (more modern shape) */}
      <ellipse cx="12" cy="18" rx="4" ry="2.5" />
      <line x1="12" y1="18" x2="12" y2="14" />
      {/* Tom 1 & 2 */}
      <ellipse cx="6" cy="12" rx="2" ry="1.2" />
      <ellipse cx="18" cy="12" rx="2" ry="1.2" />
      {/* Floor tom */}
      <ellipse cx="10" cy="15" rx="2.5" ry="1.5" />
      {/* Snare */}
      <ellipse cx="17" cy="11" rx="2.5" ry="1.5" />
      {/* Crash cymbal */}
      <ellipse cx="5" cy="5" rx="2.5" ry="1" />
      <line x1="5" y1="5" x2="5" y2="12" />
      {/* Hi-hat */}
      <line x1="19" y1="12" x2="19" y2="6" />
      <line x1="17" y1="8.5" x2="21" y2="8.5" />
      <line x1="17" y1="6" x2="21" y2="6" />
    </Svg>
  );
}

// ─── Bass (Upright) ─────────────────────────────────────────────────────────

export function BassIcon(props: SvgProps) {
  return (
    <Svg {...props}>
      {/* Body */}
      <path d="M11 8c-2 4-2 10 0 14" />
      <path d="M13 8c2 4 2 10 0 14" />
      {/* Fingerboard */}
      <line x1="12" y1="2" x2="12" y2="8" />
      {/* Scroll */}
      <circle cx="12" cy="2" r="1" />
      {/* Bridge */}
      <line x1="9" y1="12" x2="15" y2="12" />
      {/* Strings */}
      <line x1="11" y1="2" x2="11" y2="20" />
      <line x1="12" y1="2" x2="12" y2="20" />
      <line x1="13" y1="2" x2="13" y2="20" />
    </Svg>
  );
}

// ─── Piano (Grand) ──────────────────────────────────────────────────────────

export function PianoIcon(props: SvgProps) {
  return (
    <Svg {...props}>
      {/* Grand piano body (top view) */}
      <path d="M3 15c0-2 1-5 3-8C8 4 12 3 16 3c3 0 5 2 5 5v8" />
      <path d="M3 15c0 3 2 5 5 5h8c3 0 5-2 5-5" />
      {/* Keyboard */}
      <line x1="6" y1="18" x2="18" y2="18" />
      <line x1="6" y1="20" x2="18" y2="20" />
      {/* Lid prop */}
      <line x1="12" y1="8" x2="8" y2="3" />
    </Svg>
  );
}

// ─── Rhodes (Electric Piano) ────────────────────────────────────────────────

export function RhodesIcon(props: SvgProps) {
  return (
    <Svg {...props}>
      {/* Keyboard body */}
      <rect x="3" y="8" width="18" height="10" rx="1.5" />
      {/* Keys (white) */}
      <line x1="3" y1="8" x2="3" y2="12" />
      <line x1="6" y1="8" x2="6" y2="12" />
      <line x1="9" y1="8" x2="9" y2="12" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="15" y1="8" x2="15" y2="12" />
      <line x1="18" y1="8" x2="18" y2="12" />
      <line x1="21" y1="8" x2="21" y2="12" />
      {/* Black keys */}
      <rect x="4.5" y="8" width="2" height="2.5" rx="0.3" fill="currentColor" />
      <rect x="7.5" y="8" width="2" height="2.5" rx="0.3" fill="currentColor" />
      <rect x="13.5" y="8" width="2" height="2.5" rx="0.3" fill="currentColor" />
      <rect x="16.5" y="8" width="2" height="2.5" rx="0.3" fill="currentColor" />
      <rect x="19.5" y="8" width="2" height="2.5" rx="0.3" fill="currentColor" />
      {/* Stand legs */}
      <line x1="6" y1="18" x2="5" y2="22" />
      <line x1="18" y1="18" x2="19" y2="22" />
      {/* Power indicator */}
      <circle cx="21" cy="9" r="0.8" fill="currentColor" stroke="none" />
    </Svg>
  );
}

// ─── Guitar (Acoustic) ──────────────────────────────────────────────────────

export function GuitarIcon(props: SvgProps) {
  return (
    <Svg {...props}>
      {/* Body */}
      <path d="M10 15c0 4-2 6-4 6s-4-2-4-6c0-3 2-6 4-8 2 2 4 5 4 8z" />
      {/* Sound hole */}
      <circle cx="6" cy="14" r="1.5" />
      {/* Neck */}
      <line x1="6" y1="7" x2="6" y2="2" />
      {/* Headstock */}
      <rect x="4" y="1" width="4" height="2" rx="0.5" />
      {/* Frets */}
      <line x1="5" y1="5" x2="7" y2="5" />
      <line x1="5.5" y1="3.5" x2="6.5" y2="3.5" />
    </Svg>
  );
}

// ─── Electric Guitar ────────────────────────────────────────────────────────

export function ElectricGuitarIcon(props: SvgProps) {
  return (
    <Svg {...props}>
      {/* Body */}
      <path d="M16 14c0 3-2 5-4 5s-4-2-4-5c0-2 1-5 3-7 1 2 3 4 3 5" />
      <path d="M16 14c0 2 1 4 2 5 0 1-1 2-2 2s-2-1-2-3" />
      {/* Neck */}
      <line x1="12" y1="7" x2="12" y2="2" />
      {/* Headstock */}
      <rect x="10" y="1" width="4" height="2" rx="0.5" />
      {/* Pickguard */}
      <path d="M10 13c1 2 3 3 3 2" />
      {/* Pickups */}
      <rect x="9" y="15" width="6" height="1.5" rx="0.3" />
    </Svg>
  );
}

// ─── Vibraphone ─────────────────────────────────────────────────────────────

export function VibraphoneIcon(props: SvgProps) {
  return (
    <Svg {...props}>
      {/* Bars */}
      <rect x="3" y="7" width="4" height="1" rx="0.5" />
      <rect x="4" y="9" width="5" height="1" rx="0.5" />
      <rect x="3.5" y="11" width="6" height="1" rx="0.5" />
      <rect x="5" y="13" width="4" height="1" rx="0.5" />
      {/* Resonator tubes */}
      <line x1="7" y1="7" x2="7" y2="17" />
      <line x1="8.5" y1="9" x2="8.5" y2="17" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="11" y1="13" x2="11" y2="17" />
      {/* Frame */}
      <line x1="3" y1="7" x2="3" y2="17" />
      <line x1="12" y1="7" x2="12" y2="17" />
      <line x1="3" y1="17" x2="12" y2="17" />
      {/* Motor */}
      <circle cx="15" cy="12" r="2" />
      <circle cx="15" cy="12" r="0.8" fill="currentColor" stroke="none" />
      {/* Mallets */}
      <line x1="17" y1="8" x2="20" y2="5" />
      <circle cx="20" cy="5" r="1" fill="currentColor" stroke="none" />
      <line x1="17" y1="16" x2="20" y2="19" />
      <circle cx="20" cy="19" r="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

// ─── Organ ──────────────────────────────────────────────────────────────────

export function OrganIcon(props: SvgProps) {
  return (
    <Svg {...props}>
      {/* Pipes */}
      <rect x="4" y="3" width="2.5" height="14" rx="0.5" />
      <rect x="8" y="5" width="2.5" height="12" rx="0.5" />
      <rect x="12" y="2" width="2.5" height="15" rx="0.5" />
      <rect x="16" y="6" width="2.5" height="11" rx="0.5" />
      {/* Console */}
      <rect x="2" y="17" width="20" height="4" rx="1" />
      {/* Keyboard */}
      <line x1="4" y1="17" x2="4" y2="21" />
      <line x1="7" y1="17" x2="7" y2="21" />
      <line x1="10" y1="17" x2="10" y2="21" />
      <line x1="13" y1="17" x2="13" y2="21" />
      <line x1="16" y1="17" x2="16" y2="21" />
      <line x1="19" y1="17" x2="19" y2="21" />
    </Svg>
  );
}

// ─── Clarinet ───────────────────────────────────────────────────────────────

export function ClarinetIcon(props: SvgProps) {
  return (
    <Svg {...props}>
      {/* Body */}
      <line x1="4" y1="12" x2="22" y2="12" />
      {/* Bell */}
      <path d="M20 12c1-1 2-2 2-1.5v3c0 .5-1-.5-2-1.5" />
      {/* Mouthpiece */}
      <line x1="4" y1="12" x2="2" y2="12" />
      {/* Keys */}
      <circle cx="7" cy="12" r="1" />
      <circle cx="10" cy="12" r="1" />
      <circle cx="13" cy="12" r="0.8" />
      <circle cx="16" cy="12" r="0.8" />
      {/* Upper joint ring */}
      <line x1="5.5" y1="14" x2="5.5" y2="10" />
      {/* Lower joint ring */}
      <line x1="14.5" y1="14" x2="14.5" y2="10" />
    </Svg>
  );
}

// ─── Percussion ─────────────────────────────────────────────────────────────

export function PercussionIcon(props: SvgProps) {
  return (
    <Svg {...props}>
      {/* Conga drum */}
      <path d="M6 8c0-2 1-4 3-4h6c2 0 3 2 3 4v10c0 2-1 3-3 3H9c-2 0-3-1-3-3V8z" />
      {/* Conga top */}
      <ellipse cx="12" cy="8" rx="6" ry="1.5" />
      {/* Maraca (left) */}
      <ellipse cx="2.5" cy="5" rx="1.5" ry="2.5" />
      <line x1="2.5" y1="7.5" x2="2.5" y2="11" />
      {/* Maraca (right) */}
      <ellipse cx="21.5" cy="4" rx="1.5" ry="2.5" />
      <line x1="21.5" y1="6.5" x2="21.5" y2="10" />
    </Svg>
  );
}

// ─── Trumpet ────────────────────────────────────────────────────────────────

export function TrumpetIcon(props: SvgProps) {
  return (
    <Svg {...props}>
      {/* Mouthpiece */}
      <line x1="2" y1="12" x2="4" y2="12" />
      {/* Lead pipe */}
      <line x1="4" y1="12" x2="7" y2="12" />
      {/* Valves */}
      <line x1="7" y1="11" x2="7" y2="13" />
      <line x1="8.5" y1="11" x2="8.5" y2="13" />
      <line x1="10" y1="11" x2="10" y2="13" />
      {/* Valve caps */}
      <circle cx="7" cy="11" r="0.6" />
      <circle cx="8.5" cy="11" r="0.6" />
      <circle cx="10" cy="11" r="0.6" />
      {/* Main tube */}
      <line x1="10" y1="12" x2="15" y2="12" />
      {/* Bell */}
      <path d="M15 12c2-2 4-3 6-2v4c-2 1-4 0-6-2" />
      {/* Finger hook */}
      <path d="M5 12c0 1 0 2-1 2" />
    </Svg>
  );
}

// ─── Flute ──────────────────────────────────────────────────────────────────

export function FluteIcon(props: SvgProps) {
  return (
    <Svg {...props}>
      {/* Body */}
      <rect x="1" y="10" width="22" height="3" rx="1.5" />
      {/* Headjoint */}
      <line x1="1" y1="11.5" x2="0" y2="11.5" />
      {/* Lip plate */}
      <rect x="-0.5" y="9" width="2" height="5" rx="0.8" />
      {/* Keys */}
      <circle cx="6" cy="11.5" r="1" />
      <circle cx="9" cy="11.5" r="1" />
      <circle cx="12" cy="11.5" r="0.8" />
      <circle cx="15" cy="11.5" r="0.8" />
      <circle cx="18" cy="11.5" r="0.8" />
      {/* Footjoint ring */}
      <line x1="21" y1="9" x2="21" y2="14" />
    </Svg>
  );
}

// ─── Saxophone (reuse existing) ─────────────────────────────────────────────

export function SaxophoneIcon(props: SvgProps) {
  return (
    <Svg {...props}>
      {/* Bell (bottom-right, wider section) */}
      <path d="M18 8c0 4-2 7-4 7h-1c-2 0-4-3-4-7V4" />
      {/* Neck (curved top) */}
      <path d="M9 4C9 1 7 1 6 3l-1 3c-1 2 0 4 2 4h1" />
      {/* Mouthpiece */}
      <line x1="5" y1="2" x2="4" y2="1" />
      {/* Keys */}
      <circle cx="14" cy="11" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="12" cy="9" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="14" cy="7" r="0.8" fill="currentColor" stroke="none" />
    </Svg>
  );
}

// ─── Instrument ID → Icon mapping ───────────────────────────────────────────

export const INSTRUMENT_ICONS: Record<InstrumentId, FC<SvgProps>> = {
  drums: DrumsIcon,
  'modern-kit': ModernKitIcon,
  'upright-bass': BassIcon,
  'electric-bass': BassIcon,
  piano: PianoIcon,
  'upright-piano': PianoIcon,
  rhodes: RhodesIcon,
  guitar: GuitarIcon,
  'electric-guitar': ElectricGuitarIcon,
  vibraphone: VibraphoneIcon,
  organ: OrganIcon,
  clarinet: ClarinetIcon,
  percussion: PercussionIcon,
  'trumpet-muted': TrumpetIcon,
  flute: FluteIcon,
};
