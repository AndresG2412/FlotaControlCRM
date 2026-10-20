import { exigirRol } from "@/lib/auth/sesion";
import { listarConfigGastosFijos } from "@/lib/admin/gastos-fijos";
import { formatearPesos } from "@/lib/dominio/dinero";
import { hoyEnBogota } from "@/lib/dominio/fechas";
import { fijosVigentes, historialPorConcepto, totalFijos } from "@/lib/dominio/gastos-fijos";
import { FormularioGastoFijo } from "./formulario";

const tarjeta = "flex flex-col gap-3 neu-tarjeta p-4";

export default async function GastosFijos() {
  await exigirRol("admin");
  const config = await listarConfigGastosFijos();
  const hoy = hoyEnBogota();
  const vigentes = fijosVigentes(config, hoy);
  const historial = historialPorConcepto(config);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="titulo-pagina">Gastos fijos por vuelta</h1>
      <p className="neu-pozo neu-aviso px-4 py-3 text-sm">
        Las vueltas ya creadas conservan sus valores. Un cambio aplica a las vueltas cuya fecha de inicio sea igual o
        posterior a su fecha de vigencia.
      </p>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <section className={tarjeta}>
          <h2 className="font-semibold">Vigentes hoy ({hoy})</h2>
          {vigentes.length === 0 ? (
            <p className="text-sm text-texto-suave">No hay gastos fijos configurados.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {vigentes.map((g) => (
                  <tr key={g.concepto} className="border-t border-borde first:border-t-0">
                    <td className="py-2">{g.concepto}</td>
                    <td className="py-2 text-texto-suave">{g.se_paga_en_ruta ? "en ruta" : "lo paga el dueño"}</td>
                    <td className="monto py-2 text-right">{formatearPesos(g.valor)}</td>
                  </tr>
                ))}
                <tr className="border-t border-borde font-semibold">
                  <td className="py-2" colSpan={2}>Total por vuelta</td>
                  <td className="monto py-2 text-right">{formatearPesos(totalFijos(vigentes))}</td>
                </tr>
              </tbody>
            </table>
          )}
        </section>

        <FormularioGastoFijo conceptos={[...historial.keys()]} hoy={hoy} />
      </div>

      <section className={tarjeta}>
        <h2 className="font-semibold">Historial por concepto</h2>
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 @2xl:grid-cols-2 @4xl:grid-cols-3">
          {[...historial.entries()].map(([concepto, filas]) => (
            <div key={concepto} className="flex flex-col gap-1">
              <h3 className="text-sm font-medium">{concepto}</h3>
              <ul className="text-sm text-texto-suave">
                {filas.map((f) => (
                  <li key={f.vigente_desde} className="monto flex justify-between border-t border-borde py-1 first:border-t-0">
                    <span>desde {f.vigente_desde}</span>
                    <span>{f.valor === 0 ? "quitado" : formatearPesos(f.valor)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
