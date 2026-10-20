import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { guardarRepuesto } from "./acciones-conductor";
import { anular, idsSinSincronizar, resumenCola } from "./cola";
import { crearBaseLocal, type BaseLocal } from "./db";
import { armarRepuestos } from "./vista-repuestos";

const yo = "22222222-2222-4222-8222-222222222222";
const otro = "33333333-3333-4333-8333-333333333333";
const buseta = "11111111-1111-4111-8111-111111111111";

let db: BaseLocal;
beforeEach(() => {
  db = crearBaseLocal(`prueba-${crypto.randomUUID()}`);
});
afterEach(async () => {
  await db.delete();
});

const lista = async (uid = yo) => armarRepuestos(await db.registros.toArray(), uid, await idsSinSincronizar(db));

describe("repuestos sin señal", () => {
  it("registra un repuesto, propio y pendiente de enviar", async () => {
    await guardarRepuesto(db, yo, { buseta_id: buseta, categoria_id: 1, nombre: " Pastillas de freno ", costo: 180000, kilometraje: 152300 });
    const [r] = await lista();
    expect(r).toMatchObject({ nombre: "Pastillas de freno", propio: true, sinEnviar: true, registrado_por: yo });
    expect((await resumenCola(db)).pendientes).toBe(1);
  });

  it("el historial es compartido, pero solo el autor lo puede corregir", async () => {
    await guardarRepuesto(db, yo, { buseta_id: buseta, categoria_id: 2, nombre: "Aceite" });
    const [r] = await lista(otro);
    expect(r.propio).toBe(false);
  });

  it("corregir conserva la fecha original y no duplica", async () => {
    const id = await guardarRepuesto(db, yo, { buseta_id: buseta, categoria_id: 2, nombre: "Aceite" });
    const [antes] = await lista();
    await new Promise((ok) => setTimeout(ok, 5));
    await guardarRepuesto(db, yo, { id, buseta_id: buseta, categoria_id: 2, nombre: "Aceite 20W50", taller: "Taller Pitalito" });
    const todos = await lista();
    expect(todos).toHaveLength(1);
    expect(todos[0]).toMatchObject({ nombre: "Aceite 20W50", taller: "Taller Pitalito", ocurrido_en: antes.ocurrido_en, propio: true });
  });

  it("rechaza datos inválidos (sin nombre, costo con decimales)", async () => {
    await expect(guardarRepuesto(db, yo, { buseta_id: buseta, categoria_id: 1, nombre: "  " })).rejects.toThrow();
    await expect(guardarRepuesto(db, yo, { buseta_id: buseta, categoria_id: 1, nombre: "x", costo: 10.5 })).rejects.toThrow();
  });

  it("eliminar anula: sale del historial y se envía la anulación", async () => {
    const id = await guardarRepuesto(db, yo, { buseta_id: buseta, categoria_id: 1, nombre: "Bombillo" });
    await anular(db, "repuestos", id, "Registrado por error");
    expect(await lista()).toHaveLength(0);
    expect((await resumenCola(db)).pendientes).toBe(2);
  });
});
