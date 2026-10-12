import type { NextRequest } from "next/server";
import { actualizarSesion } from "@/lib/supabase/proxy";

export async function proxy(peticion: NextRequest) {
  return actualizarSesion(peticion);
}

export const config = {
  // Todo menos estáticos, imágenes, el service worker y el manifiesto.
  matcher: [
    "/((?!_next/static|_next/image|serwist/|favicon.ico|manifest.webmanifest|iconos/|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};
