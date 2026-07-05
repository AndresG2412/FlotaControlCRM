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

export const finishViaje = async (viajeId: string, additionalData: any = {}) => {
    try {
        const docRef = doc(db, "Viajes", viajeId);
        await updateDoc(docRef, {
            estado: "finalizado",
            finishedAt: serverTimestamp(),
            ...additionalData
        });
        return { success: true };
    } catch (error) {
        console.error("Error finishing viaje:", error);
        return { success: false, error };
    }
};

export const updateViaje = async (viajeId: string, data: any) => {
    try {
        const docRef = doc(db, "Viajes", viajeId);
        await updateDoc(docRef, {
            ...data,
            updatedAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error("Error updating viaje:", error);
        return { success: false, error };
    }
};

export const getAllViajes = async () => {
    try {
        const q = query(
            collection(db, "Viajes")
        );
        // Note: Ideally we'd orderBy("createdAt", "desc") but that requires a composite index if filtered.
        // For now we just get them and sort them client-side or if no complex filters, server-side.
        const querySnapshot = await getDocs(q);
        const viajes: any[] = [];
        querySnapshot.forEach((doc) => {
            viajes.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort descending by createdAt
        viajes.sort((a, b) => {
            const timeA = a.createdAt?.toMillis() || 0;
            const timeB = b.createdAt?.toMillis() || 0;
            return timeB - timeA;
        });
        
        return viajes;
    } catch (error) {
        console.error("Error getting all viajes:", error);
        return [];
    }
};
