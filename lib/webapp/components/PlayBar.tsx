"use client";

import { NextIcon, PauseIcon, PlayIcon, PreviousIcon } from "./icons";
import { usePlayer } from "./Player";

// type#time — hours are not capped at 24. Rendered as H:MM:SS, or M:SS when
// under an hour. Non-finite/negative values render as 0:00.
function formatTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) totalSeconds = 0;
  const seconds = Math.floor(totalSeconds % 60);
  const minutes = Math.floor((totalSeconds / 60) % 60);
  const hours = Math.floor(totalSeconds / 3600);
  const mm = hours > 0 ? String(minutes).padStart(2, "0") : String(minutes);
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

// play-bar — fixed at the bottom, hidden while player.status == stopped; streams
// the shared player source and shows previous/play-pause/next controls, the
// title and time, and a progress bar, stacked vertically.
export function PlayBar() {
  const { status, title, currentTime, duration, pause, resume, next, previous } = usePlayer();

  if (status === "stopped") return null;

  const paused = status === "paused";
  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div
      data-testid="play-bar"
      className="fixed inset-x-0 bottom-0 flex flex-col gap-2 border-t border-neutral-800 bg-neutral-900 px-6 py-3"
    >
      <div className="flex items-center justify-center gap-3">
        <button
          data-testid="play-previous"
          onClick={previous}
          aria-label="Anterior"
          className="rounded-full p-2 text-neutral-300 hover:bg-neutral-800"
        >
          <PreviousIcon />
        </button>
        <button
          data-testid="toggle-play"
          onClick={paused ? resume : pause}
          aria-label={paused ? "Reproducir" : "Pausar"}
          className="rounded-full bg-emerald-600 p-2 hover:bg-emerald-500"
        >
          {paused ? <PlayIcon /> : <PauseIcon />}
        </button>
        <button
          data-testid="play-next"
          onClick={next}
          aria-label="Siguiente"
          className="rounded-full p-2 text-neutral-300 hover:bg-neutral-800"
        >
          <NextIcon />
        </button>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p data-testid="play-bar-title" className="truncate text-sm">{title}</p>
        <span className="shrink-0 text-xs tabular-nums text-neutral-400">
          {formatTime(currentTime)} - {formatTime(duration)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded bg-neutral-800">
        <div className="h-full bg-emerald-500" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
