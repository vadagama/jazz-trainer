import type { UserSettingsDTO, TimeSignatureString, Section } from '@jazz/shared';

export interface UseTransportOptions {
  settings: UserSettingsDTO;
  timeSignature: TimeSignatureString;
  totalBars: number;
  sections?: Section[];
}

export interface TransportControls {
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  nextBar: () => void;
  prevBar: () => void;
  selectBar: (bar: number) => void;
}
