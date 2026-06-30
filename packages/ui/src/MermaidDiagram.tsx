import { useEffect, useRef, useState, type ReactNode } from 'react';

// ---------------------------------------------------------------------------
// MermaidDiagram — renders Mermaid diagrams in lectures
// ---------------------------------------------------------------------------

export interface MermaidDiagramProps {
  mermaid: string;
}

let mermaidModule: typeof import('mermaid') | null = null;
let mermaidLoading = false;
let mermaidPromise: Promise<void> | null = null;

function useMermaid() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mermaidModule) {
      setReady(true);
      return;
    }

    if (mermaidLoading) {
      if (mermaidPromise) {
        mermaidPromise.then(() => setReady(true)).catch((e) => setError(String(e)));
      }
      return;
    }

    mermaidLoading = true;
    mermaidPromise = import('mermaid')
      .then((mod) => {
        mermaidModule = mod;
        mod.default.initialize({ startOnLoad: false, theme: 'default' });
        setReady(true);
      })
      .catch((e) => {
        setError(String(e));
      });

    mermaidPromise.catch((e) => setError(String(e)));
  }, []);

  return { ready, error };
}

export function MermaidDiagram({ mermaid }: MermaidDiagramProps): ReactNode {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { ready, error: loadError } = useMermaid();

  useEffect(() => {
    if (!ready || !containerRef.current || !mermaidModule) return;

    const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;

    mermaidModule.default
      .render(id, mermaid)
      .then((result) => {
        setSvg(result.svg);
        setError(null);
      })
      .catch((e) => {
        setError(`Mermaid syntax error: ${String(e)}`);
      });
  }, [ready, mermaid]);

  if (loadError) {
    return (
      <div className="my-4 p-4 bg-red-50 dark:bg-red-950 rounded-lg text-center text-red-600 text-sm">
        Failed to load Mermaid: {loadError}
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="my-4 p-8 bg-gray-50 dark:bg-gray-900 rounded-lg text-center text-gray-400 text-sm animate-pulse">
        Loading diagram renderer...
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-4 p-4 bg-red-50 dark:bg-red-950 rounded-lg text-center text-red-600 text-sm">
        {error}
      </div>
    );
  }

  if (!svg) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="my-6 flex justify-center overflow-x-auto bg-white dark:bg-gray-950 rounded-lg p-4 border border-gray-200 dark:border-gray-800"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
