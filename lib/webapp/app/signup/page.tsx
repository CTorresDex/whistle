"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiErrorMessage } from "@/lib/auth";

export default function SignupPage() {
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
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        router.push("/login");
        return;
      }
      const body = await res.json().catch(() => ({}));
      setError(apiErrorMessage(body.error, "Error al registrarse"));
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
            autoComplete="new-password"
            className="w-full rounded-lg bg-neutral-800 px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {error && (
            <p data-testid="signup-error" className="text-sm text-red-400">
              {error}
            </p>
          )}
          <button
            data-testid="submit-signup"
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500 disabled:opacity-50"
          >
            Registrarme
          </button>
        </form>
      </div>
    </main>
  );
}
