"use client";

import { useEffect, useRef, useState } from "react";
import type { Audio } from "@/lib/types";
import { PauseIcon, PlayIcon } from "./icons";

interface Props {
  audio: Audio | null;
  token: string;
}

// play-bar.hidden — hidden until an audio is played; streams the audio from
// /audio/{id}.opus and shows playback progress plus a play/pause toggle.
export function PlayBar({ audio, token }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!audio) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    setProgress(0);
    setPaused(false);
    (async () => {
      try {
        const res = await fetch(`/api/audio/${audio.id}.opus`, {
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
  }, [audio, token]);

  if (!audio) return null;

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
        <p className="truncate text-sm">{audio.title}</p>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-neutral-800">
          <div className="h-full bg-emerald-500" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}
