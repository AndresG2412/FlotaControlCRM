import Link from "next/link";
import { notFound } from "next/navigation";
import {
  detalleVuelta,
  listarConductores,
  type PlanillaDetalle,
  type TrayectoDetalle,
} from "@/lib/admin/vueltas";
import { exigirRol } from "@/lib/auth/sesion";
import { formatearPesos } from "@/lib/dominio/dinero";
import { formatearFechaHora } from "@/lib/dominio/fechas";
import type { TerminalConPlanilla } from "@/lib/dominio/planillas";
import { TERMINALES } from "@/lib/dominio/ruta";
import { accionesAdmin } from "@/lib/dominio/vuelta";
import { ETIQUETA_ESTADO, ETIQUETA_TIPO, fechaCorta } from "../etiquetas";
import { AccionesPlanilla, EditarVuelta, ReabrirVuelta } from "./controles";

export const metadata = { title: "Detalle de vuelta" };

// Diseño provisional. Aquí no hay totales de dinero: son del paso 5.
const tarjeta = "flex flex-col gap-3 rounded-2xl border border-borde bg-superficie p-4";

export default async function DetalleVuelta({ params }: PageProps<"/admin/vueltas/[id]">) {
  await exigirRol("admin");
  const { id } = await params;
  const [vuelta, conductores] = await Promise.all([detalleVuelta(id), listarConductores()]);
  if (!vuelta) notFound();

  const permitido = accionesAdmin(vuelta.estado);

  return (
    <section className="flex flex-col gap-4">
      <Link href="/admin/vueltas" className="text-sm text-marca underline">← Vueltas</Link>

      <div className={tarjeta}>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold">Vuelta del {fechaCorta(vuelta.fecha_inicio)}</h1>
          <span className="rounded-full border border-borde px-2 text-xs">{ETIQUETA_ESTADO[vuelta.estado]}</span>
          {vuelta.tipo === "varada" && (
            <span className="rounded-full bg-aviso px-2 text-xs font-semibold text-superficie">Varada</span>
          )}
        </div>
        <dl className="grid gap-1 text-sm sm:grid-cols-2">
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
      </div>

      {vuelta.faltan.map((sentido) => (
        <p key={sentido} className={`${tarjeta} text-aviso`}>
          {sentido === "ida" ? "La ida" : "El regreso"} no se ha registrado.
        </p>
      ))}
      {vuelta.ida && <Trayecto trayecto={vuelta.ida} editable={permitido.editar} />}
      {vuelta.regreso && <Trayecto trayecto={vuelta.regreso} editable={permitido.editar} />}
    </section>
  );
}

function Dato({ termino, valor }: { termino: string; valor: string }) {
  return (
    <div className="flex gap-1">
      <dt className="text-texto-suave">{termino}:</dt>
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

      {t.anuladas.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-texto-suave">Planillas eliminadas ({t.anuladas.length})</summary>
          <ul className="mt-2 flex flex-col gap-2">
            {t.anuladas.map((p) => (
              <li key={p.id} className="rounded-xl border border-borde p-3 opacity-80">
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
    <li className="flex flex-col gap-1 rounded-xl border border-borde p-3">
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
              <img src={p.fotoUrl} alt={`Foto de la planilla de ${TERMINALES[p.terminal]}`} className="max-h-48 rounded-lg border border-borde" />
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
