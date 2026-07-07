const base = "h-5 w-5 fill-current";

export function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className={base} aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

export function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" className={base} aria-hidden>
      <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
    </svg>
  );
}

export function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" className={base} aria-hidden>
      <path d="M12 3l6 6h-4v8h-4V9H6zM5 19h14v2H5z" />
    </svg>
  );
}

export function PreviousIcon() {
  return (
    <svg viewBox="0 0 24 24" className={base} aria-hidden>
      <path d="M6 5h2v14H6zM19 5v14l-11-7z" />
    </svg>
  );
}

export function NextIcon() {
  return (
    <svg viewBox="0 0 24 24" className={base} aria-hidden>
      <path d="M16 5h2v14h-2zM5 5v14l11-7z" />
    </svg>
  );
}

export function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className={base} aria-hidden>
      <path d="M11 3h2v8h4l-5 6-5-6h4zM5 19h14v2H5z" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className={base} aria-hidden>
      <path d="M10 2a8 8 0 015.29 13.71l5 5-1.42 1.42-5-5A8 8 0 1110 2zm0 2a6 6 0 100 12 6 6 0 000-12z" />
    </svg>
  );
}
