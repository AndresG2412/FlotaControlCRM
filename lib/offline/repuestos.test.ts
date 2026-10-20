import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hoyEnBogota, sumarDias } from "@/lib/dominio/fechas";
import { guardarRepuesto, type DatosRepuesto } from "./acciones-conductor";
import { anular, idsSinSincronizar, resumenCola } from "./cola";
import { crearBaseLocal, type BaseLocal } from "./db";
import { armarRepuestos } from "./vista-repuestos";

const yo = "22222222-2222-4222-8222-222222222222";
const otro = "33333333-3333-4333-8333-333333333333";
const buseta = "11111111-1111-4111-8111-111111111111";
const hoy = hoyEnBogota();

/** Repuesto válido: fecha de hoy, precio y taller (obligatorios). */
const repuesto = (p: Partial<DatosRepuesto> = {}): DatosRepuesto => ({
  buseta_id: buseta,
  categoria_id: 1,
  nombre: "Pastillas de freno",
  fecha_cambio: hoy,
  costo: 180000,
  taller: "Taller El Paisa",
  ...p,
});

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
    await guardarRepuesto(db, yo, repuesto({ nombre: " Pastillas de freno ", taller: " Taller El Paisa " }));
    const [r] = await lista();
    expect(r).toMatchObject({
      nombre: "Pastillas de freno", taller: "Taller El Paisa", fecha_cambio: hoy, propio: true, sinEnviar: true, registrado_por: yo,
    });
    expect((await resumenCola(db)).pendientes).toBe(1);
  });

  it("se puede poner una fecha anterior, nunca una futura", async () => {
    await guardarRepuesto(db, yo, repuesto({ fecha_cambio: sumarDias(hoy, -15) }));
    expect((await lista())[0].fecha_cambio).toBe(sumarDias(hoy, -15));
    await expect(guardarRepuesto(db, yo, repuesto({ fecha_cambio: sumarDias(hoy, 1) }))).rejects.toThrow();
  });

  it("el historial se ordena por fecha del cambio, no por cuándo se registró", async () => {
    await guardarRepuesto(db, yo, repuesto({ nombre: "Viejo", fecha_cambio: sumarDias(hoy, -30) }));
    await guardarRepuesto(db, yo, repuesto({ nombre: "Nuevo", fecha_cambio: sumarDias(hoy, -1) }));
    await guardarRepuesto(db, yo, repuesto({ nombre: "Medio", fecha_cambio: sumarDias(hoy, -10) }));
    expect((await lista()).map((r) => r.nombre)).toEqual(["Nuevo", "Medio", "Viejo"]);
  });

  it("precio y taller son obligatorios", async () => {
    await expect(guardarRepuesto(db, yo, repuesto({ taller: "  " }))).rejects.toThrow();
    await expect(guardarRepuesto(db, yo, repuesto({ costo: 0 }))).rejects.toThrow();
    await expect(guardarRepuesto(db, yo, repuesto({ costo: 10.5 }))).rejects.toThrow();
    await expect(guardarRepuesto(db, yo, repuesto({ nombre: "  " }))).rejects.toThrow();
  });

  it("el historial es compartido, pero solo el autor lo puede corregir", async () => {
    await guardarRepuesto(db, yo, repuesto({ categoria_id: 2, nombre: "Aceite" }));
    const [r] = await lista(otro);
    expect(r.propio).toBe(false);
  });

  it("corregir conserva la hora de registro y no duplica", async () => {
    const id = await guardarRepuesto(db, yo, repuesto({ categoria_id: 2, nombre: "Aceite" }));
    const [antes] = await lista();
    await new Promise((ok) => setTimeout(ok, 5));
    await guardarRepuesto(db, yo, repuesto({ id, categoria_id: 2, nombre: "Aceite 20W50", fecha_cambio: sumarDias(hoy, -2) }));
    const todos = await lista();
    expect(todos).toHaveLength(1);
    expect(todos[0]).toMatchObject({ nombre: "Aceite 20W50", fecha_cambio: sumarDias(hoy, -2), ocurrido_en: antes.ocurrido_en, propio: true });
  });

  it("eliminar anula: sale del historial y se envía la anulación", async () => {
    const id = await guardarRepuesto(db, yo, repuesto({ nombre: "Bombillo" }));
    await anular(db, "repuestos", id, "Registrado por error");
    expect(await lista()).toHaveLength(0);
    expect((await resumenCola(db)).pendientes).toBe(2);
  });
});
