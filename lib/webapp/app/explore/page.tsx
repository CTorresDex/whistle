"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession, getSession, type Session } from "@/lib/auth";
import type { Video } from "@/lib/types";
import { Navbar } from "@/components/Navbar";
import { PlayBar } from "@/components/PlayBar";
import { DownloadIcon, PlayIcon, SearchIcon } from "@/components/icons";

interface DownloadState {
  progress: number;
  active: boolean;
  done: boolean;
}

export default function ExplorePage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [query, setQuery] = useState("");
  const [videos, setVideos] = useState<Video[]>([]);
  const [searching, setSearching] = useState(false);
  const [playing, setPlaying] = useState<Video | null>(null);
  // keyed by video url — the row progress bar stays visible after completion
  const [downloads, setDownloads] = useState<Record<string, DownloadState>>({});

  useEffect(() => {
    const current = getSession();
    if (!current) {
      router.replace("/login");
    } else {
      setSession(current);
    }
  }, [router]);

  const onLoggedOut = useCallback(() => {
    clearSession();
    router.replace("/login");
  }, [router]);

  // form(endpoint="explore") — search youtube for the entered terms
  async function onSearch(event: React.FormEvent) {
    event.preventDefault();
    if (!session || !query.trim() || searching) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/explore?search=${encodeURIComponent(query.trim())}`, {
        headers: { authorization: `Bearer ${session.token}` },
      });
      if (res.status === 401) return onLoggedOut();
      if (!res.ok) {
        setVideos([]);
        return;
      }
      setVideos(await res.json());
    } finally {
      setSearching(false);
    }
  }

  // action#download(url) — calls /download and shows the progress bar on the row
  async function onDownload(video: Video) {
    if (!session) return;
    const current = downloads[video.url];
    if (current?.active) return;
    setDownloads((d) => ({ ...d, [video.url]: { progress: 0, active: true, done: false } }));
    const update = (patch: Partial<DownloadState>) =>
      setDownloads((d) => ({ ...d, [video.url]: { ...d[video.url]!, ...patch } }));
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ url: video.url }),
      });
      if (!res.ok || !res.body) {
        update({ active: false });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let failed = false;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);
          if (event.error) failed = true;
          if (typeof event.progress === "number") update({ progress: event.progress });
        }
      }
      update({ active: false, done: !failed });
    } catch {
      update({ active: false });
    }
  }

  if (!session) return null;

  const searchForm = (
    <form onSubmit={onSearch} className="flex w-full max-w-md items-center gap-2">
      <input
        data-testid="explore-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="¿Qué quieres escuchar hoy?"
        className="w-full rounded-lg bg-neutral-800 px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <button
        type="submit"
        data-testid="explore-search-submit"
        aria-label="Buscar"
        disabled={searching}
        className="rounded-lg bg-emerald-600 p-2 hover:bg-emerald-500 disabled:opacity-50"
      >
        <SearchIcon />
      </button>
    </form>
  );

  return (
    <main className="mx-auto max-w-3xl px-6 pb-28">
      <Navbar center={searchForm} />

      <ul data-testid="explore-list" className="divide-y divide-neutral-800">
        {videos.map((video, index) => {
          const download = downloads[video.url];
          const showBar = download && (download.active || download.done);
          return (
            <li
              key={video.url}
              data-testid={`explore-row-${index}`}
              className="relative flex items-center justify-between gap-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                {video.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={video.thumbnail} alt="" className="h-10 w-16 rounded object-cover" />
                )}
                <div className="min-w-0">
                  <p className="truncate">{video.title}</p>
                  {video.duration && (
                    <p className="text-xs text-neutral-500">{video.duration}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  data-testid={`explore-play-${index}`}
                  onClick={() => setPlaying(video)}
                  aria-label={`Reproducir ${video.title}`}
                  className="rounded-full p-2 text-emerald-400 hover:bg-neutral-800"
                >
                  <PlayIcon />
                </button>
                <button
                  data-testid={`explore-download-${index}`}
                  onClick={() => onDownload(video)}
                  disabled={download?.active}
                  aria-label={`Descargar ${video.title}`}
                  className="rounded-full p-2 text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
                >
                  <DownloadIcon />
                </button>
              </div>
              {/* Download progress rendered as a 2px bottom border that never changes
                  the row height and stays visible once the download completes. */}
              {showBar && (
                <div
                  data-testid={`explore-progress-${index}`}
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-500 transition-all"
                  style={{ width: `${download!.progress}%` }}
                />
              )}
            </li>
          );
        })}
      </ul>
      {videos.length === 0 && (
        <p className="py-10 text-center text-neutral-500">
          Busca un video para empezar a escuchar
        </p>
      )}

      <PlayBar
        src={playing ? `/api/preview?url=${encodeURIComponent(playing.url)}` : null}
        title={playing?.title ?? ""}
        token={session.token}
      />
    </main>
  );
}
