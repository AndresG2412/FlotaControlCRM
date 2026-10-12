import { describe, expect, it } from "vitest";
import { diaEnBogota, diasDelMes, diasEntre, horaSospechosa, sumarDias } from "./fechas";

describe("fechas", () => {
  it("usa el día de Bogotá, no el de UTC", () => {
    // 2026-10-13 03:00 UTC = 2026-10-12 22:00 en Bogotá (UTC−5).
    expect(diaEnBogota(new Date("2026-10-13T03:00:00Z"))).toBe("2026-10-12");
    expect(diaEnBogota(new Date("2026-10-13T05:00:00Z"))).toBe("2026-10-13");
  });

  it("suma días cruzando meses y años", () => {
    expect(sumarDias("2026-10-31", 1)).toBe("2026-11-01");
    expect(sumarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(sumarDias("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("cuenta días entre fechas", () => {
    expect(diasEntre("2026-10-01", "2026-10-12")).toBe(11);
  });

  it("lista los días de un mes", () => {
    expect(diasDelMes("2026-02")).toHaveLength(28);
    expect(diasDelMes("2028-02")).toHaveLength(29);
    expect(diasDelMes("2026-10")[0]).toBe("2026-10-01");
  });

  it("marca horas del celular sospechosas", () => {
    const servidor = new Date("2026-10-12T15:00:00Z");
    expect(horaSospechosa(new Date("2026-10-12T14:00:00Z"), servidor)).toBe(false);
    expect(horaSospechosa(new Date("2026-10-12T16:00:00Z"), servidor)).toBe(true);
    expect(horaSospechosa(new Date("2026-10-01T15:00:00Z"), servidor)).toBe(true);
  });
});
