import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  finalizarVuelta,
  guardarEncomienda,
  guardarPasajero,
  guardarPlanilla,
  iniciarTrayecto,
  iniciarVuelta,
  marcarVarada,
  YaHayVueltaEnCurso,
} from "./acciones-conductor";
import { anular, idsSinSincronizar, resumenCola } from "./cola";
import { crearBaseLocal, type BaseLocal } from "./db";
import { armarVista, type TrayectoLocal, type VueltaLocal } from "./vista";

const yo = "22222222-2222-4222-8222-222222222222";
const companero = "33333333-3333-4333-8333-333333333333";
const buseta = "11111111-1111-4111-8111-111111111111";

let db: BaseLocal;
beforeEach(() => {
  db = crearBaseLocal(`prueba-${crypto.randomUUID()}`);
});
afterEach(async () => {
  await db.delete();
});

const vista = async (uid = yo) => armarVista(await db.registros.toArray(), uid, await idsSinSincronizar(db));

describe("vuelta del conductor (sin señal)", () => {
  it("inicia la vuelta y la muestra en curso, pendiente de enviar", async () => {
    await iniciarVuelta(db, { uid: yo, busetaId: buseta, puesto: "florencia", companeroId: companero });
    const v = await vista();
    expect(v?.vuelta).toMatchObject({ estado: "en_curso", conductor_florencia_id: yo, conductor_pitalito_id: companero });
    expect(v).toMatchObject({ asignado: true, puesto: "florencia", sinEnviar: true, ida: null });
    // El compañero la ve igual (datos compartidos).
    expect((await vista(companero))?.puesto).toBe("pitalito");
  });

  it("no deja empezar otra mientras haya una en curso", async () => {
    await iniciarVuelta(db, { uid: yo, busetaId: buseta, puesto: "florencia", companeroId: null });
    await expect(iniciarVuelta(db, { uid: yo, busetaId: buseta, puesto: "florencia", companeroId: null })).rejects.toBeInstanceOf(YaHayVueltaEnCurso);
  });

  it("registra terminal por terminal y cuenta las pendientes", async () => {
    const vueltaId = await iniciarVuelta(db, { uid: yo, busetaId: buseta, puesto: "florencia", companeroId: null });
    const idaId = await iniciarTrayecto(db, vueltaId, "ida");
    expect((await vista())?.terminalesPendientes).toBe(3);

    await guardarPlanilla(db, { id: idaId, sentido: "ida" }, { terminal: "florencia", emitida: true, neto: 600000 });
    await guardarPlanilla(db, { id: idaId, sentido: "ida" }, { terminal: "pitalito", emitida: false, motivo_sin_planilla: "Terminal cerrada" });
    const v = await vista();
    expect(v?.ida?.terminales.map((t) => t.estado)).toEqual(["registrada", "sin_planilla", "pendiente"]);
    expect(v?.terminalesPendientes).toBe(1);
  });

  it("corregir una planilla actualiza la misma (no crea otra)", async () => {
    const vueltaId = await iniciarVuelta(db, { uid: yo, busetaId: buseta, puesto: "florencia", companeroId: null });
    const idaId = await iniciarTrayecto(db, vueltaId, "ida");
    const id = await guardarPlanilla(db, { id: idaId, sentido: "ida" }, { terminal: "florencia", emitida: true, neto: 600000 });
    await guardarPlanilla(db, { id: idaId, sentido: "ida" }, { id, terminal: "florencia", emitida: true, neto: 650000 });
    expect(await db.registros.where("tabla").equals("planillas").count()).toBe(1);
    expect((await vista())?.ida?.terminales[0].planilla?.neto).toBe(650000);
  });

  it("varada: el trayecto termina antes y la vuelta pasa a varada", async () => {
    const vueltaId = await iniciarVuelta(db, { uid: yo, busetaId: buseta, puesto: "florencia", companeroId: null });
    await iniciarTrayecto(db, vueltaId, "ida");
    const v = (await vista())!;
    await marcarVarada(db, v.vuelta as VueltaLocal, v.ida!.trayecto as TrayectoLocal, "pitalito");
    const despues = (await vista())!;
    expect(despues.vuelta).toMatchObject({ tipo: "varada", estado: "en_curso" });
    expect(despues.ida?.terminales.map((t) => t.codigo)).toEqual(["florencia"]);
  });

  it("finalizar la saca de la pantalla y permite empezar otra", async () => {
    const vueltaId = await iniciarVuelta(db, { uid: yo, busetaId: buseta, puesto: "florencia", companeroId: null });
    await finalizarVuelta(db, vueltaId);
    expect(await vista()).toBeNull();
    await iniciarVuelta(db, { uid: yo, busetaId: buseta, puesto: "florencia", companeroId: null });
    expect((await resumenCola(db)).pendientes).toBe(3); // vuelta, finalizar, vuelta nueva
  });

  it("polilla: registra pasajeros uno por uno con su sobrante, sin sumas", async () => {
    const vueltaId = await iniciarVuelta(db, { uid: yo, busetaId: buseta, puesto: "florencia", companeroId: null });
    const idaId = await iniciarTrayecto(db, vueltaId, "ida");
    const ida = { id: idaId, sentido: "ida" as const };

    // Ejemplo del dueño: 80.000 cobrados, 55.000 en taquilla de Pitalito, 25.000 a la caja.
    await guardarPasajero(db, ida, {
      tramo_id: "ida-1", destino: "cali", monto_cobrado: 80000,
      facturado: true, terminal_facturacion: "pitalito", monto_facturado: 55000, destino_sobrante: "polilla",
    });
    // Se baja antes de la terminal: no se factura; el conductor dice que se lo quedó.
    await guardarPasajero(db, ida, {
      tramo_id: "ida-1", destino: "pitalito", monto_cobrado: 20000,
      facturado: false, monto_facturado: 0, destino_sobrante: "conductor",
    });

    const t = (await vista())!.ida!;
    expect(t.pasajeros.map((p) => [p.destino, p.sobrante, p.destino_sobrante])).toEqual(
      expect.arrayContaining([
        ["cali", 25000, "polilla"],
        ["pitalito", 20000, "conductor"],
      ]),
    );
    expect(t.pasajeros.every((p) => p.sinEnviar)).toBe(true);
    // La vista del conductor no expone ningún total de dinero.
    expect(Object.keys(t)).not.toContain("totalPolilla");
  });

  it("polilla: rechaza un pasajero que pasa una terminal sin facturar", async () => {
    const vueltaId = await iniciarVuelta(db, { uid: yo, busetaId: buseta, puesto: "florencia", companeroId: null });
    const idaId = await iniciarTrayecto(db, vueltaId, "ida");
    await expect(
      guardarPasajero(db, { id: idaId, sentido: "ida" }, {
        tramo_id: "ida-1", destino: "cali", monto_cobrado: 80000,
        facturado: false, monto_facturado: 0, destino_sobrante: "polilla",
      }),
    ).rejects.toThrow();
  });

  it("polilla: corregir no duplica y eliminar lo anula", async () => {
    const vueltaId = await iniciarVuelta(db, { uid: yo, busetaId: buseta, puesto: "florencia", companeroId: null });
    const idaId = await iniciarTrayecto(db, vueltaId, "ida");
    const ida = { id: idaId, sentido: "ida" as const };
    const datos = {
      tramo_id: "ida-3", destino: "cali" as const, monto_cobrado: 30000,
      facturado: false, monto_facturado: 0, destino_sobrante: "polilla" as const,
    };
    const id = await guardarPasajero(db, ida, datos);
    await guardarPasajero(db, ida, { ...datos, id, monto_cobrado: 35000 });
    expect((await vista())!.ida!.pasajeros).toHaveLength(1);
    expect((await vista())!.ida!.pasajeros[0].sobrante).toBe(35000);

    await anular(db, "polilla_pasajeros", id, "Lo registré dos veces");
    expect((await vista())!.ida!.pasajeros).toHaveLength(0);
  });

  it("encomiendas: en terminal o en la vía, siempre hacia adelante", async () => {
    const vueltaId = await iniciarVuelta(db, { uid: yo, busetaId: buseta, puesto: "florencia", companeroId: null });
    const idaId = await iniciarTrayecto(db, vueltaId, "ida");
    const ida = { id: idaId, sentido: "ida" as const };
    await guardarEncomienda(db, ida, { recibida_en_terminal: "florencia", destino: "cali", descripcion: "Caja", monto: 15000 });
    await guardarEncomienda(db, ida, { recibida_en_tramo: "ida-2", destino: "cali", monto: 10000 });
    await expect(
      guardarEncomienda(db, ida, { recibida_en_terminal: "popayan", destino: "pitalito", monto: 10000 }),
    ).rejects.toThrow();
    expect((await vista())!.ida!.encomiendas.map((e) => e.monto).sort()).toEqual([10000, 15000]);
  });

  it("el tramo actual avanza con las planillas registradas", async () => {
    const vueltaId = await iniciarVuelta(db, { uid: yo, busetaId: buseta, puesto: "florencia", companeroId: null });
    const idaId = await iniciarTrayecto(db, vueltaId, "ida");
    expect((await vista())!.ida!.tramoActual.id).toBe("ida-1");
    await guardarPlanilla(db, { id: idaId, sentido: "ida" }, { terminal: "florencia", emitida: true, neto: 1 });
    await guardarPlanilla(db, { id: idaId, sentido: "ida" }, { terminal: "pitalito", emitida: false, motivo_sin_planilla: "Cerrada" });
    expect((await vista())!.ida!.tramoActual.id).toBe("ida-2");
  });
});
