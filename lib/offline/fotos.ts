// Fotos de evidencia (planillas, recibos, repuestos). Se comprimen en el celular,
// se guardan en IndexedDB y se suben a Storage cuando hay señal. El registro
// lleva desde el principio la ruta final ({uid}/{uuid}.webp), así no hay que
// esperar la subida para sincronizarlo.

import type { BaseLocal } from "./db";

export const MAX_BYTES_FOTO = 5 * 1024 * 1024; // límite del bucket evidencias

/** Reduce a 1600 px por lado y convierte a WebP. Si el navegador no puede, deja el original. */
export async function comprimirImagen(archivo: Blob, { ladoMaximo = 1600, calidad = 0.7 } = {}): Promise<Blob> {
  if (typeof createImageBitmap === "undefined" || typeof OffscreenCanvas === "undefined") return archivo;
  const imagen = await createImageBitmap(archivo);
  const escala = Math.min(1, ladoMaximo / Math.max(imagen.width, imagen.height));
  const lienzo = new OffscreenCanvas(Math.round(imagen.width * escala), Math.round(imagen.height * escala));
  lienzo.getContext("2d")?.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
  imagen.close();
  return lienzo.convertToBlob({ type: "image/webp", quality: calidad });
}

/** Comprime y guarda la foto; devuelve la ruta para el campo foto_path del registro. */
export async function guardarFoto(db: BaseLocal, archivo: Blob, uid: string): Promise<string> {
  const blob = await comprimirImagen(archivo);
  if (blob.size > MAX_BYTES_FOTO) throw new Error("La foto pesa más de 5 MB");
  const extension = blob.type === "image/png" ? "png" : blob.type === "image/jpeg" ? "jpg" : "webp";
  const ruta = `${uid}/${crypto.randomUUID()}.${extension}`;
  await db.fotos.put({ ruta, blob, estado: "pendiente", intentos: 0, error: null, creadoEn: new Date().toISOString() });
  return ruta;
}

/** Sube a Storage. "Ya existe" cuenta como éxito: reenviar no duplica. */
export type Subir = (ruta: string, blob: Blob) => Promise<void>;

export async function subirFotos(db: BaseLocal, subir: Subir): Promise<{ subidas: number; sinConexion: boolean }> {
  const pendientes = await db.fotos.where("estado").equals("pendiente").toArray();
  let subidas = 0;
  for (const foto of pendientes) {
    try {
      await subir(foto.ruta, foto.blob);
      await db.fotos.delete(foto.ruta);
      subidas++;
    } catch (e) {
      if (e instanceof TypeError) return { subidas, sinConexion: true }; // sin red
      await db.fotos.update(foto.ruta, {
        intentos: foto.intentos + 1,
        estado: foto.intentos + 1 >= 5 ? "error" : "pendiente",
        error: e instanceof Error ? e.message : "No se pudo subir",
      });
    }
  }
  return { subidas, sinConexion: false };
}
