"use client";

import { useEffect, useRef, useState } from "react";
import { PauseIcon, PlayIcon } from "./icons";

interface Props {
  // API path of the opus source (e.g. /api/audio/1.opus or /api/preview?url=...)
  src: string | null;
  title: string;
  token: string;
}

// play-bar.hidden — hidden until something is played; streams the opus source and
// shows playback progress plus a play/pause toggle.
export function PlayBar({ src, title, token }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!src) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    setProgress(0);
    setPaused(false);
    (async () => {
      try {
        const res = await fetch(src, {
          headers: { authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        objectUrl = URL.createObjectURL(await res.blob());
        const element = audioRef.current;
        if (element && !cancelled) {
          element.src = objectUrl;
          element.play().catch(() => setPaused(true));
        }
      } catch {
        setPaused(true);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, token]);

  if (!src) return null;

  function toggle() {
    const element = audioRef.current;
    if (!element) return;
    if (element.paused) {
      element.play().catch(() => {});
    } else {
      element.pause();
    }
  }

  return (
    <div
      data-testid="play-bar"
      className="fixed inset-x-0 bottom-0 flex items-center gap-4 border-t border-neutral-800 bg-neutral-900 px-6 py-3"
    >
      <audio
        ref={audioRef}
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          setProgress(el.duration ? (el.currentTime / el.duration) * 100 : 0);
        }}
      />
      <button
        data-testid="toggle-play"
        onClick={toggle}
        aria-label={paused ? "Reproducir" : "Pausar"}
        className="rounded-full bg-emerald-600 p-2 hover:bg-emerald-500"
      >
        {paused ? <PlayIcon /> : <PauseIcon />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{title}</p>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-neutral-800">
          <div className="h-full bg-emerald-500" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}
