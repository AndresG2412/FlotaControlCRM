"use client";

import { Plus, ArrowRight, Check } from "lucide-react";
import Navbar from "@/app/components/Navbar"
import { DRIVER_NAV_ITEMS } from "@/app/constants/data"
import Button from "@/app/components/Button";
import Tittle from "@/app/components/Tittle";
import Container from "@/app/components/Container";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getActiveViaje, finishViaje } from "@/firebase/driver/viaje";
import Swal from "sweetalert2";

export default function RutaPage() {
  const router = useRouter();
  const [activeViaje, setActiveViaje] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchActiveViaje = async () => {
    setLoading(true);
    const viaje = await getActiveViaje();
    setActiveViaje(viaje);
    setLoading(false);
  };

  useEffect(() => {
    fetchActiveViaje();
  }, []);

  const handleContinuar = () => {
    if (activeViaje) {
      router.push(`/driver/ruta/nueva_ruta?viajeId=${activeViaje.id}&stop=${activeViaje.paradasCount + 1}`);
    }
  };

  const handleFinalizar = async () => {
    if (!activeViaje) return;

    const result = await Swal.fire({
      title: '¿Finalizar Viaje?',
      text: "No podrás agregar más paradas a este viaje",
      icon: 'warning',
      showCancelButton: true,
      background: '#000000',
      color: '#ffffff',
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Sí, finalizar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      const res = await finishViaje(activeViaje.id);
      if (res.success) {
        Swal.fire({
          title: '¡Viaje Finalizado!',
          icon: 'success',
          background: '#000000',
          color: '#ffffff',
          confirmButtonColor: '#3b82f6'
        });
        fetchActiveViaje(); // Refresh state
      }
    }
  };

  return (
    <div className="flex h-screen">
      <Navbar items={DRIVER_NAV_ITEMS} role={"driver"} />
      <Container>
        {/* Header fijo arriba */}
        {!loading && !activeViaje && (
            <div className="flex w-2/4 mx-auto flex-col gap-y-5 justify-center items-center flex-1 h-screen mb-6">
            <div className="border rounded-2xl p-8 flex flex-col gap-y-8 justify-center items-center w-full bg-flota-elevated border-flota-border-focus">
              <p className="text-4xl font-secundario tracking-wider text-center">Gestion de Rutas</p>
              <Button text="Nueva Ruta" onClick={() => { router.push("/driver/ruta/nueva_ruta") }} icon={<Plus />} />
            </div>
          </div>
        )}

        {/* Área de contenido scrolleable */}

        
        {!loading && activeViaje && (
          <div className="flex flex-col justify-center items-center flex-1 mx-auto w-2/4 h-screen">            
            <div className="mb-6">
              <p className="text-4xl font-secundario tracking-wider text-center">{activeViaje ? "Viaje Activo" : "Estado"}</p>
            </div>

            {loading ? (
              <div className="text-gray-400 text-sm">Cargando...</div>
            ) : activeViaje ? (
              <div className="bg-flota-elevated border border-flota-border-focus rounded-2xl p-6 shadow-sm max-w-2xl">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">Viaje en Curso</h3>
                    <p className="text-sm text-gray-400">ID: {activeViaje.id}</p>
                  </div>
                  <span className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-xs font-medium border border-green-500/20">
                    Activo
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-black/20 p-3 rounded-lg border border-flota-border-focus">
                    <p className="text-xs text-gray-400 mb-1">Gasolina Inicial</p>
                    <p className="text-sm font-semibold text-white">${activeViaje.Gasolina}</p>
                  </div>
                  <div className="bg-black/20 p-3 rounded-lg border border-flota-border-focus">
                    <p className="text-xs text-gray-400 mb-1">Paradas Registradas</p>
                    <p className="text-sm font-semibold text-white">{activeViaje.paradasCount}</p>
                  </div>
                  <div className="bg-black/20 p-3 rounded-lg border border-flota-border-focus col-span-2">
                    <p className="text-xs text-gray-400 mb-1">Última Parada</p>
                    <p className="text-sm font-semibold text-white">
                      {activeViaje[`Terminal ${activeViaje.paradasCount}`] || 'N/A'} - {activeViaje[`Hora ${activeViaje.paradasCount}`] || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    text="Continuar Viaje"
                    onClick={handleContinuar}
                    icon={<ArrowRight size={16} />}
                  />
                  <button
                    onClick={handleFinalizar}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white border border-red-600 rounded-lg hover:bg-red-800 hover:text-white transition-colors text-sm font-medium"
                  >
                    <Check size={16} />
                    Finalizar
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 italic text-sm">
                No hay un viaje activo. Comienza uno nuevo para registrar paradas.
              </div>
            )}
          </div>
        )}
        
      </Container>
    </div>
  )
}