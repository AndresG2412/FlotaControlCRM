import { z } from "zod";

/** Dominio interno de las cuentas: los conductores entran solo con su usuario. */
export const DOMINIO_CUENTAS = "flotacontrol.local";

export const esquemaLogin = z.object({
  usuario: z
    .string({ error: "Escribe tu usuario" })
    .trim()
    .toLowerCase()
    .min(1, "Escribe tu usuario")
    .max(120),
  contrasena: z
    .string({ error: "Escribe tu contraseña" })
    .min(1, "Escribe tu contraseña")
    .max(200),
});

/** "pedro" → "pedro@flotacontrol.local"; un correo completo se deja igual. */
export function correoDeUsuario(usuario: string): string {
  return usuario.includes("@") ? usuario : `${usuario}@${DOMINIO_CUENTAS}`;
}
