import { Bus, Settings } from "lucide-react";
import Link from "next/link";
import { exigirRol } from "@/lib/auth/sesion";
import { BotonSalir } from "../boton-salir";
import { NavegacionAdminInferior, NavegacionAdminSuperior } from "./navegacion";

export const metadata = { title: { default: "Panel", template: "%s · Panel · FlotaControl" } };

// Área del dueño. El panel puede requerir conexión (CLAUDE.md, PWA offline-first).
export default async function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  const perfil = await exigirRol("admin");

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 px-3 pt-3">
        <div className="vidrio mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-3 rounded-[1.4rem] pr-2 pl-2.5">
          <Link href="/admin" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <span className="neu-logo grid size-9 place-items-center rounded-xl">
              <Bus className="size-5" aria-hidden />
            </span>
            FlotaControl
          </Link>
          <NavegacionAdminSuperior />
          <div className="flex items-center gap-1">
            <span className="mr-1 hidden text-sm text-texto-suave xl:inline">{perfil.nombre}</span>
            <Link
              href="/admin/configuracion"
              aria-label="Configuración"
              className="pestana grid size-10 place-items-center rounded-full lg:hidden"
            >
              <Settings className="size-5" aria-hidden />
            </Link>
            <BotonSalir />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 pb-32 lg:px-6 lg:pb-12">{children}</main>
      <NavegacionAdminInferior />
    </div>
  );
}
