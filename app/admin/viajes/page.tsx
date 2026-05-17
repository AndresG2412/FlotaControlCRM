"use client";

import { useEffect, useState } from "react";
import Navbar from "@/app/components/Navbar";
import Container from "@/app/components/Container";
import { ADMIN_NAV_ITEMS } from "@/app/constants/data";
import { getAllViajes } from "@/firebase/driver/viaje";
import CardViaje from "@/app/components/CardViaje";
import ModalViaje from "@/app/components/ModalViaje";

export default function ViajesAdminPage() {
    const [viajes, setViajes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedViaje, setSelectedViaje] = useState<any | null>(null);

    useEffect(() => {
        const fetchViajes = async () => {
            setLoading(true);
            const data = await getAllViajes();
            setViajes(data);
            setLoading(false);
        };
        fetchViajes();
    }, []);

    const activos = viajes.filter(v => v.estado === "activo");
    const finalizados = viajes.filter(v => v.estado === "finalizado");

    return (
        <div className="flex h-screen">
            <Navbar items={ADMIN_NAV_ITEMS} role="admin" />
            <Container>
                <div className="flex mx-auto flex-col gap-y-5 justify-start items-center w-full mb-6 py-6 h-full overflow-y-auto custom-scrollbar">
                    
                    <div className="w-full mt-4 mb-2">
                        <h1 className="text-4xl text-start font-secundario tracking-wider font-bold text-white mb-2">
                            Historial de Viajes
                        </h1>
                    </div>

                    {loading ? (
                        <div className="text-gray-400 text-center py-10 w-full">Cargando viajes...</div>
                    ) : viajes.length === 0 ? (
                        <div className="text-center text-gray-500 py-10 w-full border border-dashed border-flota-border-focus rounded-2xl">
                            No hay viajes registrados en el sistema.
                        </div>
                    ) : (
                        <div className="w-full space-y-10">
                            
                            {activos.length > 0 && (
                                <div>
                                    <h2 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-2">Viaje en Curso</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {activos.map(viaje => (
                                            <CardViaje 
                                                key={viaje.id} 
                                                viaje={viaje} 
                                                onClick={() => setSelectedViaje(viaje)} 
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {finalizados.length > 0 && (
                                <div>
                                    <h2 className="text-xl font-bold text-gray-300 mb-4 border-b border-white/10 pb-2">Viajes Finalizados</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {finalizados.map(viaje => (
                                            <CardViaje 
                                                key={viaje.id} 
                                                viaje={viaje} 
                                                onClick={() => setSelectedViaje(viaje)} 
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>
                    )}
                </div>

                {/* Modal de Detalle */}
                {selectedViaje && (
                    <ModalViaje 
                        viaje={selectedViaje} 
                        onClose={() => setSelectedViaje(null)} 
                    />
                )}
            </Container>
        </div>
    );
}