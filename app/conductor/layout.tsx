import { exigirRol } from "@/lib/auth/sesion";
import { BotonSalir } from "../boton-salir";
import { EstadoSincronizacion } from "./estado-sincronizacion";
import { NavegacionConductor } from "./navegacion";

export const metadata = { title: "Mi vuelta" };

// Área del conductor. Regla dura: aquí nunca se muestran totales de dinero
// (ni sumas, ni subtotales, ni liquidación). Solo registros individuales.
export default async function LayoutConductor({ children }: LayoutProps<"/conductor">) {
  const perfil = await exigirRol("conductor");

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 px-3 pt-3">
        <div className="vidrio mx-auto flex h-14 w-full max-w-md items-center lg:max-w-7xl justify-between rounded-[1.4rem] pr-2 pl-4">
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-semibold tracking-tight">{perfil.nombre}</span>
            <EstadoSincronizacion uid={perfil.id} />
          </div>
          <BotonSalir />
        </div>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-5 pb-32 lg:max-w-7xl lg:px-6 lg:pt-8">{children}</main>
      <NavegacionConductor />
    </div>
  );
}
