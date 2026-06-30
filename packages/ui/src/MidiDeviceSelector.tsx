import type { ReactNode } from 'react';
import type { MidiDeviceInfo } from '@jazz/music-core';

export interface MidiDeviceSelectorProps {
  devices: MidiDeviceInfo[];
  selectedDeviceId: string | null;
  onSelectDevice: (deviceId: string | null) => void;
  channelFilter?: number | 'all';
  onChannelChange?: (channel: number | 'all') => void;
}

/**
 * Dropdown selector for MIDI input device and optional channel filter.
 */
export function MidiDeviceSelector({
  devices,
  selectedDeviceId,
  onSelectDevice,
  channelFilter,
  onChannelChange,
}: MidiDeviceSelectorProps): ReactNode {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="midi-device-select" className="text-xs text-muted-foreground">
        MIDI In:
      </label>
      <select
        id="midi-device-select"
        value={selectedDeviceId ?? 'all'}
        onChange={(e) => {
          const val = e.target.value;
          onSelectDevice(val === 'all' ? null : val);
        }}
        className="rounded border border-border bg-card px-2 py-1 text-xs text-foreground max-w-40"
      >
        <option value="all">All Devices</option>
        {devices.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      {onChannelChange && channelFilter !== undefined && (
        <select
          aria-label="MIDI Channel"
          value={channelFilter}
          onChange={(e) => {
            const val = e.target.value;
            onChannelChange(val === 'all' ? 'all' : parseInt(val, 10));
          }}
          className="rounded border border-border bg-card px-2 py-1 text-xs text-foreground"
        >
          <option value="all">Ch: All</option>
          {Array.from({ length: 16 }, (_, i) => (
            <option key={i} value={i}>
              Ch: {i + 1}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
