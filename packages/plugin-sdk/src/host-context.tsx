import { createContext, useContext, type ReactNode } from 'react';
import type { UseTransportOptions, TransportControls } from './transport';

export type UseTransportFn = (opts: UseTransportOptions) => TransportControls;

interface HostContextValue {
  useTransport: UseTransportFn;
}

const HostContext = createContext<HostContextValue | null>(null);

export function PluginProvider({
  useTransport,
  children,
}: {
  useTransport: UseTransportFn;
  children: ReactNode;
}) {
  return <HostContext.Provider value={{ useTransport }}>{children}</HostContext.Provider>;
}

export function usePluginTransport(opts: UseTransportOptions): TransportControls {
  const ctx = useContext(HostContext);
  if (!ctx) throw new Error('usePluginTransport must be used within PluginProvider');
  return ctx.useTransport(opts);
}
