import { describe, expect, it, vi } from "vitest";
import type { PagoBase } from "@/lib/dominio/vencimientos";
import { procesarRecordatorios } from "./recordatorios";

const pago = (id: string, nombre: string, fecha_recordatorio: string | null, enviado: string | null = null): PagoBase => ({
  id, nombre, fecha_pago: "2025-10-20", costo: 500000, fecha_recordatorio, fecha_vencimiento: "2026-11-01",
  recordatorio_enviado_en: enviado, creado_en: "2025-10-20T12:00:00Z",
});

describe("recordatorios por correo", () => {
  it("envía un solo correo con lo que toca y lo marca", async () => {
    const enviarCorreo = vi.fn(async () => undefined);
    const marcarEnviados = vi.fn(async () => undefined);
    const r = await procesarRecordatorios({
      hoy: "2026-10-20",
      leerPagosActivos: async () => [pago("a", "SOAT", "2026-10-15"), pago("b", "Seguro", "2026-12-01"), pago("c", "Tecno", "2026-10-01", "2026-10-01T12:00:00Z")],
      enviarCorreo,
      marcarEnviados,
    });
    expect(r.enviados).toBe(1);
    expect(enviarCorreo).toHaveBeenCalledTimes(1);
    expect(marcarEnviados).toHaveBeenCalledWith(["a"]);
  });

  it("si el correo falla, no marca nada (se reintenta mañana)", async () => {
    const marcarEnviados = vi.fn(async () => undefined);
    await expect(
      procesarRecordatorios({
        hoy: "2026-10-20",
        leerPagosActivos: async () => [pago("a", "SOAT", "2026-10-15")],
        enviarCorreo: async () => {
          throw new Error("Resend caído");
        },
        marcarEnviados,
      }),
    ).rejects.toThrow();
    expect(marcarEnviados).not.toHaveBeenCalled();
  });

  it("sin pendientes no envía nada", async () => {
    const enviarCorreo = vi.fn(async () => undefined);
    const r = await procesarRecordatorios({
      hoy: "2026-10-20", leerPagosActivos: async () => [], enviarCorreo, marcarEnviados: async () => undefined,
    });
    expect(r.enviados).toBe(0);
    expect(enviarCorreo).not.toHaveBeenCalled();
  });
});
