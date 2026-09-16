
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EnergyAudit | Auditoría de pérdidas",
  description:
    "Sistema web para la auditoría de pérdidas de energía eléctrica",
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