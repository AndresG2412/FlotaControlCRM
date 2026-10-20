import { describe, expect, it } from "vitest";
import { calendarioDelMes, regresosEsperados, salidaDesdeFila, salidaQueCancela, type Salida } from ".";

function salida(p: Partial<Salida> & Pick<Salida, "id" | "fecha" | "sentido">): Salida {
  return { hora: "05:00", tipo: "programada", estado: "pendiente", canceladaPorId: null, ...p };
}

describe("regresos", () => {
  it("cada ida deja un regreso pendiente para el día siguiente", () => {
    const salidas = [salida({ id: "i1", fecha: "2026-10-05", sentido: "ida", estado: "realizada" })];
    expect(regresosEsperados(salidas, "2026-10-05")).toEqual([
      { idaId: "i1", desde: "2026-10-06", hasta: "2026-10-06", regresoId: null, estado: "pendiente" },
    ]);
  });

  it("si no regresó en la ventana, sigue pendiente pero atrasado", () => {
    const salidas = [salida({ id: "i1", fecha: "2026-10-05", sentido: "ida", estado: "realizada" })];
    expect(regresosEsperados(salidas, "2026-10-08")[0].estado).toBe("atrasado");
  });

  it("enlaza la ida con el primer regreso antes de la siguiente ida", () => {
    const salidas = [
      salida({ id: "i1", fecha: "2026-10-05", sentido: "ida", estado: "realizada" }),
      salida({ id: "r1", fecha: "2026-10-07", sentido: "regreso", estado: "realizada" }),
      salida({ id: "i2", fecha: "2026-10-09", sentido: "ida" }),
      salida({ id: "r2", fecha: "2026-10-10", sentido: "regreso" }),
    ];
    const r = regresosEsperados(salidas, "2026-10-08");
    expect(r.map((x) => [x.idaId, x.regresoId, x.estado])).toEqual([
      ["i1", "r1", "hecho"],
      ["i2", "r2", "programado"],
    ]);
  });

  it("respeta los días de viaje hasta Cali", () => {
    const salidas = [salida({ id: "i1", fecha: "2026-10-05", sentido: "ida" })];
    expect(regresosEsperados(salidas, "2026-10-05", { diasHastaCali: 1 })[0].desde).toBe("2026-10-07");
  });
});

describe("salida adicional", () => {
  const programadas = [
    salida({ id: "jue", fecha: "2026-10-08", sentido: "ida" }),
    salida({ id: "rjue", fecha: "2026-10-08", sentido: "regreso" }),
  ];

  it("cancela la salida programada del día siguiente en el mismo sentido", () => {
    expect(salidaQueCancela(programadas, { fecha: "2026-10-07", sentido: "ida" })?.id).toBe("jue");
    expect(salidaQueCancela(programadas, { fecha: "2026-10-07", sentido: "regreso" })?.id).toBe("rjue");
  });

  it("no cancela nada si al día siguiente no había salida", () => {
    expect(salidaQueCancela(programadas, { fecha: "2026-10-01", sentido: "ida" })).toBeNull();
  });

  it("no cancela salidas ya canceladas ni adicionales", () => {
    const salidas = [salida({ id: "x", fecha: "2026-10-08", sentido: "ida", tipo: "adicional" })];
    expect(salidaQueCancela(salidas, { fecha: "2026-10-07", sentido: "ida" })).toBeNull();
  });

  it("ejemplo del dueño: adicional el miércoles hereda el regreso del viernes", () => {
    // Adicional mié 7 → se cancela la ida del jue 8 → puede regresar jue 8 o vie 9.
    const salidas = [
      salida({ id: "mie", fecha: "2026-10-07", sentido: "ida", tipo: "adicional", estado: "realizada" }),
      salida({ id: "jue", fecha: "2026-10-08", sentido: "ida", estado: "cancelada_por_adicional", canceladaPorId: "mie" }),
    ];
    expect(regresosEsperados(salidas, "2026-10-08")).toEqual([
      { idaId: "mie", desde: "2026-10-08", hasta: "2026-10-09", regresoId: null, estado: "pendiente" },
    ]);
    // El jueves no hubo pasajeros: el viernes sigue en la ventana.
    expect(regresosEsperados(salidas, "2026-10-09")[0].estado).toBe("pendiente");
    expect(regresosEsperados(salidas, "2026-10-10")[0].estado).toBe("atrasado");
  });
});

describe("calendario del mes", () => {
  it("muestra cuándo está la buseta en Cali y qué días está disponible", () => {
    const salidas = [
      salida({ id: "i1", fecha: "2026-10-05", sentido: "ida", estado: "realizada" }),
      salida({ id: "r1", fecha: "2026-10-07", sentido: "regreso", estado: "realizada" }),
    ];
    const dias = calendarioDelMes(salidas, "2026-10", "2026-10-12");
    const dia = (d: string) => dias.find((x) => x.fecha === d)!;

    expect(dia("2026-10-04").disponible).toBe(true);
    expect(dia("2026-10-05").disponible).toBe(false); // sale de Florencia
    expect(dia("2026-10-06").enCali).toBe(true); // esperando regreso
    expect(dia("2026-10-06").disponible).toBe(false);
    expect(dia("2026-10-07").disponible).toBe(false); // regresa
    expect(dia("2026-10-08").disponible).toBe(true);
  });

  it("incluye las salidas canceladas para verlas marcadas", () => {
    const salidas = [
      salida({ id: "c", fecha: "2026-10-08", sentido: "ida", estado: "cancelada_por_adicional", canceladaPorId: "a" }),
    ];
    const dia = calendarioDelMes(salidas, "2026-10", "2026-10-01").find((x) => x.fecha === "2026-10-08")!;
    expect(dia.salidas).toHaveLength(1);
    expect(dia.disponible).toBe(true);
  });
});

describe("salidaDesdeFila", () => {
  it("convierte una fila de la base y recorta la hora", () => {
    expect(
      salidaDesdeFila({ id: "s", fecha: "2026-10-20", hora: "05:30:00", sentido: "ida", tipo: "programada", estado: "pendiente", cancelada_por_id: null }),
    ).toEqual({ id: "s", fecha: "2026-10-20", hora: "05:30", sentido: "ida", tipo: "programada", estado: "pendiente", canceladaPorId: null });
  });

  it("descarta valores desconocidos", () => {
    expect(
      salidaDesdeFila({ id: "s", fecha: "2026-10-20", hora: null, sentido: "otro", tipo: "programada", estado: "pendiente", cancelada_por_id: null }),
    ).toBeNull();
  });
});
