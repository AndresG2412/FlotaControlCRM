import { ChevronDown } from "lucide-react";
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
import { fechaNumerica, formatearFechaHora } from "@/lib/dominio/fechas";
import { ingresoDeTrayecto } from "@/lib/dominio/liquidacion";
import type { TerminalConPlanilla } from "@/lib/dominio/planillas";
import { buscarTramo, TERMINALES, type Sentido } from "@/lib/dominio/ruta";
import { accionesAdmin } from "@/lib/dominio/vuelta";
import { ETIQUETA_ESTADO, ETIQUETA_TIPO } from "../etiquetas";
import { FinalizarVuelta } from "../finalizar";
import {
  AccionesPlanilla,
  AjustarGastoFijo,
  CerrarVuelta,
  EditarVuelta,
  EliminarDePolilla,
  EliminarGasto,
  GastosVariablesAdminControles,
  IniciarTrayecto,
  PolillaAdminControles,
  ReabrirCerrada,
  ReabrirVuelta,
  RegistrarPlanilla,
} from "./controles";

export const metadata = { title: "Detalle de vuelta" };

// Diseño provisional. Todo el dinero (ingresos, gastos, liquidación y cuadre) se lee
// de reporte_vueltas: aquí no se recalcula.
const tarjeta = "flex flex-col gap-3 neu-tarjeta p-4";

export default async function DetalleVuelta({ params }: PageProps<"/admin/vueltas/[id]">) {
  const perfil = await exigirRol("admin");
  const { id } = await params;
  const [vuelta, conductores] = await Promise.all([detalleVuelta(id), listarConductores()]);
  if (!vuelta) notFound();

  const permitido = accionesAdmin(vuelta.estado);
  const trayectoId = vuelta.regreso?.id ?? vuelta.ida?.id ?? null;

  const sentidoActual = vuelta.estado === "en_curso" ? (vuelta.regreso ? "regreso" : "ida") : null;
  const trayectos = [
    { sentido: "ida" as const, trayecto: vuelta.ida },
    { sentido: "regreso" as const, trayecto: vuelta.regreso },
  ];

  return (
    <section className="flex flex-col gap-5">
      <Link href="/admin/vueltas" className="w-fit text-marca underline">← Vueltas</Link>

      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="titulo-pagina">Vuelta del {fechaNumerica(vuelta.fecha_inicio)}</h1>
          <span className="neu-chip px-3 text-sm font-semibold">{ETIQUETA_ESTADO[vuelta.estado]}</span>
          {vuelta.tipo === "varada" && (
            <span className="rounded-full bg-aviso px-3 text-sm font-bold text-superficie">Varada</span>
          )}
        </div>
        {vuelta.tipo === "varada" && <p className="text-aviso">Varada: queda para el historial, toda en $0.</p>}
        {vuelta.estado === "cerrada" && <p className="text-texto-suave">Vuelta cerrada: solo lectura.</p>}
      </header>

      {/* 1. Lo que se registra: ida y regreso primero. */}
      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        {trayectos.map(({ sentido, trayecto }) =>
          trayecto ? (
            <Trayecto key={sentido} trayecto={trayecto} varada={vuelta.tipo === "varada"} editable={permitido.editar} uid={perfil.id} abierto={sentido === sentidoActual} />
          ) : sentido === "regreso" && !vuelta.ida && vuelta.faltan.includes(sentido) ? (
            <div key={sentido} className={`${tarjeta} opacity-70`}>
              <h2 className="text-lg font-bold">Regreso</h2>
              <p className="text-texto-suave">Primero hay que iniciar la ida.</p>
              <button type="button" disabled className="h-10 w-fit neu-boton px-4 text-sm">Iniciar regreso (Cali → Florencia)</button>
            </div>
          ) : vuelta.faltan.includes(sentido) ? (
            <div key={sentido} className={tarjeta}>
              <h2 className="text-lg font-bold">{sentido === "ida" ? "Ida" : "Regreso"}</h2>
              <p className="text-texto-suave">Todavía no se ha registrado.</p>
              {permitido.editar && <IniciarTrayecto vueltaId={vuelta.id} sentido={sentido} />}
            </div>
          ) : null,
        )}
      </div>

      {/* 2. El dinero, resumido: se abre solo lo que se quiera revisar. */}
      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <Ingresos ingresos={vuelta.ingresos} varada={vuelta.tipo === "varada"} />
        {vuelta.tipo === "completa" && (
          <GastosFijos fijos={vuelta.gastosFijos} total={vuelta.dinero?.gastosFijos ?? null} editable={permitido.editar} />
        )}
        <GastosVariables
          gastos={vuelta.gastosVariables}
          total={vuelta.dinero?.gastosVariables ?? null}
          vueltaId={vuelta.id}
          trayectoId={trayectoId}
          uid={perfil.id}
          editable={permitido.editar}
          varada={vuelta.tipo === "varada"}
        />
        <Acordeon titulo="Datos de la vuelta" resumen={vuelta.placa ?? undefined}>
          <dl className="flex flex-col gap-1">
            <Dato termino="Tipo" valor={ETIQUETA_TIPO[vuelta.tipo]} />
            <Dato termino="Conductor Florencia" valor={vuelta.conductorFlorencia ?? "Sin asignar"} />
            <Dato termino="Conductor Pitalito" valor={vuelta.conductorPitalito ?? "Sin asignar"} />
            <Dato termino="Creada por" valor={`${vuelta.registradoPor} · ${formatearFechaHora(vuelta.ocurrido_en)}`} />
            {vuelta.actualizado_en && vuelta.actualizadoPor && (
              <Dato termino="Última modificación" valor={`${vuelta.actualizadoPor} · ${formatearFechaHora(vuelta.actualizado_en)}`} />
            )}
          </dl>
          {vuelta.notas && <p>Notas: {vuelta.notas}</p>}
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
        </Acordeon>
      </div>

      {/* 3. El resultado y las acciones que terminan la vuelta, al final. */}
      <Liquidacion
        dinero={vuelta.dinero}
        varada={vuelta.tipo === "varada"}
        enCurso={vuelta.estado === "en_curso"}
        puedeCerrar={permitido.cerrar}
        id={vuelta.id}
      >
        {permitido.finalizar && <FinalizarVuelta id={vuelta.id} />}
        {permitido.reabrir && <ReabrirVuelta id={vuelta.id} />}
        {permitido.reabrirCerrada && <ReabrirCerrada id={vuelta.id} />}
      </Liquidacion>
      <CierresReemplazados cierres={vuelta.cierresReemplazados} />
    </section>
  );
}

/** Tarjeta plegable: la fila entera abre y cierra; a la derecha va el dato que la resume. */
function Acordeon({
  titulo,
  subtitulo,
  resumen,
  abierto = false,
  children,
}: {
  titulo: string;
  subtitulo?: React.ReactNode;
  resumen?: React.ReactNode;
  abierto?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="acordeon neu-tarjeta" open={abierto}>
      <summary>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-lg font-bold">{titulo}</span>
          {subtitulo && <span className="text-sm text-texto-suave">{subtitulo}</span>}
        </span>
        {resumen !== undefined && <span className="monto shrink-0 text-right text-lg font-bold">{resumen}</span>}
        <ChevronDown className="acordeon-flecha size-6" aria-hidden />
      </summary>
      <div className="flex flex-col gap-3 px-4 pb-4">{children}</div>
    </details>
  );
}

function Dato({ termino, valor }: { termino: string; valor: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-sm text-texto-suave">{termino}</dt>
      <dd className="font-semibold">{valor}</dd>
    </div>
  );
}

function Trayecto({
  trayecto: t,
  varada,
  editable,
  uid,
  abierto,
}: {
  trayecto: TrayectoDetalle;
  varada: boolean;
  editable: boolean;
  uid: string;
  abierto: boolean;
}) {
  const pendientes = t.terminales.filter((x) => x.estado === "pendiente").length;
  const total = ingresoDeTrayecto({
    netosPlanillas: t.terminales.flatMap((x) => (x.planilla?.neto != null ? [x.planilla.neto] : [])),
    pasajerosPolilla: t.pasajeros
      .filter((p) => p.estado === "activo")
      .map((p) => ({ montoCobrado: p.monto_cobrado, montoFacturado: p.monto_facturado, destinoSobrante: p.destino_sobrante })),
    encomiendas: t.encomiendas.filter((e) => e.estado === "activa").map((e) => e.monto),
  });
  return (
    <Acordeon
      titulo={t.sentido === "ida" ? "Ida" : "Regreso"}
      subtitulo={
        <>
          {fechaNumerica(t.fecha)}
          {t.hora_salida && ` · ${t.hora_salida.slice(0, 5)}`} ·{" "}
          {pendientes > 0 ? (
            <span className="font-semibold text-aviso">Faltan {pendientes}</span>
          ) : (
            <span className="font-semibold text-ganancia">Completo</span>
          )}
        </>
      }
      // Una varada queda toda en $0: no se muestra un total que no va a contar.
      resumen={varada ? undefined : formatearPesos(total)}
      abierto={abierto}
    >
      {t.terminal_fin && <p className="text-aviso">Terminó en {TERMINALES[t.terminal_fin]} (varada)</p>}

      <ul className="flex flex-col gap-2">
        {t.terminales.map((terminal) => (
          <Terminal
            key={terminal.codigo}
            terminal={terminal}
            trayectoId={t.id}
            sentido={t.sentido}
            editable={editable}
            uid={uid}
          />
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
    </Acordeon>
  );
}

function resumenPlanilla(p: PlanillaDetalle): string {
  if (!p.emitida) return `Sin planilla (${p.motivo_sin_planilla})`;
  const extra = [p.numero && `N.º ${p.numero}`, p.pasajeros != null && `${p.pasajeros} pasajeros`].filter(Boolean);
  return [`Neto ${formatearPesos(p.neto ?? 0)}`, ...extra].join(" · ");
}

function Terminal({
  terminal,
  trayectoId,
  sentido,
  editable,
  uid,
}: {
  terminal: TerminalConPlanilla<PlanillaDetalle>;
  trayectoId: string;
  sentido: Sentido;
  editable: boolean;
  uid: string;
}) {
  const p = terminal.planilla;
  return (
    <li className="flex flex-col gap-1 neu-pozo p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-lg font-bold">{TERMINALES[terminal.codigo]}</span>
        {terminal.estado === "pendiente" && <span className="font-semibold text-aviso">Falta registrar</span>}
        {terminal.estado === "sin_planilla" && <span className="text-sm text-texto-suave">Sin planilla</span>}
        {terminal.estado === "registrada" && p && (
          <span className="monto text-lg font-bold">{formatearPesos(p.neto ?? 0)}</span>
        )}
      </div>

      {terminal.estado === "pendiente" && editable && (
        <RegistrarPlanilla uid={uid} trayectoId={trayectoId} terminal={terminal.codigo} sentido={sentido} />
      )}

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
          {editable && <AccionesPlanilla planilla={p} uid={uid} />}
        </>
      )}
    </li>
  );
}

/** Sin señal puede llegar mucho después: solo entonces vale la pena decir cuándo llegó. */
const llegoDespues = (ocurrido: string, sincronizado: string) =>
  Math.abs(new Date(sincronizado).getTime() - new Date(ocurrido).getTime()) > 5 * 60_000;

function Autoria({ planilla: p }: { planilla: PlanillaDetalle }) {
  return (
    <span className="text-xs text-texto-suave">
      Registró {p.registradoPor} · {formatearFechaHora(p.ocurrido_en)}
      {llegoDespues(p.ocurrido_en, p.sincronizado_en) && ` · llegó ${formatearFechaHora(p.sincronizado_en)}`}
      {p.horaSospechosa && <strong className="text-aviso"> · revisar hora</strong>}
      {p.actualizadoPor && p.actualizado_en && ` · Corrigió ${p.actualizadoPor} · ${formatearFechaHora(p.actualizado_en)}`}
    </span>
  );
}

function Ingresos({ ingresos, varada }: { ingresos: IngresosVuelta | null; varada: boolean }) {
  if (!ingresos) return null;
  const fila = (termino: string, valor: number) => (
    <div className="flex justify-between gap-2">
      <dt>{termino}</dt>
      <dd className="monto font-semibold">{formatearPesos(valor)}</dd>
    </div>
  );
  return (
    <Acordeon titulo="Ingresos" resumen={formatearPesos(ingresos.ingresoReal)}>
      {varada && <p className="text-aviso">Varada: no se liquida, todo queda en $0.</p>}
      <dl className="flex flex-col gap-2">
        {fila("Planillas", ingresos.planillas)}
        {fila("Polilla", ingresos.polilla)}
        {fila("Encomiendas", ingresos.encomiendas)}
      </dl>
      {ingresos.quedoConductor > 0 && (
        <p className="monto text-texto-suave">
          Se quedó el conductor: <strong>{formatearPesos(ingresos.quedoConductor)}</strong> (no suma al ingreso)
        </p>
      )}
    </Acordeon>
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
      {editable && (
        <PolillaAdminControles trayectoId={t.id} sentido={t.sentido} />
      )}
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
  enCurso,
  puedeCerrar,
  id,
  children,
}: {
  dinero: ResumenDinero | null;
  varada: boolean;
  enCurso: boolean;
  puedeCerrar: boolean;
  id: string;
  children: React.ReactNode;
}) {
  const acciones = <div className="flex flex-wrap items-start gap-3 [&>div:has(>.neu-pozo)]:basis-full">{children}</div>;
  if (!dinero || varada) {
    return (
      <div className={tarjeta}>
        <h2 className="text-xl font-bold">Liquidación</h2>
        {varada && <p className="text-aviso">Varada: no se liquida. Todo queda en $0.</p>}
        {puedeCerrar && <CerrarVuelta id={id} efectivoEsperado={0} />}
        {acciones}
      </div>
    );
  }
  const fila = (termino: string, valor: number, clase = "") => (
    <div className={`flex justify-between gap-2 ${clase}`}>
      <dt>{termino}</dt>
      <dd className="monto font-semibold">{formatearPesos(valor)}</dd>
    </div>
  );
  const gana = dinero.liquidacion >= 0;
  const dif = dinero.diferenciaCuadre;
  return (
    <div className={`${tarjeta} gap-4`}>
      <h2 className="text-xl font-bold">Liquidación</h2>
      <div className="grid gap-5 @3xl:grid-cols-2">
        <dl className="flex flex-col gap-2">
          {fila("Ingreso real", dinero.ingresoReal)}
          {fila("Gastos fijos", dinero.gastosFijos)}
          {fila("Gastos variables", dinero.gastosVariables)}
          {fila("Total gastos", dinero.gastosMinimos, "border-t border-borde pt-2")}
        </dl>
        <dl className="flex flex-col gap-2">
          {fila("Efectivo esperado", dinero.efectivoEsperado)}
          {dinero.efectivoEntregado !== null && fila("Efectivo entregado", dinero.efectivoEntregado)}
          {dif !== null && (
            <div className="flex justify-between gap-2 font-bold">
              <dt>Diferencia</dt>
              <dd className={`monto ${dif < 0 ? "text-perdida" : dif > 0 ? "text-aviso" : "text-ganancia"}`}>
                {dif < 0 ? `Faltan ${formatearPesos(-dif)}` : dif > 0 ? `Sobran ${formatearPesos(dif)}` : "Cuadra"}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="flex flex-col neu-pozo p-4">
        <span className="font-semibold">{gana ? "Ganancia" : "Pérdida"}</span>
        <span className={`monto text-4xl font-bold ${gana ? "text-ganancia" : "text-perdida"}`}>
          {formatearPesos(Math.abs(dinero.liquidacion))}
        </span>
        {enCurso && <span className="text-sm text-texto-suave">La vuelta sigue en curso: este valor puede cambiar.</span>}
      </div>

      {dinero.cerradoEn && <p className="text-texto-suave">Cerrada el {formatearFechaHora(dinero.cerradoEn)}</p>}
      {puedeCerrar && <CerrarVuelta id={id} efectivoEsperado={dinero.efectivoEsperado} />}
      {acciones}
    </div>
  );
}

function GastosFijos({ fijos, total, editable }: { fijos: GastoFijoVuelta[]; total: number | null; editable: boolean }) {
  return (
    <Acordeon titulo="Gastos fijos" resumen={total !== null ? formatearPesos(total) : undefined}>
      {fijos.length === 0 ? (
        <p className="text-texto-suave">Esta vuelta no tiene gastos fijos cargados.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-borde">
          {fijos.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 [&>form]:basis-full">
              <span className="min-w-0 flex-1">
                {f.concepto}
                {!f.sePagaEnRuta && <span className="text-texto-suave"> · lo paga el dueño</span>}
              </span>
              <span className="monto font-semibold">{formatearPesos(f.valor)}</span>
              {editable && <AjustarGastoFijo id={f.id} concepto={f.concepto} valor={f.valor} />}
              {f.actualizado_en && f.actualizadoPor && (
                <span className="basis-full text-xs text-texto-suave">
                  Ajustado por {f.actualizadoPor} · {formatearFechaHora(f.actualizado_en)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Acordeon>
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

function GastosVariables({
  gastos,
  total,
  vueltaId,
  trayectoId,
  uid,
  editable,
  varada,
}: {
  gastos: GastoVariableDetalle[];
  total: number | null;
  vueltaId: string;
  trayectoId: string | null;
  uid: string;
  editable: boolean;
  varada: boolean;
}) {
  const activos = gastos.filter((g) => g.estado === "activo");
  const eliminados = gastos.filter((g) => g.estado === "anulado");
  return (
    <Acordeon
      titulo="Gastos variables"
      resumen={total !== null ? formatearPesos(total) : undefined}
    >
      {editable && (
        <GastosVariablesAdminControles uid={uid} vueltaId={vueltaId} trayectoId={trayectoId} />
      )}
      {varada && activos.length > 0 && <p className="text-sm text-aviso">Varada: estos gastos no cuentan, la vuelta queda en $0.</p>}
      {activos.length === 0 && <p className="text-sm text-texto-suave">Sin gastos variables.</p>}
      <ul className="flex flex-col gap-2">
        {activos.map((g) => (
          <li key={g.id} className="flex flex-col gap-1 neu-pozo p-3">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-semibold">
                {ETIQUETA_GASTO[g.tipo]}
                {detalleGasto(g) && <span className="font-medium text-texto-suave"> · {detalleGasto(g)}</span>}
              </span>
              <span className="monto font-semibold">{formatearPesos(g.monto)}</span>
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
    </Acordeon>
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
