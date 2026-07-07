"use client";

import { useState } from "react";
import { apiErrorMessage } from "@/lib/auth";
import { UploadIcon } from "./icons";

interface Props {
  open: boolean;
  token: string;
  onClose: () => void;
  onComplete: () => void;
}

// modal#download-modal — inputs/buttons disabled while downloading, progress bar
// only visible during the download, closes itself once the download completes.
export function DownloadModal({ open, token, onClose, onComplete }: Props) {
  const [url, setUrl] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setDownloading(true);
    setProgress(0);
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        setError(apiErrorMessage(body.error, "La descarga falló"));
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
          if (typeof event.progress === "number") setProgress(event.progress);
        }
      }
      if (failed) {
        setError("La descarga falló");
        return;
      }
      setUrl("");
      onComplete();
      onClose();
    } catch {
      setError("Error de conexión");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div
      data-testid="download-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
    >
      <div className="w-full max-w-md space-y-4 rounded-xl bg-neutral-900 p-6">
        <h2 className="text-lg font-semibold">Descargar audio</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            data-testid="download-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={downloading}
            placeholder="URL de YouTube"
            className="w-full rounded-lg bg-neutral-800 px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
          />
          {error && (
            <p data-testid="download-error" className="text-sm text-red-400">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              data-testid="cancel-download"
              onClick={onClose}
              disabled={downloading}
              className="rounded-lg px-4 py-2 text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              data-testid="submit-download"
              disabled={downloading}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500 disabled:opacity-50"
            >
              <UploadIcon />
              Subir
            </button>
          </div>
        </form>
        {downloading && (
          <div data-testid="download-progress" className="h-2 w-full overflow-hidden rounded bg-neutral-800">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
