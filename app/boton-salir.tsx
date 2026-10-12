import { LogOut } from "lucide-react";
import { cerrarSesion } from "@/lib/auth/acciones";

export function BotonSalir() {
  return (
    <form action={cerrarSesion}>
      <button
        type="submit"
        className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm text-texto-suave hover:bg-borde/40"
      >
        <LogOut className="size-4" aria-hidden />
        Salir
      </button>
    </form>
  );
}
