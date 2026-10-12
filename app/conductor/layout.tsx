import { exigirRol } from "@/lib/auth/sesion";
import { BotonSalir } from "../boton-salir";

export const metadata = { title: "Mi vuelta" };

// Área del conductor. Regla dura: aquí nunca se muestran totales de dinero
// (ni sumas, ni subtotales, ni liquidación). Solo registros individuales.
export default async function LayoutConductor({ children }: LayoutProps<"/conductor">) {
  const perfil = await exigirRol("conductor");

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-borde bg-superficie/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-md items-center justify-between px-4">
          <span className="font-semibold">{perfil.nombre}</span>
          <BotonSalir />
        </div>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 p-4">{children}</main>
    </div>
  );
}
