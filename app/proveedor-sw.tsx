"use client";

import { SerwistProvider } from "@serwist/turbopack/react";
import type { ReactNode } from "react";

/**
 * Registra el service worker. Sin recargar al volver la señal: el conductor puede
 * estar llenando un formulario; la cola de sincronización se encarga del resto.
 */
export function ProveedorServiceWorker({ children }: { children: ReactNode }) {
  return (
    <SerwistProvider
      swUrl="/serwist/sw.js"
      disable={process.env.NODE_ENV === "development"}
      reloadOnOnline={false}
    >
      {children}
    </SerwistProvider>
  );
}
