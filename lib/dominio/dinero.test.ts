import { describe, expect, it } from "vitest";
import { esMontoValido, formatearPesos, leerPesos, sumar } from "./dinero";

describe("dinero", () => {
  it("formatea en pesos colombianos sin decimales", () => {
    expect(formatearPesos(845000).replace(/\s/g, " ")).toBe("$ 845.000");
  });

  it("solo acepta enteros no negativos", () => {
    expect(esMontoValido(80000)).toBe(true);
    expect(esMontoValido(0)).toBe(true);
    expect(esMontoValido(-1)).toBe(false);
    expect(esMontoValido(1.5)).toBe(false);
    expect(esMontoValido(Number.NaN)).toBe(false);
  });

  it("lee lo que se digita en un campo", () => {
    expect(leerPesos("80.000")).toBe(80000);
    expect(leerPesos("$ 55000")).toBe(55000);
    expect(leerPesos("80,5")).toBeNull();
    expect(leerPesos("")).toBeNull();
    expect(leerPesos("-100")).toBeNull();
  });

  it("suma", () => {
    expect(sumar([])).toBe(0);
    expect(sumar([35000, 250000, 140000])).toBe(425000);
  });
});
