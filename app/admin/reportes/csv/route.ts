import { datosReporte } from "@/lib/admin/reportes";
import { exigirRol } from "@/lib/auth/sesion";
import { hoyEnBogota, rangoDelMes } from "@/lib/dominio/fechas";
import { csvPorVuelta } from "@/lib/dominio/reportes";

/** CSV del reporte por vuelta de un mes (solo admin; verifica el rol aquí también). */
export async function GET(peticion: Request) {
  await exigirRol("admin");
  const mesUrl = new URL(peticion.url).searchParams.get("mes") ?? "";
  const mes = /^\d{4}-(0[1-9]|1[0-2])$/.test(mesUrl) ? mesUrl : hoyEnBogota().slice(0, 7);
  const { desde, hasta } = rangoDelMes(mes);
  const { filas, nombres } = await datosReporte(desde, hasta);
  const csv = csvPorVuelta(filas, (id) => (id ? (nombres[id] ?? "") : ""));
  // BOM para que Excel reconozca las tildes.
  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="flotacontrol-vueltas-${mes}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
