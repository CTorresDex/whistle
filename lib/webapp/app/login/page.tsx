"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiErrorMessage, saveSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        saveSession(await res.json());
        router.push("/home");
        return;
      }
      const body = await res.json().catch(() => ({}));
      setError(apiErrorMessage(body.error, "Error al iniciar sesión"));
    } catch {
      setError("Error de conexión");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-center text-2xl font-bold">Audio Station</h1>
        <form onSubmit={onSubmit} className="space-y-4 rounded-xl bg-neutral-900 p-6">
          <input
            data-testid="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Usuario"
            autoComplete="username"
            className="w-full rounded-lg bg-neutral-800 px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            data-testid="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            autoComplete="current-password"
            className="w-full rounded-lg bg-neutral-800 px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {error && (
            <p data-testid="login-error" className="text-sm text-red-400">
              {error}
            </p>
          )}
          <button
            data-testid="submit-login"
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500 disabled:opacity-50"
          >
            Iniciar sesión
          </button>
        </form>
        <p className="text-center text-sm text-neutral-400">
          <Link data-testid="goto-signup" href="/signup" className="hover:text-neutral-200">
            ¿No tienes cuenta? Registrate
          </Link>
        </p>
      </div>
    </main>
  );
}
