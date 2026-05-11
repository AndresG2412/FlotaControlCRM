// firebase/informacion.ts
import { db } from "@/firebase/config";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

export interface CampoInformacion {
  etiqueta: string;
  valor: string;
}

export interface InformacionDoc {
  campos: CampoInformacion[];
}

const DOC_ID = "buseta_actual";
const COLLECTION = "informacion";

// Datos iniciales para cuando la base de datos esté vacía
const DATOS_INICIALES: CampoInformacion[] = [
  { etiqueta: "Motor", valor: "NKR" },
  { etiqueta: "Puestos", valor: "18" },
  { etiqueta: "Dueño", valor: "Andres Camilo Gaviria Bolaños" },
  { etiqueta: "Numero Personal", valor: "3157870130" },
  { etiqueta: "Aceite", valor: "20W50 Mobil" },
];

export const getInformacion = async (): Promise<CampoInformacion[]> => {
  try {
    const docRef = doc(db, COLLECTION, DOC_ID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as InformacionDoc;
      return data.campos;
    } else {
      // Si no existe, creamos el documento con los datos iniciales
      await setDoc(docRef, { campos: DATOS_INICIALES });
      return DATOS_INICIALES;
    }
  } catch (error) {
    console.error("Error al obtener información:", error);
    throw error;
  }
};

export const updateInformacion = async (campos: CampoInformacion[]) => {
  try {
    const docRef = doc(db, COLLECTION, DOC_ID);
    await setDoc(docRef, { campos }, { merge: true });
  } catch (error) {
    console.error("Error al actualizar información:", error);
    throw error;
  }
};
