import { describe, expect, it } from "vitest";
import { diasDesde, filtrarRepuestos, requiereRevision, ultimoPorCategoria } from "./repuestos";

const r = (id: string, categoria_id: number, nombre: string, ocurrido_en: string, sincronizado_en?: string) => ({
  id, categoria_id, nombre, ocurrido_en, sincronizado_en,
});

const repuestos = [
  r("a", 1, "Pastillas de freno delanteras", "2026-03-10T15:00:00Z"),
  r("b", 1, "Pastillas de freno traseras", "2026-09-02T15:00:00Z"),
  r("c", 2, "Cambio de aceite 20W50", "2026-10-01T03:00:00Z"), // 30 sep 22:00 en Bogotá
  r("d", 4, "Llanta delantera", "2026-08-15T15:00:00Z"),
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

  it("filtra por días de Bogotá, no de UTC", () => {
    // El aceite se cambió el 30 de septiembre en Bogotá (1 de octubre en UTC).
    expect(filtrarRepuestos(repuestos, { desde: "2026-10-01" }).map((x) => x.id)).toEqual([]);
    expect(filtrarRepuestos(repuestos, { desde: "2026-09-30", hasta: "2026-09-30" }).map((x) => x.id)).toEqual(["c"]);
  });

  it("busca por texto sin importar tildes ni mayúsculas", () => {
    expect(filtrarRepuestos(repuestos, { texto: "PASTILLAS" }).map((x) => x.id)).toEqual(["b", "a"]);
    expect(filtrarRepuestos([r("e", 3, "Batería", "2026-01-01T15:00:00Z")], { texto: "bateria" })).toHaveLength(1);
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
    expect(requiereRevision(r("x", 1, "x", "2026-10-12T15:00:00Z", "2026-10-12T15:05:00Z"))).toBe(false);
    expect(requiereRevision(r("x", 1, "x", "2026-10-13T15:00:00Z", "2026-10-12T15:00:00Z"))).toBe(true);
    expect(requiereRevision(r("x", 1, "x", "2026-10-13T15:00:00Z"))).toBe(false); // aún no sincroniza
  });

  it("cuenta los días desde el último cambio", () => {
    expect(diasDesde("2026-10-01T03:00:00Z", "2026-10-20")).toBe(20);
  });
});
