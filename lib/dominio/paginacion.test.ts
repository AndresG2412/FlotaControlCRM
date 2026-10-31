import { describe, expect, it } from "vitest";
import { paginar } from "./paginacion";

describe("paginar", () => {
  it("calcula páginas y el rango de la página pedida", () => {
    expect(paginar(45, 2, 20)).toEqual({ pagina: 2, paginas: 3, desde: 20, hasta: 39 });
    expect(paginar(45, 3, 20)).toEqual({ pagina: 3, paginas: 3, desde: 40, hasta: 59 });
  });

  it("acota una página fuera de rango", () => {
    expect(paginar(45, 9, 20).pagina).toBe(3);
    expect(paginar(45, 0, 20).pagina).toBe(1);
    expect(paginar(45, Number.NaN, 20).pagina).toBe(1);
  });

  it("sin registros hay una sola página", () => {
    expect(paginar(0, 1, 20)).toEqual({ pagina: 1, paginas: 1, desde: 0, hasta: 19 });
  });
});
