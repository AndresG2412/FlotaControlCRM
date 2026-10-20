import { describe, expect, it } from "vitest";
import { armarCorreoRecordatorio, estadoVencimiento, porRecordar, vigentes, type PagoBase } from "./vencimientos";

const pago = (p: Partial<PagoBase> & Pick<PagoBase, "id" | "nombre" | "fecha_pago">): PagoBase => ({
  costo: 500000,
  fecha_recordatorio: null,
  fecha_vencimiento: null,
  recordatorio_enviado_en: null,
  creado_en: `${p.fecha_pago}T12:00:00Z`,
  ...p,
});

const hoy = "2026-10-20";

describe("vencimientos", () => {
  it("el vigente de cada concepto es el último pago (al renovar no se pisa el historial)", () => {
    const pagos = [
      pago({ id: "soat-2025", nombre: "SOAT", fecha_pago: "2025-11-01", fecha_vencimiento: "2026-11-01" }),
      pago({ id: "soat-2026", nombre: "soat ", fecha_pago: "2026-10-15", fecha_vencimiento: "2027-10-15" }),
      pago({ id: "tecno", nombre: "Tecnomecánica", fecha_pago: "2026-03-01", fecha_vencimiento: "2027-03-01" }),
    ];
    expect(vigentes(pagos).map((p) => p.id)).toEqual(["tecno", "soat-2026"]);
  });

  it("estado según las fechas de Bogotá", () => {
    expect(estadoVencimiento({ fecha_recordatorio: null, fecha_vencimiento: "2026-10-19" }, hoy)).toBe("vencido");
    expect(estadoVencimiento({ fecha_recordatorio: "2026-10-20", fecha_vencimiento: "2026-12-31" }, hoy)).toBe("recordar");
    expect(estadoVencimiento({ fecha_recordatorio: null, fecha_vencimiento: "2026-11-15" }, hoy)).toBe("por_vencer");
    expect(estadoVencimiento({ fecha_recordatorio: "2027-01-01", fecha_vencimiento: "2027-02-01" }, hoy)).toBe("al_dia");
    expect(estadoVencimiento({ fecha_recordatorio: null, fecha_vencimiento: null }, hoy)).toBe("sin_vencimiento");
  });

  it("solo recuerda una vez, y no si ya se renovó", () => {
    const pagos = [
      pago({ id: "seguro", nombre: "Seguro", fecha_pago: "2025-10-25", fecha_recordatorio: "2026-10-10" }),
      pago({ id: "cuota-vieja", nombre: "Cuota Gaitana", fecha_pago: "2026-09-01", fecha_recordatorio: "2026-10-01" }),
      pago({ id: "cuota-nueva", nombre: "Cuota Gaitana", fecha_pago: "2026-10-01", fecha_recordatorio: "2026-11-01" }),
      pago({ id: "soat", nombre: "SOAT", fecha_pago: "2025-10-20", fecha_recordatorio: "2026-10-01", recordatorio_enviado_en: "2026-10-01T12:00:00Z" }),
    ];
    expect(porRecordar(pagos, hoy).map((p) => p.id)).toEqual(["seguro"]);
  });

  it("el correo escapa los datos", () => {
    const c = armarCorreoRecordatorio([{ nombre: "Seguro <b>todo riesgo</b>", costo: 1200000, fecha_vencimiento: "2026-10-25" }], hoy);
    expect(c.asunto).toBe("Recordatorio: Seguro <b>todo riesgo</b>");
    expect(c.html).toContain("Seguro &lt;b&gt;todo riesgo&lt;/b&gt;");
    expect(c.html).not.toContain("<b>todo");
    expect(c.texto).toContain("vence en 5 días");
  });
});
