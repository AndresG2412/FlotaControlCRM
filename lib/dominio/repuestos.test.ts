import { describe, expect, it } from "vitest";
import { diasDesde, filtrarRepuestos, requiereRevision, ultimoPorCategoria } from "./repuestos";

const r = (id: string, categoria_id: number, nombre: string, fecha_cambio: string, sincronizado_en?: string, ocurrido_en?: string) => ({
  id, categoria_id, nombre, fecha_cambio, ocurrido_en: ocurrido_en ?? `${fecha_cambio}T15:00:00Z`, sincronizado_en,
});

const repuestos = [
  r("a", 1, "Pastillas de freno delanteras", "2026-03-10"),
  r("b", 1, "Pastillas de freno traseras", "2026-09-02"),
  // Se registró el 1 de octubre, pero el aceite se cambió el 30 de septiembre.
  r("c", 2, "Cambio de aceite 20W50", "2026-09-30", undefined, "2026-10-01T14:00:00Z"),
  r("d", 4, "Llanta delantera", "2026-08-15"),
];

const categorias = [
  { id: 1, nombre: "Frenos", activa: true },
  { id: 2, nombre: "Aceite", activa: true },
  { id: 3, nombre: "Eléctrico", activa: true },
];

describe("repuestos", () => {
  it("historial: más recientes primero, por categoría", () => {
    expect(filtrarRepuestos(repuestos).map((x) => x.id)).toEqual(["c", "b", "d", "a"]);
    expect(filtrarRepuestos(repuestos, { categoriaId: 1 }).map((x) => x.id)).toEqual(["b", "a"]);
  });

  it("filtra por la fecha del cambio, no por cuándo se registró", () => {
    expect(filtrarRepuestos(repuestos, { desde: "2026-10-01" }).map((x) => x.id)).toEqual([]);
    expect(filtrarRepuestos(repuestos, { desde: "2026-09-30", hasta: "2026-09-30" }).map((x) => x.id)).toEqual(["c"]);
  });

  it("busca por texto sin importar tildes ni mayúsculas", () => {
    expect(filtrarRepuestos(repuestos, { texto: "PASTILLAS" }).map((x) => x.id)).toEqual(["b", "a"]);
    expect(filtrarRepuestos([r("e", 3, "Batería", "2026-01-01")], { texto: "bateria" })).toHaveLength(1);
  });

  it("responde cuándo se cambió por última vez cada categoría", () => {
    const ultimos = ultimoPorCategoria(categorias, repuestos);
    expect(ultimos.map((u) => [u.categoria.nombre, u.ultimo?.id ?? null])).toEqual([
      ["Frenos", "b"],
      ["Aceite", "c"],
      ["Eléctrico", null],
    ]);
  });

  it("marca para revisión una hora del celular rara", () => {
    expect(requiereRevision(r("x", 1, "x", "2026-10-12", "2026-10-12T15:05:00Z"))).toBe(false);
    expect(requiereRevision(r("x", 1, "x", "2026-10-13", "2026-10-12T15:00:00Z"))).toBe(true);
    expect(requiereRevision(r("x", 1, "x", "2026-10-13"))).toBe(false); // aún no sincroniza
    // Poner una fecha de cambio vieja NO es una hora rara: cuenta la hora de registro.
    expect(requiereRevision(r("x", 1, "x", "2026-01-05", "2026-10-12T15:05:00Z", "2026-10-12T15:00:00Z"))).toBe(false);
  });

  it("cuenta los días desde el último cambio", () => {
    expect(diasDesde("2026-09-30", "2026-10-20")).toBe(20);
  });
});
