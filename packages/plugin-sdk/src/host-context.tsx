import { createContext, useContext, type ReactNode } from 'react';
import type { UseTransportOptions, TransportControls } from './transport';
import type { UseDrumPreviewFn, DrumPreviewControls } from './drumPreview';
import type { UsePercussionPreviewFn, PercussionPreviewControls } from './percussionPreview';
import type { InstrumentRegistryService } from './context';

export type UseTransportFn = (opts: UseTransportOptions) => TransportControls;

interface HostContextValue {
  useTransport: UseTransportFn;
  useDrumPreview?: UseDrumPreviewFn;
  usePercussionPreview?: UsePercussionPreviewFn;
  instruments?: InstrumentRegistryService;
}

const HostContext = createContext<HostContextValue | null>(null);

export function PluginProvider({
  useTransport,
  useDrumPreview,
  usePercussionPreview,
  instruments,
  children,
}: {
  useTransport: UseTransportFn;
  useDrumPreview?: UseDrumPreviewFn;
  usePercussionPreview?: UsePercussionPreviewFn;
  instruments?: InstrumentRegistryService;
  children: ReactNode;
}) {
  return (
    <HostContext.Provider value={{ useTransport, useDrumPreview, usePercussionPreview, instruments }}>
      {children}
    </HostContext.Provider>
  );
}

export function usePluginTransport(opts: UseTransportOptions): TransportControls {
  const ctx = useContext(HostContext);
  if (!ctx) throw new Error('usePluginTransport must be used within PluginProvider');
  return ctx.useTransport(opts);
}

export function usePluginDrumPreview(): DrumPreviewControls {
  const ctx = useContext(HostContext);
  if (!ctx) throw new Error('usePluginDrumPreview must be used within PluginProvider');
  if (!ctx.useDrumPreview) {
    throw new Error('Host did not provide a drum preview capability (useDrumPreview)');
  }
  return ctx.useDrumPreview();
}

export function usePluginPercussionPreview(): PercussionPreviewControls {
  const ctx = useContext(HostContext);
  if (!ctx) throw new Error('usePluginPercussionPreview must be used within PluginProvider');
  if (!ctx.usePercussionPreview) {
    throw new Error('Host did not provide a percussion preview capability (usePercussionPreview)');
  }
  return ctx.usePercussionPreview();
}

/** Access the instrument registry from any plugin UI component. */
export function useInstruments(): InstrumentRegistryService {
  const ctx = useContext(HostContext);
  if (!ctx) throw new Error('useInstruments must be used within PluginProvider');
  if (!ctx.instruments) {
    throw new Error('Host did not provide an instrument registry (instruments)');
  }
  return ctx.instruments;
}
