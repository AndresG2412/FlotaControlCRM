import { Receipt, Wrench } from "lucide-react";
import Link from "next/link";
import { exigirRol } from "@/lib/auth/sesion";

export default async function Configuracion() {
  await exigirRol("admin");
  return (
    <section className="flex flex-col gap-6">
      <h1 className="titulo-pagina">Configuración</h1>
      <ul className="grid gap-5 sm:grid-cols-2">
        <li>
          <Link href="/admin/configuracion/gastos-fijos" className="flex h-full gap-3 neu-tarjeta p-4 neu-enlace">
            <Receipt className="mt-0.5 size-5 shrink-0 text-marca" aria-hidden />
            <div className="flex flex-col gap-1">
              <span className="font-medium">Gastos fijos</span>
              <span className="text-sm text-texto-suave">Valores por vuelta, con fecha de vigencia</span>
            </div>
          </Link>
        </li>
        <li>
          <Link href="/admin/configuracion/categorias" className="flex h-full gap-3 neu-tarjeta p-4 neu-enlace">
            <Wrench className="mt-0.5 size-5 shrink-0 text-marca" aria-hidden />
            <div className="flex flex-col gap-1">
              <span className="font-medium">Categorías de repuestos</span>
              <span className="text-sm text-texto-suave">Agregar o desactivar categorías</span>
            </div>
          </Link>
        </li>
      </ul>
    </section>
  );
}
