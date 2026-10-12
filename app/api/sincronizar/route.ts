import { NextResponse } from "next/server";
import { aplicarLote } from "@/lib/offline/servidor";
import { esquemaLote } from "@/lib/offline/operaciones";
import { crearClienteServidor } from "@/lib/supabase/servidor";

const MAX_BYTES = 256 * 1024;

/**
 * Recibe los lotes de la cola offline del celular. Verifica la sesión aquí
 * (el proxy no basta) y aplica cada operación con la sesión del usuario: la RLS
 * de Postgres decide qué se puede escribir. Nunca devuelve totales de dinero.
 */
export async function POST(peticion: Request) {
  const supabase = await crearClienteServidor();
  const { data: auth } = await supabase.auth.getClaims();
  const uid = auth?.claims?.sub;
  if (!uid) return NextResponse.json({ error: "Sesión vencida: vuelve a entrar" }, { status: 401 });

  const largo = Number(peticion.headers.get("content-length") ?? 0);
  if (largo > MAX_BYTES) return NextResponse.json({ error: "Lote demasiado grande" }, { status: 413 });

  let cuerpo: unknown;
  try {
    cuerpo = await peticion.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const lote = esquemaLote.safeParse(cuerpo);
  if (!lote.success) return NextResponse.json({ error: "Lote inválido" }, { status: 400 });

  const resultados = await aplicarLote(supabase, uid, lote.data);
  return NextResponse.json({ resultados });
}
