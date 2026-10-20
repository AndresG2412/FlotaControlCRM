import Link from "next/link";
import { notFound } from "next/navigation";
import {
  detalleVuelta,
  listarConductores,
  type EncomiendaDetalle,
  type GastoFijoVuelta,
  type GastoVariableDetalle,
  type IngresosVuelta,
  type PasajeroDetalle,
  type PlanillaDetalle,
  type ResumenDinero,
  type CierreReemplazado,
  type TrayectoDetalle,
} from "@/lib/admin/vueltas";
import { exigirRol } from "@/lib/auth/sesion";
import { formatearPesos } from "@/lib/dominio/dinero";
import { formatearFechaHora } from "@/lib/dominio/fechas";
import type { TerminalConPlanilla } from "@/lib/dominio/planillas";
import { buscarTramo, TERMINALES } from "@/lib/dominio/ruta";
import { accionesAdmin } from "@/lib/dominio/vuelta";
import { ETIQUETA_ESTADO, ETIQUETA_TIPO, fechaCorta } from "../etiquetas";
import {
  AccionesPlanilla,
  AjustarGastoFijo,
  CerrarVuelta,
  EditarVuelta,
  EliminarDePolilla,
  EliminarGasto,
  ReabrirCerrada,
  ReabrirVuelta,
} from "./controles";

export const metadata = { title: "Detalle de vuelta" };

// Diseño provisional. Todo el dinero (ingresos, gastos, liquidación y cuadre) se lee
// de reporte_vueltas: aquí no se recalcula.
const tarjeta = "flex flex-col gap-3 neu-tarjeta p-4";

export default async function DetalleVuelta({ params }: PageProps<"/admin/vueltas/[id]">) {
  await exigirRol("admin");
  const { id } = await params;
  const [vuelta, conductores] = await Promise.all([detalleVuelta(id), listarConductores()]);
  if (!vuelta) notFound();

  const permitido = accionesAdmin(vuelta.estado);

  return (
    <section className="flex flex-col gap-6">
      <Link href="/admin/vueltas" className="text-sm text-marca underline">← Vueltas</Link>

      <div className={tarjeta}>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="titulo-pagina">Vuelta del {fechaCorta(vuelta.fecha_inicio)}</h1>
          <span className="neu-chip px-2 text-xs">{ETIQUETA_ESTADO[vuelta.estado]}</span>
          {vuelta.tipo === "varada" && (
            <span className="rounded-full bg-aviso px-2 text-xs font-semibold text-superficie">Varada</span>
          )}
        </div>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm @xl:grid-cols-2 @4xl:grid-cols-3">
          <Dato termino="Buseta" valor={vuelta.placa ?? "—"} />
          <Dato termino="Tipo" valor={ETIQUETA_TIPO[vuelta.tipo]} />
          <Dato termino="Conductor Florencia" valor={vuelta.conductorFlorencia ?? "Sin asignar"} />
          <Dato termino="Conductor Pitalito" valor={vuelta.conductorPitalito ?? "Sin asignar"} />
          <Dato termino="Creada por" valor={`${vuelta.registradoPor} · ${formatearFechaHora(vuelta.ocurrido_en)}`} />
          {vuelta.actualizado_en && vuelta.actualizadoPor && (
            <Dato termino="Última modificación" valor={`${vuelta.actualizadoPor} · ${formatearFechaHora(vuelta.actualizado_en)}`} />
          )}
        </dl>
        {vuelta.tipo === "varada" && (
          <p className="text-sm text-aviso">Varada: se registra para el historial y queda toda en $0 (sin gastos ni ganancias).</p>
        )}
        {vuelta.notas && <p className="text-sm text-texto-suave">Notas: {vuelta.notas}</p>}
        {vuelta.estado === "cerrada" && <p className="text-sm text-texto-suave">Vuelta cerrada: solo lectura.</p>}

        {/* Botones en fila; el formulario que se abre ocupa toda la fila. */}
        <div className="flex flex-wrap items-start gap-3 [&>form]:basis-full [&>div:has(>.neu-pozo)]:basis-full">
          {permitido.editar && (
            <EditarVuelta
              vuelta={{
                id: vuelta.id,
                tipo: vuelta.tipo,
                conductor_florencia_id: vuelta.conductor_florencia_id,
                conductor_pitalito_id: vuelta.conductor_pitalito_id,
              }}
              conductores={conductores}
            />
          )}
          {permitido.reabrir && <ReabrirVuelta id={vuelta.id} />}
          {permitido.reabrirCerrada && <ReabrirCerrada id={vuelta.id} />}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Ingresos ingresos={vuelta.ingresos} varada={vuelta.tipo === "varada"} />
        <Liquidacion dinero={vuelta.dinero} varada={vuelta.tipo === "varada"} puedeCerrar={permitido.cerrar} id={vuelta.id} />
        {vuelta.tipo === "completa" && (
          <GastosFijos fijos={vuelta.gastosFijos} editable={permitido.editar} />
        )}
        <GastosVariables gastos={vuelta.gastosVariables} editable={permitido.editar} varada={vuelta.tipo === "varada"} />
      </div>
      <CierresReemplazados cierres={vuelta.cierresReemplazados} />

      {vuelta.faltan.map((sentido) => (
        <p key={sentido} className={`${tarjeta} text-aviso`}>
          {sentido === "ida" ? "La ida" : "El regreso"} no se ha registrado.
        </p>
      ))}
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {vuelta.ida && <Trayecto trayecto={vuelta.ida} editable={permitido.editar} />}
        {vuelta.regreso && <Trayecto trayecto={vuelta.regreso} editable={permitido.editar} />}
      </div>
    </section>
  );
}

function Dato({ termino, valor }: { termino: string; valor: string }) {
  return (
    <div className="flex gap-1">
      <dt className="shrink-0 text-texto-suave">{termino}:</dt>
      <dd>{valor}</dd>
    </div>
  );
}

function Trayecto({ trayecto: t, editable }: { trayecto: TrayectoDetalle; editable: boolean }) {
  return (
    <div className={tarjeta}>
      <div className="flex flex-col gap-0.5">
        <h2 className="text-lg font-semibold">
          {t.sentido === "ida" ? "Ida" : "Regreso"} · {fechaCorta(t.fecha)}
          {t.hora_salida && ` · ${t.hora_salida.slice(0, 5)}`}
        </h2>
        <span className="text-xs text-texto-suave">
          Abierto por {t.registradoPor} · {formatearFechaHora(t.ocurrido_en)}
        </span>
        {t.terminal_fin && <span className="text-sm text-aviso">Terminó en {TERMINALES[t.terminal_fin]} (varada)</span>}
      </div>

      <ul className="flex flex-col gap-2">
        {t.terminales.map((terminal) => (
          <Terminal key={terminal.codigo} terminal={terminal} editable={editable} />
        ))}
      </ul>

      <Polilla trayecto={t} editable={editable} />

      {t.anuladas.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-texto-suave">Planillas eliminadas ({t.anuladas.length})</summary>
          <ul className="mt-2 flex flex-col gap-2">
            {t.anuladas.map((p) => (
              <li key={p.id} className="neu-pozo p-3 opacity-80">
                <span className="font-medium">{TERMINALES[p.terminal]}</span>: {resumenPlanilla(p)}
                <br />
                <span className="text-texto-suave">Motivo: {p.motivo_anulacion}</span>
                <Autoria planilla={p} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function resumenPlanilla(p: PlanillaDetalle): string {
  if (!p.emitida) return `Sin planilla (${p.motivo_sin_planilla})`;
  const extra = [p.numero && `N.º ${p.numero}`, p.pasajeros != null && `${p.pasajeros} pasajeros`].filter(Boolean);
  return [`Neto ${formatearPesos(p.neto ?? 0)}`, ...extra].join(" · ");
}

function Terminal({ terminal, editable }: { terminal: TerminalConPlanilla<PlanillaDetalle>; editable: boolean }) {
  const p = terminal.planilla;
  return (
    <li className="flex flex-col gap-1 neu-pozo p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{TERMINALES[terminal.codigo]}</span>
        {terminal.estado === "pendiente" && <span className="text-sm text-aviso">Falta registrar</span>}
        {terminal.estado === "sin_planilla" && <span className="text-sm text-texto-suave">Sin planilla</span>}
        {terminal.estado === "registrada" && p && (
          <span className="monto text-sm font-semibold">{formatearPesos(p.neto ?? 0)}</span>
        )}
      </div>

      {p && (
        <>
          {p.emitida ? (
            <span className="text-sm text-texto-suave">
              {[p.numero && `Planilla N.º ${p.numero}`, p.pasajeros != null && `${p.pasajeros} pasajeros`]
                .filter(Boolean)
                .join(" · ") || "Sin número ni pasajeros"}
            </span>
          ) : (
            <span className="text-sm">Motivo: {p.motivo_sin_planilla}</span>
          )}
          {p.fotoUrl && (
            <a href={p.fotoUrl} target="_blank" rel="noopener noreferrer" className="w-fit">
              {/* URL firmada de corta duración; next/image no aplica a URLs temporales. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.fotoUrl} alt={`Foto de la planilla de ${TERMINALES[p.terminal]}`} className="max-h-48 neu-foto" />
            </a>
          )}
          <Autoria planilla={p} />
          {editable && <AccionesPlanilla planilla={p} />}
        </>
      )}
    </li>
  );
}

function Autoria({ planilla: p }: { planilla: PlanillaDetalle }) {
  return (
    <span className="text-xs text-texto-suave">
      Registró {p.registradoPor} · {formatearFechaHora(p.ocurrido_en)} (llegó {formatearFechaHora(p.sincronizado_en)})
      {p.horaSospechosa && <strong className="text-aviso"> · revisar hora</strong>}
      {p.actualizadoPor && p.actualizado_en && ` · Corrigió ${p.actualizadoPor} · ${formatearFechaHora(p.actualizado_en)}`}
    </span>
  );
}

function Ingresos({ ingresos, varada }: { ingresos: IngresosVuelta | null; varada: boolean }) {
  if (!ingresos) return null;
  const fila = (termino: string, valor: number, fuerte = false) => (
    <div className="flex justify-between gap-2">
      <dt className={fuerte ? "font-semibold" : "text-texto-suave"}>{termino}</dt>
      <dd className={`monto ${fuerte ? "font-semibold" : ""}`}>{formatearPesos(valor)}</dd>
    </div>
  );
  return (
    <div className={tarjeta}>
      <h2 className="text-lg font-semibold">Ingresos</h2>
      {varada && <p className="text-sm text-aviso">Varada: no se liquida, todo queda en $0.</p>}
      <dl className="flex flex-col gap-1 text-sm">
        {fila("Planillas (neto)", ingresos.planillas)}
        {fila("Polilla (sobrantes a la caja)", ingresos.polilla)}
        {fila("Encomiendas", ingresos.encomiendas)}
        {fila("Ingreso real", ingresos.ingresoReal, true)}
      </dl>
      <p className="monto text-sm">
        Se quedó el conductor: <strong>{formatearPesos(ingresos.quedoConductor)}</strong>{" "}
        <span className="text-texto-suave">(no suma al ingreso)</span>
      </p>
    </div>
  );
}

const nombreTramo = (id: string) => {
  const t = buscarTramo(id);
  return t ? `${TERMINALES[t.origen]} → ${TERMINALES[t.destino]}` : id;
};

function Polilla({ trayecto: t, editable }: { trayecto: TrayectoDetalle; editable: boolean }) {
  const pasajeros = t.pasajeros.filter((p) => p.estado === "activo");
  const encomiendas = t.encomiendas.filter((e) => e.estado === "activa");
  const eliminados = [
    ...t.pasajeros.filter((p) => p.estado === "anulado"),
    ...t.encomiendas.filter((e) => e.estado === "anulada"),
  ];
  return (
    <div className="flex flex-col gap-2 border-t border-borde pt-3">
      <h3 className="font-semibold">Polilla</h3>
      {pasajeros.length === 0 && encomiendas.length === 0 && (
        <p className="text-sm text-texto-suave">Sin pasajeros de vía ni encomiendas.</p>
      )}
      <ul className="flex flex-col gap-2">
        {pasajeros.map((p) => (
          <li key={p.id} className="flex flex-col gap-1 neu-pozo p-3">
            <Pasajero pasajero={p} />
            <AutoriaRegistro registro={p} />
            {editable && <EliminarDePolilla tipo="pasajero" id={p.id} />}
          </li>
        ))}
        {encomiendas.map((e) => (
          <li key={e.id} className="flex flex-col gap-1 neu-pozo p-3">
            <Encomienda encomienda={e} />
            <AutoriaRegistro registro={e} />
            {editable && <EliminarDePolilla tipo="encomienda" id={e.id} />}
          </li>
        ))}
      </ul>
      {eliminados.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-texto-suave">Eliminados ({eliminados.length})</summary>
          <ul className="mt-2 flex flex-col gap-2">
            {eliminados.map((r) => (
              <li key={r.id} className="neu-pozo p-3 opacity-80">
                {"tramo_id" in r ? <Pasajero pasajero={r} /> : <Encomienda encomienda={r} />}
                <span className="text-texto-suave">Motivo: {r.motivo_anulacion}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function Pasajero({ pasajero: p }: { pasajero: PasajeroDetalle }) {
  return (
    <div className="flex flex-col gap-0.5 text-sm">
      <span className="font-medium">
        Pasajero · {nombreTramo(p.tramo_id)} · va a {TERMINALES[p.destino]}
      </span>
      <span className="monto">
        Cobró {formatearPesos(p.monto_cobrado)}
        {p.facturado && p.terminal_facturacion
          ? ` · facturó ${formatearPesos(p.monto_facturado)} en ${TERMINALES[p.terminal_facturacion]}`
          : " · no pasó por terminal"}
        {" · "}sobrante {formatearPesos(p.sobrante)}{" "}
        {p.destino_sobrante === "polilla" ? (
          <span>a la caja</span>
        ) : (
          <strong className="text-aviso">se lo quedó el conductor</strong>
        )}
      </span>
    </div>
  );
}

function Encomienda({ encomienda: e }: { encomienda: EncomiendaDetalle }) {
  const donde = e.recibida_en_terminal
    ? `en ${TERMINALES[e.recibida_en_terminal]}`
    : `en la vía (${nombreTramo(e.recibida_en_tramo ?? "")})`;
  return (
    <div className="flex flex-col gap-0.5 text-sm">
      <span className="font-medium">
        Encomienda a {TERMINALES[e.destino]}
        {e.descripcion ? ` · ${e.descripcion}` : ""}
      </span>
      <span className="monto">
        {formatearPesos(e.monto)} neto · recibida {donde}
      </span>
    </div>
  );
}

function AutoriaRegistro({
  registro: r,
}: {
  registro: {
    registradoPor: string;
    ocurrido_en: string;
    sincronizado_en: string;
    horaSospechosa: boolean;
    actualizadoPor: string | null;
    actualizado_en: string | null;
  };
}) {
  return (
    <span className="text-xs text-texto-suave">
      Registró {r.registradoPor} · {formatearFechaHora(r.ocurrido_en)} (llegó {formatearFechaHora(r.sincronizado_en)})
      {r.horaSospechosa && <strong className="text-aviso"> · revisar hora</strong>}
      {r.actualizadoPor && r.actualizado_en && ` · Corrigió ${r.actualizadoPor} · ${formatearFechaHora(r.actualizado_en)}`}
    </span>
  );
}

function Liquidacion({
  dinero,
  varada,
  puedeCerrar,
  id,
}: {
  dinero: ResumenDinero | null;
  varada: boolean;
  puedeCerrar: boolean;
  id: string;
}) {
  if (!dinero) return null;
  if (varada) {
    return (
      <div className={tarjeta}>
        <h2 className="text-lg font-semibold">Liquidación</h2>
        <p className="text-sm text-aviso">Varada: no se liquida. Todo queda en $0.</p>
        {puedeCerrar && <CerrarVuelta id={id} efectivoEsperado={0} />}
      </div>
    );
  }
  const fila = (termino: string, valor: number, clase = "") => (
    <div className="flex justify-between gap-2">
      <dt className="text-texto-suave">{termino}</dt>
      <dd className={`monto ${clase}`}>{formatearPesos(valor)}</dd>
    </div>
  );
  const gana = dinero.liquidacion >= 0;
  const dif = dinero.diferenciaCuadre;
  return (
    <div className={tarjeta}>
      <h2 className="text-lg font-semibold">Liquidación</h2>
      <dl className="flex flex-col gap-1 text-sm">
        {fila("Ingreso real", dinero.ingresoReal)}
        {fila("Gastos fijos", dinero.gastosFijos)}
        {fila("Gastos variables (ACPM, ligas, otros)", dinero.gastosVariables)}
        {fila("Gastos mínimos", dinero.gastosMinimos)}
        <div className="flex justify-between gap-2 border-t border-borde pt-1 font-semibold">
          <dt>{gana ? "Ganancia" : "Pérdida"}</dt>
          <dd className={`monto ${gana ? "text-ganancia" : "text-perdida"}`}>{formatearPesos(Math.abs(dinero.liquidacion))}</dd>
        </div>
      </dl>

      <h3 className="mt-2 font-semibold">Cuadre de caja</h3>
      <dl className="flex flex-col gap-1 text-sm">
        {fila("Efectivo esperado", dinero.efectivoEsperado)}
        {dinero.efectivoEntregado !== null && fila("Efectivo entregado", dinero.efectivoEntregado)}
        {dif !== null && (
          <div className="flex justify-between gap-2 font-semibold">
            <dt>Diferencia</dt>
            <dd className={`monto ${dif < 0 ? "text-perdida" : dif > 0 ? "text-aviso" : "text-ganancia"}`}>
              {dif < 0 ? `Faltan ${formatearPesos(-dif)}` : dif > 0 ? `Sobran ${formatearPesos(dif)}` : "Cuadra"}
            </dd>
          </div>
        )}
      </dl>
      {dinero.cerradoEn && <p className="text-xs text-texto-suave">Cerrada el {formatearFechaHora(dinero.cerradoEn)}</p>}
      {puedeCerrar && <CerrarVuelta id={id} efectivoEsperado={dinero.efectivoEsperado} />}
    </div>
  );
}

function GastosFijos({ fijos, editable }: { fijos: GastoFijoVuelta[]; editable: boolean }) {
  return (
    <div className={tarjeta}>
      <h2 className="text-lg font-semibold">Gastos fijos de la vuelta</h2>
      {fijos.length === 0 ? (
        <p className="text-sm text-texto-suave">Esta vuelta no tiene gastos fijos cargados.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {fijos.map((f) => (
            <li key={f.id} className="flex flex-col gap-1 neu-pozo p-3">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium">
                  {f.concepto}
                  {!f.sePagaEnRuta && <span className="text-texto-suave"> · lo paga el dueño</span>}
                </span>
                <span className="monto">{formatearPesos(f.valor)}</span>
              </div>
              {f.actualizado_en && f.actualizadoPor && (
                <span className="text-xs text-texto-suave">
                  Ajustado por {f.actualizadoPor} · {formatearFechaHora(f.actualizado_en)}
                </span>
              )}
              {editable && <AjustarGastoFijo id={f.id} concepto={f.concepto} valor={f.valor} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const ETIQUETA_GASTO = { acpm: "ACPM", liga: "Liga", extra: "Otro gasto", arreglo: "Arreglo en ruta" } as const;

function detalleGasto(g: GastoVariableDetalle): string {
  return [
    g.tipo === "liga" && g.terminal ? `en ${TERMINALES[g.terminal]}` : null,
    g.galones != null ? `${g.galones} galones` : null,
    g.lugar,
    g.descripcion,
  ]
    .filter(Boolean)
    .join(" · ");
}

function GastosVariables({ gastos, editable, varada }: { gastos: GastoVariableDetalle[]; editable: boolean; varada: boolean }) {
  const activos = gastos.filter((g) => g.estado === "activo");
  const eliminados = gastos.filter((g) => g.estado === "anulado");
  return (
    <div className={tarjeta}>
      <h2 className="text-lg font-semibold">Gastos variables</h2>
      {varada && activos.length > 0 && <p className="text-sm text-aviso">Varada: estos gastos no cuentan, la vuelta queda en $0.</p>}
      {activos.length === 0 && <p className="text-sm text-texto-suave">Sin gastos variables.</p>}
      <ul className="flex flex-col gap-2">
        {activos.map((g) => (
          <li key={g.id} className="flex flex-col gap-1 neu-pozo p-3">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium">
                {ETIQUETA_GASTO[g.tipo]}
                {detalleGasto(g) && <span className="font-normal text-texto-suave"> · {detalleGasto(g)}</span>}
              </span>
              <span className="monto">{formatearPesos(g.monto)}</span>
            </div>
            {g.fotoUrl && (
              <a href={g.fotoUrl} target="_blank" rel="noopener noreferrer" className="w-fit">
                {/* URL firmada de corta duración; next/image no aplica a URLs temporales. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.fotoUrl} alt={`Recibo de ${ETIQUETA_GASTO[g.tipo]}`} className="max-h-48 neu-foto" />
              </a>
            )}
            <AutoriaRegistro registro={g} />
            {editable && <EliminarGasto id={g.id} />}
          </li>
        ))}
      </ul>
      {eliminados.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-texto-suave">Eliminados ({eliminados.length})</summary>
          <ul className="mt-2 flex flex-col gap-2">
            {eliminados.map((g) => (
              <li key={g.id} className="neu-pozo p-3 opacity-80">
                {ETIQUETA_GASTO[g.tipo]} · <span className="monto">{formatearPesos(g.monto)}</span>
                <br />
                <span className="text-texto-suave">Motivo: {g.motivo_anulacion}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function CierresReemplazados({ cierres }: { cierres: CierreReemplazado[] }) {
  if (cierres.length === 0) return null;
  return (
    <details className={`${tarjeta} text-sm`}>
      <summary className="cursor-pointer text-texto-suave">Cierres anteriores reemplazados ({cierres.length})</summary>
      <ul className="mt-2 flex flex-col gap-2">
        {cierres.map((c) => (
          <li key={c.reabiertoEn} className="neu-pozo p-3">
            Entregado <span className="monto">{formatearPesos(c.efectivoEntregado)}</span>
            {c.cerradoEn && ` · cerrada ${formatearFechaHora(c.cerradoEn)}`}
            <br />
            <span className="text-texto-suave">
              Reabierta por {c.reabiertoPor} · {formatearFechaHora(c.reabiertoEn)} · Motivo: {c.motivo}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
