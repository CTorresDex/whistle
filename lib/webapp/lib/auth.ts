export interface Session {
  token: string;
  user_id: number;
  username: string;
}

const KEY = "audio-station-session";

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (typeof session?.token !== "string") return null;
    return session as Session;
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  window.localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession(): void {
  window.localStorage.removeItem(KEY);
}

export const API_ERROR_MESSAGES: Record<string, string> = {
  UserAlreadyExist: "El usuario ya existe",
  InvalidUsernameAndPassword: "Usuario o contraseña inválidos",
  MaxAllowedRetriesExceeded: "Demasiados intentos, prueba más tarde",
  VideoNotFound: "Video no encontrado",
  ValidationError: "Datos inválidos",
};

export function apiErrorMessage(error: unknown, fallback: string): string {
  return (typeof error === "string" && API_ERROR_MESSAGES[error]) || fallback;
}
