import { describe, expect, it } from "vitest";
import { fijosVigentes, historialPorConcepto, totalFijos, type GastoFijoConfig } from "./gastos-fijos";

const g = (concepto: string, valor: number, vigente_desde: string, se_paga_en_ruta = true): GastoFijoConfig => ({
  concepto,
  valor,
  se_paga_en_ruta,
  vigente_desde,
});

const config = [
  g("Peajes", 35000, "2026-01-01"),
  g("Peajes", 40000, "2026-06-01"),
  g("Lavadas", 50000, "2026-01-01"),
  g("Lavadas", 0, "2026-09-01"), // quitado desde septiembre
  g("Parqueos", 20000, "2026-03-01"),
];

describe("fijosVigentes", () => {
  it("toma el último valor con vigencia <= fecha", () => {
    expect(fijosVigentes(config, "2026-07-15").find((x) => x.concepto === "Peajes")?.valor).toBe(40000);
    expect(fijosVigentes(config, "2026-05-31").find((x) => x.concepto === "Peajes")?.valor).toBe(35000);
  });
  it("incluye el valor del mismo día de vigencia", () => {
    expect(fijosVigentes(config, "2026-06-01").find((x) => x.concepto === "Peajes")?.valor).toBe(40000);
  });
  it("omite conceptos que aún no existen y los quitados (valor 0)", () => {
    expect(fijosVigentes(config, "2026-02-01").map((x) => x.concepto)).toEqual(["Lavadas", "Peajes"]);
    expect(fijosVigentes(config, "2026-10-01").map((x) => x.concepto)).toEqual(["Parqueos", "Peajes"]);
  });
  it("total y orden estables", () => {
    expect(totalFijos(fijosVigentes(config, "2026-07-15"))).toBe(40000 + 50000 + 20000);
  });
});

describe("historialPorConcepto", () => {
  it("ordena del más reciente al más antiguo", () => {
    const h = historialPorConcepto(config);
    expect(h.get("Peajes")?.map((x) => x.valor)).toEqual([40000, 35000]);
    expect([...h.keys()]).toEqual(["Lavadas", "Parqueos", "Peajes"]);
  });
});
