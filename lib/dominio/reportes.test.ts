import { describe, expect, it } from "vitest";
import { csvPorVuelta, porConductor, porMes, resumir, type FilaReporte } from "./reportes";

const A = "conductor-a";
const B = "conductor-b";
const C = "conductor-c";

const fila = (p: Partial<FilaReporte> & Pick<FilaReporte, "vuelta_id" | "fecha_inicio">): FilaReporte => ({
  tipo: "completa",
  estado: "cerrada",
  conductor_florencia_id: A,
  conductor_pitalito_id: B,
  ingreso_real: 2_000_000,
  gastos_fijos: 845_000,
  gastos_variables: 600_000,
  liquidacion: 555_000,
  quedo_conductor: 20_000,
  diferencia_cuadre: -5_000,
  ...p,
});

const filas = [
  fila({ vuelta_id: "v1", fecha_inicio: "2026-10-02" }),
  fila({ vuelta_id: "v2", fecha_inicio: "2026-10-09", liquidacion: -100_000, diferencia_cuadre: 0, conductor_pitalito_id: C }),
  fila({
    vuelta_id: "v3", fecha_inicio: "2026-10-12", tipo: "varada", ingreso_real: 0, gastos_fijos: 0, gastos_variables: 0,
    liquidacion: 0, quedo_conductor: 0, diferencia_cuadre: null, estado: "finalizada",
  }),
  fila({ vuelta_id: "v4", fecha_inicio: "2026-09-25", liquidacion: 300_000, diferencia_cuadre: 10_000 }),
  fila({ vuelta_id: "v5", fecha_inicio: "2026-10-19", estado: "en_curso", liquidacion: 999_999 }),
];

describe("reportes", () => {
  it("resumen: no cuenta la vuelta en curso; varadas en 0", () => {
    const r = resumir(filas.filter((f) => f.fecha_inicio.startsWith("2026-10")));
    expect(r).toMatchObject({
      vueltas: 3,
      completas: 2,
      varadas: 1,
      sinCerrar: 1,
      liquidacion: 455_000,
      quedoConductor: 40_000,
      diferenciaCuadre: -5_000,
      promedioPorVuelta: 227_500,
    });
  });

  it("por mes, del más reciente al más antiguo", () => {
    expect(porMes(filas).map((m) => [m.mes, m.resumen.liquidacion])).toEqual([
      ["2026-10", 455_000],
      ["2026-09", 300_000],
    ]);
  });

  it("por conductor: puestos, vueltas y lo que registró como 'me lo quedé'", () => {
    const quedos = [
      { registrado_por: A, sobrante: 25_000 },
      { registrado_por: C, sobrante: 10_000 },
      { registrado_por: A, sobrante: 5_000 },
    ];
    const r = porConductor(filas, quedos);
    const de = (id: string) => r.find((x) => x.conductorId === id)!;
    expect(de(A)).toMatchObject({ vueltas: 4, comoFlorencia: 4, comoPitalito: 0, quedoConductor: 30_000, liquidacionVueltas: 755_000 });
    expect(de(B)).toMatchObject({ vueltas: 3, comoPitalito: 3, quedoConductor: 0, diferenciaCuadre: 5_000 });
    expect(de(C)).toMatchObject({ vueltas: 1, quedoConductor: 10_000, liquidacionVueltas: -100_000 });
  });

  it("CSV con ';', sin fórmulas y con comillas escapadas", () => {
    const csv = csvPorVuelta([filas[0]], (id) => (id === A ? '=CMD("x")' : "Ana; la de Pitalito"));
    const [encabezado, linea] = csv.split("\n");
    expect(encabezado.startsWith("fecha;tipo;estado")).toBe(true);
    expect(linea).toContain(`"'=CMD(""x"")"`);
    expect(linea).toContain('"Ana; la de Pitalito"');
    expect(linea).toContain(";-5000");
  });
});
