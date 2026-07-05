"use client";

import { Plus, ArrowRight, Check, DollarSign } from "lucide-react";
import Navbar from "@/app/components/Navbar"
import { DRIVER_NAV_ITEMS } from "@/app/constants/data"
import Button from "@/app/components/Button";
import Tittle from "@/app/components/Tittle";
import Container from "@/app/components/Container";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getActiveViaje, finishViaje, updateViaje } from "@/firebase/driver/viaje";
import Swal from "sweetalert2";
import ModalFinalizar from "@/app/components/ModalFinalizar";

export default function RutaPage() {
  const router = useRouter();
  const [activeViaje, setActiveViaje] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);
  const [finalizarLoading, setFinalizarLoading] = useState(false);

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

  const handleFinalizar = () => {
    if (!activeViaje) return;
    setShowFinalizarModal(true);
  };

  const handleConfirmFinalizar = async (closingData: { ligas: number; polillaFinal: number; extrasFinal: any[] }) => {
    if (!activeViaje) return;

    setFinalizarLoading(true);
    const res = await finishViaje(activeViaje.id, closingData);
    setFinalizarLoading(false);

    if (res.success) {
      setShowFinalizarModal(false);
      Swal.fire({
        title: '¡Viaje Finalizado!',
        text: 'El viaje ha sido cerrado con la información proporcionada.',
        icon: 'success',
        background: '#000000',
        color: '#ffffff',
        confirmButtonColor: '#3b82f6'
      });
      fetchActiveViaje(); // Refresh state
    } else {
      Swal.fire({
        title: 'Error',
        text: 'No se pudo finalizar el viaje. Por favor intenta nuevamente.',
        icon: 'error',
        background: '#000000',
        color: '#ffffff',
        confirmButtonColor: '#ef4444'
      });
    }
  };

  const handleAgregar = async () => {
    if (!activeViaje) return;

    const { value: dineroNeto } = await Swal.fire({
      title: 'Agregar Dinero Neto',
      input: 'number',
      inputLabel: 'Ingresa el valor del dinero neto',
      inputPlaceholder: 'Ej. 50000',
      showCancelButton: true,
      background: '#000000',
      color: '#ffffff',
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Agregar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value || isNaN(parseFloat(value)) || parseFloat(value) <= 0) {
          return 'Debes ingresar un valor válido y mayor a 0';
        }
      }
    });

    if (dineroNeto) {
      const nuevoMonto = parseFloat(dineroNeto);
      const montoActual = activeViaje.dineroExtra || 0;
      
      // Crear un historial de los extras añadidos
      const nuevoRegistro = {
        monto: nuevoMonto,
        fecha: new Date().toISOString()
      };
      const historialExtras = activeViaje.historialExtras ? [...activeViaje.historialExtras, nuevoRegistro] : [nuevoRegistro];

      const res = await updateViaje(activeViaje.id, { 
        dineroExtra: montoActual + nuevoMonto,
        historialExtras: historialExtras
      });
      
      if (res.success) {
        Swal.fire({
          title: '¡Agregado!',
          text: `Se agregó $${nuevoMonto} al dinero neto del viaje`,
          icon: 'success',
          background: '#000000',
          color: '#ffffff',
          confirmButtonColor: '#3b82f6'
        });
        fetchActiveViaje(); // Actualizamos el estado para ver los cambios
      } else {
        Swal.fire({
          title: 'Error',
          text: 'No se pudo guardar la información',
          icon: 'error',
          background: '#000000',
          color: '#ffffff',
          confirmButtonColor: '#ef4444'
        });
      }
    }
  };

  const calculateTotalGasolina = (v: any) => {
    if (!v) return 0;
    let total = 0;
    for (let i = 1; i <= (v.paradasCount || 0); i++) {
      const gas = parseFloat(v[`Gasolina ${i}`]) || 0;
      total += gas;
    }
    if (total === 0 && v.Gasolina) {
      total = parseFloat(v.Gasolina) || 0;
    }
    return total;
  };

  return (
    <div className="flex h-screen">
      <Navbar items={DRIVER_NAV_ITEMS} role={"driver"} />
      <Container>
        {/* Header fijo arriba */}
        {!loading && !activeViaje && (
            <div className="flex w-full max-w-2xl mx-auto flex-col gap-y-5 justify-center items-center flex-1 h-screen mb-6">
            <div className="border rounded-2xl p-8 flex flex-col gap-y-8 justify-center items-center w-full bg-flota-elevated border-flota-border-focus">
              <p className="text-4xl font-secundario tracking-wider text-center">Gestion de Rutas</p>
              <Button text="Nueva Ruta" onClick={() => { router.push("/driver/ruta/nueva_ruta") }} icon={<Plus />} />
            </div>
          </div>
        )}

        {/* Área de contenido scrolleable */}

        
        {!loading && activeViaje && (
          <div className="flex flex-col justify-center items-center flex-1 mx-auto w-full max-w-2xl h-screen">            
            <div className="mb-6">
              <p className="text-4xl font-secundario tracking-wider text-center">{activeViaje ? "Viaje Activo" : "Estado"}</p>
            </div>

            {loading ? (
              <div className="text-gray-400 text-sm">Cargando...</div>
            ) : activeViaje ? (
              <div className="bg-flota-elevated border border-flota-border-focus rounded-2xl p-6 shadow-sm w-full max-w-2xl">
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
                    <p className="text-xs text-gray-400 mb-1">Gasolina Total</p>
                    <p className="text-sm font-semibold text-white">${calculateTotalGasolina(activeViaje).toLocaleString()}</p>
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

                <Button
                  text="Continuar Viaje"
                  onClick={handleContinuar}
                  icon={<ArrowRight size={16} />}
                />
                <div className="w-full flex gap-3 mt-4">
                  {/* <button
                    onClick={handleAgregar}
                    className="flex w-1/2 justify-center items-center gap-2 px-4 py-2 bg-blue-600 text-white border border-blue-600 rounded-lg hover:bg-blue-800 hover:text-white transition-colors text-sm font-medium"
                  >
                    <Plus size={16} />
                    Agregar
                  </button> */}
                  <button
                    onClick={handleFinalizar}
                    className="flex w-full justify-center items-center gap-2 px-4 py-2 bg-red-600 text-white border border-red-600 rounded-lg hover:bg-red-800 hover:text-white transition-colors text-sm font-medium"
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
        
        {/* Modal para finalizar viaje */}
        <ModalFinalizar
          isOpen={showFinalizarModal}
          onClose={() => setShowFinalizarModal(false)}
          onConfirm={handleConfirmFinalizar}
          loading={finalizarLoading}
        />
      </Container>
    </div>
  )
}