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

// state.iteration_mode.enum — what happens when the current song ends.
export type IterationMode = "cycle-playlist" | "cycle-song" | "no-cycle";

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
  // state.iteration_mode.enum(default="cycle-playlist")
  iterationMode: IterationMode;
  setIterationMode: (mode: IterationMode) => void;
  // action#play(audio) — play track `index` of `playlist`; the playlist is kept so
  // on_end can advance to the next song.
  play: (playlist: Track[], index: number) => void;
  // action#pause()
  pause: () => void;
  // action#resume()
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
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [index, setIndex] = useState(0);
  const [iterationMode, setIterationMode] = useState<IterationMode>("cycle-playlist");

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  // Loads track `i` of `tracks`, pausing the current audio while the next one
  // loads, then starts playback. Shared by play() and on_end() cycling.
  const playIndex = useCallback((tracks: Track[], i: number) => {
    const element = audioRef.current;
    if (!element || i < 0 || i >= tracks.length) return;
    const track = tracks[i];
    const request = ++requestRef.current;
    element.pause();
    setPlaylist(tracks);
    setIndex(i);
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

  // action#play(audio) — plays the provided track; if audio is already running it
  // switches to the new one, pausing the current audio while the next one loads.
  const play = useCallback(
    (tracks: Track[], i: number) => playIndex(tracks, i),
    [playIndex],
  );

  // action#pause()
  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  // action#resume()
  const resume = useCallback(() => {
    audioRef.current?.play().catch(() => setStatus("paused"));
  }, []);

  // event#on_end() — triggered when a song finishes playing.
  const onEnd = useCallback(() => {
    if (iterationMode === "cycle-song") {
      // repeat the same song
      playIndex(playlist, index);
    } else if (iterationMode === "cycle-playlist") {
      // go to next song, wrapping to the first after the last one
      if (playlist.length === 0) return;
      playIndex(playlist, (index + 1) % playlist.length);
    } else {
      // no-cycle: stop playing, set status to "paused"
      setStatus("paused");
    }
  }, [iterationMode, playlist, index, playIndex]);

  return (
    <PlayerContext.Provider
      value={{
        status,
        source,
        title,
        currentTime,
        duration,
        iterationMode,
        setIterationMode,
        play,
        pause,
        resume,
      }}
    >
      {children}
      <audio
        ref={audioRef}
        onPlay={() => setStatus("playing")}
        onPlaying={() => setStatus("playing")}
        onPause={() => setStatus((s) => (s === "stopped" ? s : "paused"))}
        onEnded={onEnd}
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
