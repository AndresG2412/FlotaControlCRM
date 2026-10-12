import { WifiOff } from "lucide-react";

export const metadata = { title: "Sin conexión" };

// Página de respaldo del service worker cuando no hay señal y la pantalla no
// estaba guardada. Lo registrado en el celular no se pierde.
export default function SinConexion() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <WifiOff className="size-12 text-texto-suave" aria-hidden />
      <h1 className="text-2xl font-semibold">Sin conexión</h1>
      <p className="text-texto-suave">
        Esta pantalla no estaba guardada en el celular. Lo que ya registraste sigue guardado y se
        envía solo cuando vuelva la señal.
      </p>
    </main>
  );
}
