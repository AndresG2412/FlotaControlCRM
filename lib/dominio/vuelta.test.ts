import { describe, expect, it } from "vitest";
import {
  cuentaDinero,
  puedeCambiarEstado,
  puedeIniciarVuelta,
  terminalesPendientes,
  vueltaEnCurso,
} from "./vuelta";

describe("vuelta", () => {
  it("no se empieza otra vuelta mientras haya una en curso", () => {
    const vueltas = [
      { id: "v1", estado: "cerrada" as const },
      { id: "v2", estado: "en_curso" as const },
    ];
    expect(puedeIniciarVuelta(vueltas)).toBe(false);
    expect(vueltaEnCurso(vueltas)?.id).toBe("v2");
  });

  it("una vuelta finalizada (sin cerrar) ya permite empezar otra", () => {
    expect(puedeIniciarVuelta([{ id: "v1", estado: "finalizada" }])).toBe(true);
    expect(puedeIniciarVuelta([])).toBe(true);
  });

  it("el conductor finaliza; solo el admin cierra o reabre una cerrada", () => {
    expect(puedeCambiarEstado("conductor", "en_curso", "finalizada")).toBe(true);
    expect(puedeCambiarEstado("conductor", "finalizada", "en_curso")).toBe(true);
    expect(puedeCambiarEstado("conductor", "finalizada", "cerrada")).toBe(false);
    expect(puedeCambiarEstado("conductor", "cerrada", "en_curso")).toBe(false);
    expect(puedeCambiarEstado("admin", "finalizada", "cerrada")).toBe(true);
    expect(puedeCambiarEstado("admin", "cerrada", "finalizada")).toBe(true);
  });

  it("una varada no cuenta dinero", () => {
    expect(cuentaDinero("varada")).toBe(false);
    expect(cuentaDinero("completa")).toBe(true);
  });

  it("guía el registro terminal por terminal", () => {
    expect(terminalesPendientes("ida", [])).toEqual(["florencia", "pitalito", "popayan"]);
    expect(terminalesPendientes("ida", ["florencia"])).toEqual(["pitalito", "popayan"]);
    expect(terminalesPendientes("regreso", ["cali", "popayan", "pitalito"])).toEqual([]);
  });
});
