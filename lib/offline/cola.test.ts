import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { anular, guardar, idsSinSincronizar, reintentarErrores, resumenCola, sincronizar, type Enviar } from "./cola";
import { crearBaseLocal, type BaseLocal } from "./db";
import type { Lote, ResultadoOperacion } from "./operaciones";

const ocurrido_en = "2026-10-12T14:30:00-05:00";
const buseta = "11111111-1111-4111-8111-111111111111";
const conductor = "22222222-2222-4222-8222-222222222222";

const vuelta = (id = crypto.randomUUID()) => ({
  id, ocurrido_en, buseta_id: buseta, tipo: "completa", fecha_inicio: "2026-10-12", conductor_florencia_id: conductor,
});
const trayecto = (vuelta_id: string) => ({
  id: crypto.randomUUID(), ocurrido_en, vuelta_id, sentido: "ida", fecha: "2026-10-12",
});
const gasto = (vuelta_id: string) => ({
  id: crypto.randomUUID(), ocurrido_en, vuelta_id, tipo: "acpm", monto: 400000,
});

/** Servidor falso: guarda lo recibido y responde con la regla que se le pase. */
function servidor(regla: (op: Lote["operaciones"][number]) => ResultadoOperacion = (o) => ({ clave: o.clave, ok: true })) {
  const recibido: Lote["operaciones"] = [];
  const enviar: Enviar = async (lote) => {
    recibido.push(...lote.operaciones);
    return lote.operaciones.map(regla);
  };
  return { enviar, recibido };
}

let db: BaseLocal;
beforeEach(() => {
  db = crearBaseLocal(`prueba-${crypto.randomUUID()}`);
});
afterEach(async () => {
  await db.delete();
});

describe("cola offline", () => {
  it("guarda sin señal y lo muestra como pendiente", async () => {
    const v = vuelta();
    await guardar(db, "vueltas", v);
    await guardar(db, "gastos_variables", gasto(v.id));
    expect(await resumenCola(db)).toEqual({ pendientes: 2, errores: 0, fotos: 0 });
    expect((await idsSinSincronizar(db)).has(v.id)).toBe(true);
    expect(await db.registros.get(v.id)).toMatchObject({ tabla: "vueltas", anulado: false });
  });

  it("no encola datos inválidos (el formulario muestra el error)", async () => {
    await expect(guardar(db, "gastos_variables", { ...gasto(crypto.randomUUID()), monto: 1.5 })).rejects.toThrow();
    expect((await resumenCola(db)).pendientes).toBe(0);
  });

  it("envía en orden y vacía la cola al confirmar", async () => {
    const v = vuelta();
    await guardar(db, "vueltas", v);
    await guardar(db, "trayectos", trayecto(v.id));
    const { enviar, recibido } = servidor();
    const r = await sincronizar(db, enviar);
    expect(r).toMatchObject({ confirmadas: 2, errores: 0, sinConexion: false });
    expect(recibido.map((o) => o.operacion.tipo === "guardar" && o.operacion.tabla)).toEqual(["vueltas", "trayectos"]);
    expect((await resumenCola(db)).pendientes).toBe(0);
    // El registro local se conserva para verlo sin señal.
    expect(await db.registros.get(v.id)).toBeDefined();
  });

  it("sin señal no pierde nada", async () => {
    await guardar(db, "vueltas", vuelta());
    const r = await sincronizar(db, async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(r.sinConexion).toBe(true);
    expect(await resumenCola(db)).toMatchObject({ pendientes: 1, errores: 0 });
  });

  it("un rechazo definitivo queda en error, visible, y se puede reintentar", async () => {
    await guardar(db, "vueltas", vuelta());
    const { enviar } = servidor((o) => ({ clave: o.clave, ok: false, codigo: "sin_permiso", mensaje: "RLS" }));
    expect((await sincronizar(db, enviar)).errores).toBe(1);
    expect(await resumenCola(db)).toMatchObject({ pendientes: 0, errores: 1 });
    await reintentarErrores(db);
    expect(await resumenCola(db)).toMatchObject({ pendientes: 1, errores: 0 });
  });

  it("un fallo temporal detiene el envío para no romper el orden", async () => {
    const v = vuelta();
    await guardar(db, "vueltas", v);
    await guardar(db, "trayectos", trayecto(v.id));
    const { enviar } = servidor((o) =>
      o.operacion.tipo === "guardar" && o.operacion.tabla === "vueltas"
        ? { clave: o.clave, ok: false, codigo: "error_servidor", mensaje: "timeout" }
        : { clave: o.clave, ok: false, codigo: "no_procesado", mensaje: "detenido" },
    );
    const r = await sincronizar(db, enviar);
    expect(r.sinConexion).toBe(true);
    expect(await resumenCola(db)).toMatchObject({ pendientes: 2, errores: 0 });
  });

  it("si otro conductor ya abrió la vuelta, se fusiona con la del servidor", async () => {
    const local = vuelta();
    const delServidor = crypto.randomUUID();
    await guardar(db, "vueltas", local);
    const g = gasto(local.id);
    await guardar(db, "gastos_variables", g);

    // Como el servidor real: tras vuelta_en_curso no procesa el resto del lote.
    const recibido: Lote["operaciones"] = [];
    const enviar: Enviar = async (lote) => {
      recibido.push(...lote.operaciones);
      let detenido = false;
      return lote.operaciones.map((o): ResultadoOperacion => {
        if (detenido) return { clave: o.clave, ok: false, codigo: "no_procesado", mensaje: "detenido" };
        if (o.operacion.tipo === "guardar" && o.operacion.tabla === "vueltas") {
          detenido = true;
          return { clave: o.clave, ok: false, codigo: "vuelta_en_curso", mensaje: "ya hay una", vueltaEnCursoId: delServidor };
        }
        return { clave: o.clave, ok: true };
      });
    };
    const r = await sincronizar(db, enviar);

    expect(r.errores).toBe(0);
    expect(await resumenCola(db)).toMatchObject({ pendientes: 0, errores: 0 });
    const gastoEnviado = recibido.filter((o) => o.operacion.tipo === "guardar" && o.operacion.tabla === "gastos_variables").at(-1);
    expect(gastoEnviado?.operacion.tipo === "guardar" && gastoEnviado.operacion.datos.vuelta_id).toBe(delServidor);
    expect(await db.registros.get(local.id)).toBeUndefined();
    expect((await db.registros.get(g.id))?.datos.vuelta_id).toBe(delServidor);
  });

  it("eliminar anula: el registro queda marcado y se envía la anulación", async () => {
    const g = gasto(crypto.randomUUID());
    await guardar(db, "gastos_variables", g);
    await anular(db, "gastos_variables", g.id, "Lo registré dos veces");
    expect((await db.registros.get(g.id))?.anulado).toBe(true);
    const { enviar, recibido } = servidor();
    await sincronizar(db, enviar);
    expect(recibido.at(-1)?.operacion).toEqual({
      tipo: "anular", tabla: "gastos_variables", id: g.id, motivo_anulacion: "Lo registré dos veces",
    });
  });
});
