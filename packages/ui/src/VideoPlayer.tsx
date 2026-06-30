import { useState, type ReactNode } from 'react';

// ---------------------------------------------------------------------------
// VideoPlayer — embedded video (YouTube or native HTML5)
// ---------------------------------------------------------------------------

export interface VideoPlayerProps {
  src: string;
  poster?: string;
}

function isYouTubeUrl(src: string): string | null {
  // Full URL: https://www.youtube.com/watch?v=VIDEO_ID
  const watchMatch = /[?&]v=([^&]+)/.exec(src);
  if (watchMatch) return watchMatch[1]!;

  // Short URL: https://youtu.be/VIDEO_ID
  const youtuMatch = /youtu\.be\/([^?&]+)/.exec(src);
  if (youtuMatch) return youtuMatch[1]!;

  // Embed URL: https://www.youtube.com/embed/VIDEO_ID
  const embedMatch = /youtube\.com\/embed\/([^?&]+)/.exec(src);
  if (embedMatch) return embedMatch[1]!;

  // Bare ID (11 chars, alphanumeric + _ -)
  if (/^[\w-]{11}$/.test(src)) return src;

  return null;
}

export function VideoPlayer({ src, poster }: VideoPlayerProps): ReactNode {
  const [error, setError] = useState<string | null>(null);
  const youtubeId = isYouTubeUrl(src);

  if (youtubeId) {
    return (
      <div className="my-4 aspect-video rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800">
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}`}
          title="YouTube video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    );
  }

  return (
    <div className="my-4 space-y-2">
      {/* VideoPlayer: caption not needed for embedded player */}
      <video
        src={src}
        poster={poster}
        controls
        preload="metadata"
        className="w-full rounded-lg border border-gray-200 dark:border-gray-800"
        onError={() => setError('Failed to load video')}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
