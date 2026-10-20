import Link from "next/link";
import { listarCategorias } from "@/lib/admin/repuestos";
import { exigirRol } from "@/lib/auth/sesion";
import { ControlesCategorias } from "./controles";

export const metadata = { title: "Categorías de repuestos" };

export default async function Categorias() {
  await exigirRol("admin");
  const categorias = await listarCategorias();
  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="titulo-pagina">Categorías de repuestos</h1>
        <Link href="/admin/configuracion" className="text-sm text-marca underline">Configuración</Link>
      </div>
      <p className="text-sm text-texto-suave">
        Las categorías no se borran: una desactivada ya no aparece al registrar, pero el historial la conserva.
      </p>
      <ControlesCategorias categorias={categorias} />
    </section>
  );
}
