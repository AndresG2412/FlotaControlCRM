import { exigirRol } from "@/lib/auth/sesion";
import { BotonSalir } from "../boton-salir";

export const metadata = { title: { default: "Panel", template: "%s · Panel · FlotaControl" } };

// Área del dueño. El panel puede requerir conexión (CLAUDE.md, PWA offline-first).
export default async function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  const perfil = await exigirRol("admin");

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-borde bg-superficie/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <span className="font-semibold">FlotaControl</span>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-texto-suave sm:inline">{perfil.nombre}</span>
            <BotonSalir />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 p-4">{children}</main>
    </div>
  );
}
