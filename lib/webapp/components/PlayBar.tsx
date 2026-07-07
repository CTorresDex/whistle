"use client";

import { PauseIcon, PlayIcon } from "./icons";
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
// the shared player source and shows progress plus a play/pause toggle.
export function PlayBar() {
  const { status, title, currentTime, duration, pause, resume } = usePlayer();

  if (status === "stopped") return null;

  const paused = status === "paused";
  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div
      data-testid="play-bar"
      className="fixed inset-x-0 bottom-0 flex items-center gap-4 border-t border-neutral-800 bg-neutral-900 px-6 py-3"
    >
      <button
        data-testid="toggle-play"
        onClick={paused ? resume : pause}
        aria-label={paused ? "Reproducir" : "Pausar"}
        className="rounded-full bg-emerald-600 p-2 hover:bg-emerald-500"
      >
        {paused ? <PlayIcon /> : <PauseIcon />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{title}</p>
        <div className="mt-1 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded bg-neutral-800">
            <div className="h-full bg-emerald-500" style={{ width: `${progress}%` }} />
          </div>
          <span className="shrink-0 text-xs tabular-nums text-neutral-400">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
