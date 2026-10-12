import { describe, expect, it } from "vitest";
import { estadoTerminales, resumenPlanillas, terminalesDelTrayecto } from "./planillas";

describe("planillas por terminal", () => {
  it("la terminal final del trayecto nunca emite planilla", () => {
    expect(terminalesDelTrayecto("ida")).toEqual(["florencia", "pitalito", "popayan"]);
    expect(terminalesDelTrayecto("regreso")).toEqual(["cali", "popayan", "pitalito"]);
  });

  it("si se varó, solo cuentan las terminales anteriores a donde terminó", () => {
    expect(terminalesDelTrayecto("ida", "pitalito")).toEqual(["florencia"]);
    expect(terminalesDelTrayecto("ida", "cali")).toEqual(["florencia", "pitalito", "popayan"]);
  });

  it("distingue registrada, sin planilla y pendiente", () => {
    const terminales = estadoTerminales("ida", null, [
      { terminal: "florencia", emitida: true },
      { terminal: "pitalito", emitida: false },
    ]);
    expect(terminales.map((t) => t.estado)).toEqual(["registrada", "sin_planilla", "pendiente"]);
    expect(terminales[2].planilla).toBeNull();
  });

  it("resume las planillas de toda la vuelta por trayecto", () => {
    const trayectos = [
      { id: "t1", sentido: "ida" as const },
      { id: "t2", sentido: "regreso" as const, terminal_fin: "popayan" as const },
    ];
    const planillas = [
      { trayecto_id: "t1", terminal: "florencia" as const, emitida: true },
      { trayecto_id: "t1", terminal: "pitalito" as const, emitida: true },
      { trayecto_id: "t1", terminal: "popayan" as const, emitida: false },
      // Planilla de Cali en el regreso; Popayán no cuenta porque ahí terminó.
      { trayecto_id: "t2", terminal: "cali" as const, emitida: true },
    ];
    expect(resumenPlanillas(trayectos, planillas)).toEqual({ registrada: 3, sin_planilla: 1, pendiente: 0 });
  });

  it("una planilla de otro trayecto no cuenta", () => {
    const resumen = resumenPlanillas(
      [{ id: "t1", sentido: "ida" }],
      [{ trayecto_id: "otro", terminal: "florencia", emitida: true }],
    );
    expect(resumen).toEqual({ registrada: 0, sin_planilla: 0, pendiente: 3 });
  });
});
