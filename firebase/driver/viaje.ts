import { db } from "../config";
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit, doc, updateDoc } from "firebase/firestore";

export const createViaje = async (viajeData: any) => {
    try {
        const docRef = await addDoc(collection(db, "Viajes"), {
            ...viajeData,
            estado: "activo",
            paradasCount: 1,
            createdAt: serverTimestamp()
        });
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error("Error creating viaje:", error);
        return { success: false, error };
    }
};

export const getActiveViaje = async () => {
    try {
        const q = query(
            collection(db, "Viajes"),
            where("estado", "==", "activo"),
            limit(1)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    } catch (error) {
        console.error("Error getting active viaje:", error);
        return null;
    }
};

export const addStopToViaje = async (viajeId: string, stopData: any, newCount: number) => {
    try {
        const docRef = doc(db, "Viajes", viajeId);
        await updateDoc(docRef, {
            ...stopData,
            paradasCount: newCount,
            updatedAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error("Error adding stop to viaje:", error);
        return { success: false, error };
    }
};

export const finishViaje = async (viajeId: string) => {
    try {
        const docRef = doc(db, "Viajes", viajeId);
        await updateDoc(docRef, {
            estado: "finalizado",
            finishedAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error("Error finishing viaje:", error);
        return { success: false, error };
    }
};
