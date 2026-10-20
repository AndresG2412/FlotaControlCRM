import { LogOut } from "lucide-react";
import { cerrarSesion } from "@/lib/auth/acciones";

export function BotonSalir() {
  return (
    <form action={cerrarSesion}>
      <button type="submit" className="pestana flex h-10 items-center gap-2 rounded-full px-3 text-sm">
        <LogOut className="size-4" aria-hidden />
        Salir
      </button>
    </form>
  );
}
