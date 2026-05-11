"use client"

import { useEffect, useState } from "react";
import Navbar from "@/app/components/Navbar";
import Container from "@/app/components/Container";
import { DRIVER_NAV_ITEMS, BUSETA_DATOS } from "@/app/constants/data";
import { getInformacion, CampoInformacion } from "@/firebase/informacion";

export default function InformacionPage() {
    const [campos, setCampos] = useState<CampoInformacion[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getInformacion();
                setCampos(data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    return (
        <div className="flex h-screen">
            <Navbar items={DRIVER_NAV_ITEMS} role="driver" />
            <Container>
                <div className="h-screen w-full flex items-center justify-center p-4">
                    <div className="border border-flota-border-focus bg-flota-surface rounded-2xl p-8 flex flex-col gap-y-6 w-full max-w-2xl shadow-xl">
                        
                        <div className="border-b border-flota-border-focus pb-4 text-center md:text-left">
                            <h1 className="text-4xl font-secundario tracking-wider font-bold text-white">
                                Buseta {BUSETA_DATOS.Numero_Buseta}
                            </h1>
                            <p className="text-flota-textSecondary font-medium">
                                {BUSETA_DATOS.Empresa} • {BUSETA_DATOS.Placa} • Modelo {BUSETA_DATOS.Modelo}
                            </p>
                        </div>

                        {loading ? (
                            <div className="text-center py-10 text-gray-400">Cargando información...</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {campos.map((campo, index) => (
                                    <div key={index} className="bg-white/5 p-4 rounded-xl border border-flota-border-focus/30">
                                        <p className="text-xs text-flota-blue font-bold uppercase tracking-widest mb-1">{campo.etiqueta}</p>
                                        <p className="text-lg text-white font-medium">{campo.valor}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </Container>
        </div>
    );
}