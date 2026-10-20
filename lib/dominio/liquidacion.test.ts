import { describe, expect, it } from "vitest";
import { diferenciaCuadre, liquidar, type DatosVuelta, type GastoFijo } from "./liquidacion";

// Gastos fijos del sistema anterior: $845.000, todos pagados en ruta.
const fijos: GastoFijo[] = [35000, 250000, 140000, 200000, 150000, 50000, 20000].map((valor) => ({
  valor,
  sePagaEnRuta: true,
}));

const vuelta: DatosVuelta = {
  tipo: "completa",
  netosPlanillas: [600000, 450000, 300000, 700000, 400000, 250000],
  pasajerosPolilla: [
    { montoCobrado: 80000, montoFacturado: 55000, destinoSobrante: "polilla" },
    { montoCobrado: 20000, montoFacturado: 0, destinoSobrante: "polilla" },
    { montoCobrado: 30000, montoFacturado: 0, destinoSobrante: "conductor" },
  ],
  encomiendas: [15000, 10000],
  gastosFijos: fijos,
  gastosVariables: [400000, 380000, 20000, 20000], // ACPM ×2 + ligas
};

describe("liquidación", () => {
  it("ingreso real = planillas + polilla + encomiendas", () => {
    const r = liquidar(vuelta);
    expect(r.ingresoPlanillas).toBe(2700000);
    expect(r.ingresoPolilla).toBe(45000);
    expect(r.ingresoEncomiendas).toBe(25000);
    expect(r.ingresoReal).toBe(2770000);
  });

  it("lo que se quedó el conductor no suma al ingreso, pero se ve", () => {
    expect(liquidar(vuelta).quedoConductor).toBe(30000);
  });

  it("el ACPM sí se resta (error del sistema anterior)", () => {
    const r = liquidar(vuelta);
    expect(r.gastosFijos).toBe(845000);
    expect(r.gastosVariables).toBe(820000);
    expect(r.gastosMinimos).toBe(1665000);
    expect(r.liquidacion).toBe(2770000 - 1665000);
  });

  it("puede dar pérdida", () => {
    const r = liquidar({ ...vuelta, netosPlanillas: [200000] });
    expect(r.liquidacion).toBeLessThan(0);
  });

  it("el efectivo esperado descuenta lo que el conductor pagó en ruta", () => {
    const conFijoFueraDeRuta = liquidar({
      ...vuelta,
      gastosFijos: [...fijos, { valor: 100000, sePagaEnRuta: false }],
    });
    expect(liquidar(vuelta).efectivoEsperado).toBe(2770000 - 820000 - 845000);
    // Un fijo que paga el dueño aparte no cambia el efectivo que entrega el conductor.
    expect(conFijoFueraDeRuta.efectivoEsperado).toBe(liquidar(vuelta).efectivoEsperado);
    expect(conFijoFueraDeRuta.liquidacion).toBe(liquidar(vuelta).liquidacion - 100000);
  });

  it("una varada queda toda en 0", () => {
    const r = liquidar({ ...vuelta, tipo: "varada" });
    expect(Object.values(r).every((v) => v === 0)).toBe(true);
  });

  it("diferencia del cuadre", () => {
    expect(diferenciaCuadre(1100000, 1105000)).toBe(-5000);
    expect(diferenciaCuadre(1105000, 1105000)).toBe(0);
  });

  it("coincide con reporte_vueltas en la base (prueba del paso 4, transacción revertida)", () => {
    // Mismos datos que se insertaron en Supabase: el resultado de la vista fue
    // planillas 1.050.000 · polilla 25.000 · encomiendas 15.000 · ingreso real 1.090.000 ·
    // se quedó el conductor 20.000 · gastos fijos 845.000; y como varada, todo 0.
    const datos: DatosVuelta = {
      tipo: "completa",
      netosPlanillas: [600000, 450000],
      pasajerosPolilla: [
        { montoCobrado: 80000, montoFacturado: 55000, destinoSobrante: "polilla" },
        { montoCobrado: 20000, montoFacturado: 0, destinoSobrante: "conductor" },
      ],
      encomiendas: [15000],
      gastosFijos: fijos,
      gastosVariables: [],
    };
    expect(liquidar(datos)).toMatchObject({
      ingresoPlanillas: 1050000,
      ingresoPolilla: 25000,
      ingresoEncomiendas: 15000,
      ingresoReal: 1090000,
      quedoConductor: 20000,
      gastosFijos: 845000,
    });
    expect(liquidar({ ...datos, tipo: "varada" }).ingresoReal).toBe(0);
  });

  it("coincide con reporte_vueltas en la base (prueba del paso 5, transacción revertida)", () => {
    // Misma vuelta que se creó en Supabase (conductor registra, admin cierra) y que
    // la vista resolvió así: planillas 2.100.000 · polilla 25.000 · encomiendas 15.000 ·
    // ingreso real 2.140.000 · se quedó el conductor 20.000 · fijos 845.000 ·
    // variables 570.000 (2 ACPM + 1 liga) · mínimos 1.415.000 · liquidación 725.000 ·
    // efectivo esperado 725.000 · cerrada con 720.000 → diferencia −5.000.
    const datos: DatosVuelta = {
      tipo: "completa",
      netosPlanillas: [900000, 700000, 500000],
      pasajerosPolilla: [
        { montoCobrado: 80000, montoFacturado: 55000, destinoSobrante: "polilla" },
        { montoCobrado: 20000, montoFacturado: 0, destinoSobrante: "conductor" },
      ],
      encomiendas: [15000],
      gastosFijos: fijos,
      gastosVariables: [300000, 250000, 20000],
    };
    const r = liquidar(datos);
    expect(r).toMatchObject({
      ingresoReal: 2140000,
      quedoConductor: 20000,
      gastosFijos: 845000,
      gastosVariables: 570000,
      gastosMinimos: 1415000,
      liquidacion: 725000,
      efectivoEsperado: 725000,
    });
    expect(diferenciaCuadre(720000, r.efectivoEsperado)).toBe(-5000);

    // Ajustar un fijo en la vuelta (sin lavadas, −50.000) sube liquidación y efectivo esperado.
    const sinLavadas = liquidar({ ...datos, gastosFijos: fijos.filter((g) => g.valor !== 50000) });
    expect(sinLavadas).toMatchObject({ liquidacion: 775000, efectivoEsperado: 775000 });
  });
});
