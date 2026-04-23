import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlotaControl - BoGaviota",
  description: "Sistema de control de flota para uso personal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
