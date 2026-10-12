import { Bus } from "lucide-react";

export default function VueltaActual() {
  return (
    <section className="flex flex-col items-center gap-3 py-12 text-center">
      <Bus className="size-10 text-texto-suave" aria-hidden />
      <h1 className="text-xl font-semibold">Vuelta actual</h1>
      <p className="text-texto-suave">
        Aquí vas a registrar planillas, pasajeros de polilla, encomiendas y gastos, con o sin señal.
      </p>
      <span className="text-xs text-aviso">En construcción</span>
    </section>
  );
}
