"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Diseño provisional: la presentación final la define la sección de diseño.
const SECCIONES = [
  { href: "/conductor", titulo: "Mi vuelta" },
  { href: "/conductor/repuestos", titulo: "Repuestos" },
] as const;

export function NavegacionConductor() {
  const ruta = usePathname();
  return (
    <nav className="mx-auto flex w-full max-w-md gap-1 px-4 pb-2" aria-label="Secciones">
      {SECCIONES.map(({ href, titulo }) => {
        const activa = href === "/conductor" ? ruta === href : ruta.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={activa ? "page" : undefined}
            className={`flex h-10 flex-1 items-center justify-center rounded-xl text-sm ${
              activa ? "bg-marca font-semibold text-marca-texto" : "border border-borde"
            }`}
          >
            {titulo}
          </Link>
        );
      })}
    </nav>
  );
}
