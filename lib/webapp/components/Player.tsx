"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { getSession } from "@/lib/auth";

// service#player — centralizes the music player so a single audio stream and
// play-bar are shared across every page instead of each page owning its own.
export type PlayerStatus = "playing" | "paused" | "stopped";

// A track the player can play. `src` is the API path of the opus source, either
// /api/audio/{id}.opus (downloaded audio) or /api/preview?url=... (youtube preview).
export interface Track {
  src: string;
  title: string;
}

interface PlayerState {
  // state.status.enum(default="stopped")
  status: PlayerStatus;
  // state.source.url — source being played
  source: string | null;
  title: string;
  // state.current-time.time — seconds into the current track
  currentTime: number;
  // state.duration.time — total length of the current track
  duration: number;
  // event#play(audio)
  play: (track: Track) => void;
  // event#pause()
  pause: () => void;
  // event#resume()
  resume: () => void;
}

const PlayerContext = createContext<PlayerState | null>(null);

export function usePlayer(): PlayerState {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within a PlayerProvider");
  return ctx;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  // guards against a slow fetch resolving after a newer play() superseded it
  const requestRef = useRef(0);
  const [status, setStatus] = useState<PlayerStatus>("stopped");
  const [source, setSource] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  // event#play(audio) — plays the provided track; if audio is already running it
  // switches to the new one, pausing the current audio while the next one loads.
  const play = useCallback((track: Track) => {
    const element = audioRef.current;
    if (!element) return;
    const request = ++requestRef.current;
    element.pause();
    setSource(track.src);
    setTitle(track.title);
    setCurrentTime(0);
    setDuration(0);
    // paused while loading; flips to playing once the stream starts
    setStatus("paused");
    const token = getSession()?.token;
    (async () => {
      try {
        const res = await fetch(track.src, {
          headers: token ? { authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok || request !== requestRef.current) return;
        const url = URL.createObjectURL(await res.blob());
        if (request !== requestRef.current) {
          URL.revokeObjectURL(url);
          return;
        }
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = url;
        element.src = url;
        await element.play();
      } catch {
        // keep the bar visible in its paused state so the user can retry
        if (request === requestRef.current) setStatus("paused");
      }
    })();
  }, []);

  // event#pause()
  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  // event#resume()
  const resume = useCallback(() => {
    audioRef.current?.play().catch(() => setStatus("paused"));
  }, []);

  return (
    <PlayerContext.Provider
      value={{ status, source, title, currentTime, duration, play, pause, resume }}
    >
      {children}
      <audio
        ref={audioRef}
        onPlay={() => setStatus("playing")}
        onPlaying={() => setStatus("playing")}
        onPause={() => setStatus((s) => (s === "stopped" ? s : "paused"))}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          setDuration(Number.isFinite(d) ? d : 0);
        }}
        onDurationChange={(e) => {
          const d = e.currentTarget.duration;
          setDuration(Number.isFinite(d) ? d : 0);
        }}
      />
    </PlayerContext.Provider>
  );
}
