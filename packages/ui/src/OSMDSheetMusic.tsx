import { type ReactNode, useEffect, useRef, useState, useCallback } from 'react';
import type { PlaybackConfig } from '@jazz/plugin-sdk';

// ---------------------------------------------------------------------------
// OSMDSheetMusic — renders sheet music via opensheetmusicdisplay
// ---------------------------------------------------------------------------

export interface OSMDSheetMusicProps {
  notes: string; // MusicXML or ABC notation
  playback?: PlaybackConfig;
  className?: string;
}

export function OSMDSheetMusic({ notes, playback, className }: OSMDSheetMusicProps): ReactNode {
  const containerRef = useRef<HTMLDivElement>(null);
  const [osmd, setOsmd] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const initOsmd = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      const { OpenSheetMusicDisplay } = await import('opensheetmusicdisplay');
      const instance = new OpenSheetMusicDisplay(containerRef.current, {
        autoResize: true,
        backend: 'svg',
        drawTitle: false,
        drawSubtitle: false,
        drawComposer: false,
        pageBackgroundColor: 'transparent',
      });
      setOsmd(instance);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load OSMD');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void initOsmd();
  }, [initOsmd]);

  useEffect(() => {
    if (!osmd) return;
    const loadNotes = async () => {
      try {
        setLoading(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (osmd as any).load(notes);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (osmd as any).render();
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to render sheet music');
      } finally {
        setLoading(false);
      }
    };
    void loadNotes();
  }, [osmd, notes]);

  if (error) {
    return (
      <div
        className={`p-4 bg-red-50 dark:bg-red-950 rounded-lg text-red-600 text-sm ${className ?? ''}`}
      >
        Sheet music unavailable: {error}
      </div>
    );
  }

  return (
    <div className={`relative ${className ?? ''}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 rounded-lg z-10">
          <span className="text-sm text-gray-500">Loading sheet music...</span>
        </div>
      )}
      <div ref={containerRef} className="osmd-container min-h-[120px]" />
      {playback && (
        <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
          <span>♩ = {playback.tempo}</span>
          {playback.instrument && <span>· {playback.instrument}</span>}
        </div>
      )}
    </div>
  );
}
