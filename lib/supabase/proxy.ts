import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_LLAVE_PUBLICA, SUPABASE_URL } from "./entorno";
import type { Database } from "./tipos";

const RUTAS_PROTEGIDAS = ["/admin", "/conductor"];

/**
 * Refresca la sesión de Supabase en cada petición y redirige a /login si no hay
 * usuario. Es solo un chequeo optimista: el rol se verifica en los layouts
 * (lib/auth) y, de verdad, en la RLS.
 */
export async function actualizarSesion(peticion: NextRequest) {
  let respuesta = NextResponse.next({ request: peticion });

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_LLAVE_PUBLICA, {
    cookies: {
      getAll() {
        return peticion.cookies.getAll();
      },
      setAll(galletas, cabeceras) {
        for (const { name, value } of galletas) peticion.cookies.set(name, value);
        respuesta = NextResponse.next({ request: peticion });
        for (const { name, value, options } of galletas) {
          respuesta.cookies.set(name, value, options);
        }
        for (const [clave, valor] of Object.entries(cabeceras)) {
          respuesta.headers.set(clave, valor);
        }
      },
    },
  });

  // getClaims valida el JWT; no confiar en getSession() del lado del servidor.
  const { data } = await supabase.auth.getClaims();
  const autenticado = Boolean(data?.claims?.sub);
  const ruta = peticion.nextUrl.pathname;

  if (!autenticado && RUTAS_PROTEGIDAS.some((p) => ruta === p || ruta.startsWith(`${p}/`))) {
    const url = peticion.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return respuesta;
}
