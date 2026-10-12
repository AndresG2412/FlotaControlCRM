import { Bus } from "lucide-react";
import { redirect } from "next/navigation";
import { INICIO_POR_ROL, obtenerPerfil } from "@/lib/auth/sesion";
import { FormularioLogin } from "./formulario";

export const metadata = { title: "Entrar" };

export default async function Login() {
  const perfil = await obtenerPerfil();
  if (perfil) redirect(INICIO_POR_ROL[perfil.rol]);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 p-6">
      <header className="flex flex-col items-center gap-3 text-center">
        <span className="grid size-16 place-items-center rounded-2xl bg-marca text-marca-texto">
          <Bus className="size-8" aria-hidden />
        </span>
        <h1 className="text-2xl font-semibold">FlotaControl</h1>
        <p className="text-texto-suave">Entra con el usuario que te dio el administrador.</p>
      </header>
      <FormularioLogin />
    </main>
  );
}
