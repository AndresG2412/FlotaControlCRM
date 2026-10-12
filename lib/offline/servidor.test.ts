import { describe, expect, it } from "vitest";
import type { Lote } from "./operaciones";
import { aplicarLote } from "./servidor";

type Fila = { error: { code: string; message: string } | null; data: { id: string }[] | null };

/** Cliente de Supabase mínimo: cada escritura responde con la siguiente fila de la lista. */
function clienteFalso(respuestas: Fila[], vueltaEnCurso: string | null = null) {
  const llamadas: string[] = [];
  const consulta = (tabla: string) => {
    const cadena = {
      upsert: () => (llamadas.push(`upsert:${tabla}`), cadena),
      update: () => (llamadas.push(`update:${tabla}`), cadena),
      eq: () => cadena,
      select: async () => respuestas.shift() ?? { error: null, data: [{ id: "x" }] },
    };
    return {
      ...cadena,
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: vueltaEnCurso ? { id: vueltaEnCurso } : null }) }) }) }),
    };
  };
  return { cliente: { from: consulta } as unknown as Parameters<typeof aplicarLote>[0], llamadas };
}

const uid = "22222222-2222-4222-8222-222222222222";
const vuelta = {
  id: "33333333-3333-4333-8333-333333333333", ocurrido_en: "2026-10-12T14:30:00-05:00",
  buseta_id: "11111111-1111-4111-8111-111111111111", tipo: "completa", fecha_inicio: "2026-10-12",
  conductor_florencia_id: uid,
};
const gasto = {
  id: "44444444-4444-4444-8444-444444444444", ocurrido_en: "2026-10-12T15:00:00-05:00",
  vuelta_id: vuelta.id, tipo: "acpm", monto: 400000,
};
const lote = (...ops: Lote["operaciones"][number]["operacion"][]): Lote => ({
  operaciones: ops.map((operacion) => ({ clave: crypto.randomUUID(), operacion })),
});

describe("aplicarLote", () => {
  it("guarda en orden con upsert", async () => {
    const { cliente, llamadas } = clienteFalso([]);
    const r = await aplicarLote(cliente, uid, lote(
      { tipo: "guardar", tabla: "vueltas", datos: vuelta },
      { tipo: "guardar", tabla: "gastos_variables", datos: gasto },
    ));
    expect(r.every((x) => x.ok)).toBe(true);
    expect(llamadas).toEqual(["upsert:vueltas", "upsert:gastos_variables"]);
  });

  it("rechaza datos inválidos sin tocar la base", async () => {
    const { cliente, llamadas } = clienteFalso([]);
    const [r] = await aplicarLote(cliente, uid, lote({ tipo: "guardar", tabla: "gastos_variables", datos: { ...gasto, monto: -5 } }));
    expect(r).toMatchObject({ ok: false, codigo: "invalido" });
    expect(llamadas).toEqual([]);
  });

  it("vuelta en curso: devuelve la del servidor y no procesa lo que sigue", async () => {
    const enCurso = "55555555-5555-4555-8555-555555555555";
    const { cliente, llamadas } = clienteFalso(
      [{ error: { code: "23505", message: 'duplicate key value violates unique constraint "vueltas_una_en_curso"' }, data: null }],
      enCurso,
    );
    const r = await aplicarLote(cliente, uid, lote(
      { tipo: "guardar", tabla: "vueltas", datos: vuelta },
      { tipo: "guardar", tabla: "gastos_variables", datos: gasto },
    ));
    expect(r[0]).toMatchObject({ ok: false, codigo: "vuelta_en_curso", vueltaEnCursoId: enCurso });
    expect(r[1]).toMatchObject({ ok: false, codigo: "no_procesado" });
    expect(llamadas).toEqual(["upsert:vueltas"]);
  });

  it("RLS o vuelta cerrada: sin permiso, definitivo", async () => {
    const { cliente } = clienteFalso([
      { error: { code: "42501", message: "new row violates row-level security policy" }, data: null },
    ]);
    const [r] = await aplicarLote(cliente, uid, lote({ tipo: "guardar", tabla: "gastos_variables", datos: gasto }));
    expect(r).toMatchObject({ ok: false, codigo: "sin_permiso" });
  });

  it("anular sin filas afectadas = sin permiso", async () => {
    const { cliente, llamadas } = clienteFalso([{ error: null, data: [] }]);
    const [r] = await aplicarLote(cliente, uid, lote({ tipo: "anular", tabla: "repuestos", id: gasto.id, motivo_anulacion: "error" }));
    expect(r).toMatchObject({ ok: false, codigo: "sin_permiso" });
    expect(llamadas).toEqual(["update:repuestos"]);
  });

  it("un error desconocido es temporal y detiene el lote", async () => {
    const { cliente } = clienteFalso([{ error: { code: "57014", message: "timeout" }, data: null }]);
    const r = await aplicarLote(cliente, uid, lote(
      { tipo: "guardar", tabla: "vueltas", datos: vuelta },
      { tipo: "estado_vuelta", id: vuelta.id, estado: "finalizada" },
    ));
    expect(r.map((x) => !x.ok && x.codigo)).toEqual(["error_servidor", "no_procesado"]);
  });
});
