"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type Seccion = {
  href: string;
  titulo: string;
  icono: LucideIcon;
  /** Solo en la barra superior de escritorio (en el celular se llega por otro lado). */
  soloEscritorio?: boolean;
  /** Se ve pero no lleva a ningún lado (sección en pausa). */
  deshabilitada?: boolean;
};

const esActiva = (ruta: string, href: string, raiz: string) =>
  href === raiz ? ruta === href : ruta === href || ruta.startsWith(`${href}/`);

/** Pestañas en línea para el encabezado de escritorio. */
export function PestanasSuperiores({ secciones, raiz }: { secciones: readonly Seccion[]; raiz: string }) {
  const ruta = usePathname();
  return (
    <nav aria-label="Secciones" className="hidden items-center gap-1 lg:flex">
      {secciones.map(({ href, titulo, deshabilitada }) =>
        deshabilitada ? (
          <span key={href} aria-disabled="true" className="rounded-full px-3.5 py-1.5 text-sm opacity-45">
            {titulo}
          </span>
        ) : (
          <Link
            key={href}
            href={href}
            aria-current={esActiva(ruta, href, raiz) ? "page" : undefined}
            className="pestana rounded-full px-3.5 py-1.5 text-sm"
          >
            {titulo}
          </Link>
        ),
      )}
    </nav>
  );
}

/**
 * Barra de vidrio flotante abajo, al alcance del pulgar. El contenido pasa por
 * debajo y se difumina. `escritorio` la deja también en pantallas grandes.
 */
export function PestanasInferiores({
  secciones,
  raiz,
  escritorio = false,
}: {
  secciones: readonly Seccion[];
  raiz: string;
  escritorio?: boolean;
}) {
  const ruta = usePathname();
  const visibles = secciones.filter((s) => !s.soloEscritorio);
  return (
    <nav
      aria-label="Secciones"
      className={`pb-seguro fixed inset-x-0 bottom-0 z-30 px-3 ${escritorio ? "" : "lg:hidden"}`}
    >
      <div
        className="vidrio mx-auto grid max-w-md gap-0.5 rounded-[1.6rem] p-1.5"
        style={{ gridTemplateColumns: `repeat(${visibles.length}, minmax(0, 1fr))` }}
      >
        {visibles.map(({ href, titulo, icono: Icono, deshabilitada }) => {
          const clase = "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-[1.15rem] text-[0.75rem] leading-tight tracking-tight";
          const contenido = (
            <>
              <Icono className="size-5" aria-hidden />
              <span className="max-w-full truncate">{titulo}</span>
            </>
          );
          return deshabilitada ? (
            <span key={href} aria-disabled="true" className={`${clase} opacity-40`}>{contenido}</span>
          ) : (
            <Link key={href} href={href} aria-current={esActiva(ruta, href, raiz) ? "page" : undefined} className={`pestana ${clase}`}>
              {contenido}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
