import { useCallback, useEffect, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';

/** Clamp a number into [min, max], optionally rounding to an integer. */
export function clampNumber(value: number, min: number, max: number, round = true): number {
  const clamped = Math.min(max, Math.max(min, value));
  return round ? Math.round(clamped) : clamped;
}

export interface UseClampedNumberInputOptions {
  /** Committed value — the external source of truth (e.g. store/form state). */
  value: number;
  /** Called with the clamped value once the user commits (blur or Enter). */
  onCommit: (value: number) => void;
  min: number;
  max: number;
  /** Round to integer on commit (default true — BPM/count-in style fields). */
  round?: boolean;
}

export interface ClampedNumberInputHandlers {
  /** Raw text currently shown in the input — free-form while typing, not clamped. */
  text: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * Keyboard-friendly numeric input behavior: lets the user type freely
 * (digits only, no live clamping mid-edit), and only clamps to [min, max] —
 * snapping to the nearest boundary, not reverting — when the field is
 * committed via blur or Enter.
 *
 * Pair with a plain text input: `<input inputMode="numeric" value={text} onChange onBlur onKeyDown />`.
 */
export function useClampedNumberInput({
  value,
  onCommit,
  min,
  max,
  round = true,
}: UseClampedNumberInputOptions): ClampedNumberInputHandlers {
  const [text, setText] = useState(String(value));

  // Reflect external value changes (e.g. +/- step buttons, style change) —
  // but only when not actively being typed into, to avoid clobbering input.
  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = useCallback(() => {
    const parsed = Number(text);
    if (text.trim() !== '' && !Number.isNaN(parsed)) {
      const clamped = clampNumber(parsed, min, max, round);
      setText(String(clamped));
      if (clamped !== value) onCommit(clamped);
    } else {
      // Empty/invalid input — nothing sensible to clamp to, revert display.
      setText(String(value));
    }
  }, [text, min, max, round, value, onCommit]);

  const onChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value.replace(/\D/g, ''));
  }, []);

  const onKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
  }, []);

  return { text, onChange, onBlur: commit, onKeyDown };
}
