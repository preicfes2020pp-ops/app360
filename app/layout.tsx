import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AULA360 — Sistema Inteligente de Gestión y Evaluación Educativa",
  description: "Planea. Enseña. Evalúa. Mejora.",
  icons: { icon: "/logo.png" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
