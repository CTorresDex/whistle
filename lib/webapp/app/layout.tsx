import type { Metadata } from "next";
import "./globals.css";
import { PlayBar } from "@/components/PlayBar";
import { PlayerProvider } from "@/components/Player";

export const metadata: Metadata = {
  title: "Audio Station",
  description: "Descarga y reproduce audios de YouTube",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        <PlayerProvider>
          {children}
          <PlayBar />
        </PlayerProvider>
      </body>
    </html>
  );
}
