"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession, getSession, type Session } from "@/lib/auth";
import type { Audio } from "@/lib/types";
import { AudioThumbnail } from "@/components/AudioThumbnail";
import { DownloadModal } from "@/components/DownloadModal";
import { Navbar } from "@/components/Navbar";
import { usePlayer } from "@/components/Player";
import { PlayIcon, UploadIcon } from "@/components/icons";

const LIMIT = 20;

export default function HomePage() {
  const router = useRouter();
  const player = usePlayer();
  const [session, setSession] = useState<Session | null>(null);
  const [audios, setAudios] = useState<Audio[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const loadingRef = useRef(false);
  const audiosRef = useRef<Audio[]>([]);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    audiosRef.current = audios;
  }, [audios]);

  useEffect(() => {
    const current = getSession();
    if (!current) {
      router.replace("/login");
    } else {
      setSession(current);
    }
  }, [router]);

  const fetchPage = useCallback(
    async (skip: number): Promise<Audio[]> => {
      if (!session) return [];
      const res = await fetch(`/api/list?skip=${skip}&limit=${LIMIT}`, {
        headers: { authorization: `Bearer ${session.token}` },
      });
      if (res.status === 401) {
        clearSession();
        router.replace("/login");
        return [];
      }
      if (!res.ok) return [];
      return res.json();
    },
    [session, router],
  );

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !session) return;
    loadingRef.current = true;
    try {
      const page = await fetchPage(audiosRef.current.length);
      setAudios((current) => [...current, ...page.filter((a) => !current.some((c) => c.id === a.id))]);
      setHasMore(page.length === LIMIT);
    } finally {
      loadingRef.current = false;
    }
  }, [session, fetchPage]);

  const refresh = useCallback(async () => {
    const page = await fetchPage(0);
    setAudios(page);
    setHasMore(page.length === LIMIT);
  }, [fetchPage]);

  useEffect(() => {
    if (session) void refresh();
  }, [session, refresh]);

  // list(endpoint="/list") — infinite scroll via sentinel
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void loadMore();
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  if (!session) return null;

  return (
    <main className="mx-auto max-w-3xl px-6 pb-28">
      <Navbar>
        <button
          data-testid="open-download"
          onClick={() => setModalOpen(true)}
          aria-label="Descargar audio"
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500"
        >
          <UploadIcon />
        </button>
      </Navbar>

      <ul data-testid="audio-list" className="divide-y divide-neutral-800">
        {audios.map((audio, i) => (
          <li key={audio.id} data-testid={`audio-row-${audio.id}`} className="flex items-center justify-between gap-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              {audio.thumbnail && (
                <AudioThumbnail id={audio.id} token={session.token} alt={audio.title} />
              )}
              <span className="truncate text-left">{audio.title}</span>
            </div>
            <button
              data-testid={`play-${audio.id}`}
              onClick={() =>
                player.play(
                  audios.map((a) => ({ src: `/api/audio/${a.id}.opus`, title: a.title })),
                  i,
                )
              }
              aria-label={`Reproducir ${audio.title}`}
              className="rounded-full p-2 text-emerald-400 hover:bg-neutral-800"
            >
              <PlayIcon />
            </button>
          </li>
        ))}
      </ul>
      {audios.length === 0 && (
        <p className="py-10 text-center text-neutral-500">No hay audios todavía</p>
      )}
      <div ref={sentinelRef} />

      <DownloadModal
        open={modalOpen}
        token={session.token}
        onClose={() => setModalOpen(false)}
        onComplete={() => void refresh()}
      />
    </main>
  );
}
