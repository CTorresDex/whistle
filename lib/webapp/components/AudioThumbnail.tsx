"use client";

import { useEffect, useRef, useState } from "react";

// Renders a downloaded audio's thumbnail. The /thumbnail/{id}.webp endpoint is
// auth-protected, so — like the Player does for the opus stream — the image is
// fetched with the bearer token and shown through an object URL rather than a
// plain <img src>, which could not carry the Authorization header.
export function AudioThumbnail({
  id,
  token,
  alt,
}: {
  id: number;
  token: string;
  alt: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/thumbnail/${id}.webp`, {
          headers: { authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const objectUrl = URL.createObjectURL(await res.blob());
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        urlRef.current = objectUrl;
        setUrl(objectUrl);
      } catch {
        // leave the placeholder box in place
      }
    })();
    return () => {
      cancelled = true;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [id, token]);

  return (
    <div
      data-testid={`thumbnail-${id}`}
      className="h-10 w-10 flex-none overflow-hidden rounded bg-neutral-800"
    >
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} className="h-full w-full object-cover" />
      )}
    </div>
  );
}
