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
