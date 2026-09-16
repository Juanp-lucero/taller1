import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GridAudit | Auditoría energética",
  description:
    "Plataforma local para el análisis de pérdidas de energía mediante procesamiento paralelo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}