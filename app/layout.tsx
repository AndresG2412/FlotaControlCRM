import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ProveedorServiceWorker } from "./proveedor-sw";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "FlotaControl", template: "%s · FlotaControl" },
  description: "Control de vueltas, dinero y mantenimiento de la buseta",
  applicationName: "FlotaControl",
  appleWebApp: { capable: true, title: "FlotaControl", statusBarStyle: "default" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e4e9f0" },
    { media: "(prefers-color-scheme: dark)", color: "#1f242b" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CO" className={`${geist.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <ProveedorServiceWorker>{children}</ProveedorServiceWorker>
      </body>
    </html>
  );
}
