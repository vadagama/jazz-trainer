import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ComputerKeyboardState {
  /** Whether laptop keyboard input is enabled. */
  enabled: boolean;
  /** Base octave for the key map (1–7, default 4 → C4–C5). */
  octave: number;
  setEnabled: (enabled: boolean) => void;
  setOctave: (octave: number) => void;
}

export const useComputerKeyboardStore = create<ComputerKeyboardState>()(
  persist(
    (set) => ({
      enabled: false,
      octave: 4,
      setEnabled: (enabled) => set({ enabled }),
      setOctave: (octave) => set({ octave }),
    }),
    { name: 'jazz-computer-keyboard' },
  ),
);
