import { Bus } from "lucide-react";
import { redirect } from "next/navigation";
import { INICIO_POR_ROL, obtenerPerfil } from "@/lib/auth/sesion";
import { FormularioLogin } from "./formulario";

export const metadata = { title: "Entrar" };

export default async function Login() {
  const perfil = await obtenerPerfil();
  if (perfil) redirect(INICIO_POR_ROL[perfil.rol]);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-5 py-10">
      <header className="flex flex-col items-center gap-4 text-center">
        <span className="neu-logo grid size-20 place-items-center rounded-[1.6rem]">
          <Bus className="size-9" aria-hidden />
        </span>
        <div className="flex flex-col gap-1.5">
          <h1 className="titulo-pagina">FlotaControl</h1>
          <p className="text-texto-suave">Entra con el usuario que te dio el administrador.</p>
        </div>
      </header>
      <div className="neu-tarjeta p-5 sm:p-6">
        <FormularioLogin />
      </div>
    </main>
  );
}
