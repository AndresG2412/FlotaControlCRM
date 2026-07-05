// firebase/driver/mantenimiento.ts
import { db } from "@/firebase/config";
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy } from "firebase/firestore";

export interface MantenimientoData {
  nombreRepuesto: string;
  categoria: string;
  precio: number;
  photoUrl?: string | null;
  viajeId?: string;
}

export interface MantenimientoWithId extends MantenimientoData {
  id: string;
  createdAt?: any;
}

// Agregar mantenimiento (ya existente)
export const addMantenimiento = async (data: MantenimientoData) => {
  try {
    const docRef = await addDoc(collection(db, "mantenimientos"), {
      ...data,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding maintenance: ", error);
    throw error;
  }
};

// Obtener todos los mantenimientos (solo lectura)
export const getMantenimientos = async (): Promise<MantenimientoWithId[]> => {
  try {
    const q = query(collection(db, "mantenimientos"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const mantenimientos: MantenimientoWithId[] = [];
    querySnapshot.forEach((doc) => {
      mantenimientos.push({
        id: doc.id,
        ...doc.data(),
      } as MantenimientoWithId);
    });
    return mantenimientos;
  } catch (error) {
    console.error("Error fetching mantenimientos: ", error);
    throw error;
  }
};