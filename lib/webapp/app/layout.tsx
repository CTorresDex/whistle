import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Audio Station",
  description: "Descarga y reproduce audios de YouTube",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        {children}
      </body>
    </html>
  );
}
