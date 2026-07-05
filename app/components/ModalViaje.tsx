import { X, ChevronLeft, ChevronRight, DollarSign, Users, Clock, MapPin, CheckCircle, Navigation, Fuel } from "lucide-react";
import { useState } from "react";

interface ModalViajeProps {
    viaje: any;
    onClose: () => void;
}

export default function ModalViaje({ viaje, onClose }: ModalViajeProps) {
    const [currentPage, setCurrentPage] = useState(1);

    // Extract stops into an array
    const paradas = [];
    let totalNeto = parseFloat(viaje.dineroExtra) || 0;
    let totalGasolina = 0;

    for (let i = 1; i <= viaje.paradasCount; i++) {
        // We only add it if at least the terminal exists for that index
        if (viaje[`Terminal ${i}`]) {
            const neto = parseFloat(viaje[`Neto ${i}`]) || 0;
            totalNeto += neto;
            totalGasolina += parseFloat(viaje[`Gasolina ${i}`]) || 0;
            paradas.push({
                index: i,
                terminal: viaje[`Terminal ${i}`],
                hora: viaje[`Hora ${i}`],
                pasajeros: viaje[`Pasajeros ${i}`],
                gasolina: viaje[`Gasolina ${i}`],
                polilla: viaje[`Polilla ${i}`],
                neto: neto
            });
        }
    }

    if (totalGasolina === 0 && viaje.Gasolina) {
        totalGasolina = parseFloat(viaje.Gasolina) || 0;
    }

    // Closing details calculations for finalized viajes
    const PEAJES = 35000;
    const CONDUCES = 250000;
    const VIATICOS = 140000;
    const PAGOS = 350000;
    const LAVADAS = 50000;
    const PARQUEOS = 20000;
    const GASTOS_FIJOS_SUM = PEAJES + CONDUCES + VIATICOS + PAGOS + LAVADAS + PARQUEOS; // 845,000

    const ligas = parseFloat(viaje.ligas) || 0;
    const polillaFinal = parseFloat(viaje.polillaFinal) || 0;

    let totalExtrasFinales = 0;
    if (viaje.extrasFinal && Array.isArray(viaje.extrasFinal)) {
        totalExtrasFinales = viaje.extrasFinal.reduce((sum: number, ext: any) => sum + (parseFloat(ext.valor) || 0), 0);
    }

    const liquidacionFinal = totalNeto - GASTOS_FIJOS_SUM - ligas - totalExtrasFinales + polillaFinal;

    // The total number of pages is the number of stops + 1 for the summary page
    const totalPages = paradas.length + 1;

    const isSummaryPage = currentPage === totalPages;
    const currentStop = isSummaryPage ? null : paradas[currentPage - 1];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-flota-surface border border-flota-border-focus rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">

                {/* Header */}
                <div className="flex justify-between items-center py-2 px-5 border-b border-white/5 bg-black/20">
                    <div>
                        <h2 className="text-xl tracking-wider font-secundario font-bold text-white flex items-center gap-2">
                            <Navigation size={20} className="text-flota-blue" />
                            Detalles del Viaje
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 min-h-[300px] flex flex-col justify-center relative">

                    {!isSummaryPage && currentStop && (
                        <div className="animate-fade-in">
                            <div className="text-center flex gap-3 items-center justify-center mb-6">
                                <span className="bg-flota-blue/20 text-flota-blue px-3 py-1 rounded-full text-xs font-bold border border-flota-blue/30">
                                    PARADA {currentStop.index} DE {paradas.length}
                                </span>
                                <h3 className="text-3xl font-bold text-white text-center truncate">
                                    {currentStop.terminal}
                                </h3>
                            </div>

                            <div className="space-y-4">
                                {currentStop.hora && (
                                    <div className="flex justify-between items-center bg-black/30 p-4 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-3 text-gray-400">
                                            <Clock size={18} />
                                            <span>Hora Registrada</span>
                                        </div>
                                        <span className="text-white font-medium">{currentStop.hora}</span>
                                    </div>
                                )}

                                {currentStop.pasajeros !== undefined && currentStop.pasajeros !== null && (
                                    <div className="flex justify-between items-center bg-black/30 p-4 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-3 text-gray-400">
                                            <Users size={18} />
                                            <span>Pasajeros</span>
                                        </div>
                                        <span className="text-white font-medium">{currentStop.pasajeros}</span>
                                    </div>
                                )}

                                {currentStop.gasolina !== undefined && currentStop.gasolina !== null && (
                                    <div className="flex justify-between items-center bg-black/30 p-4 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-3 text-gray-400">
                                            <Fuel size={18} />
                                            <span>Gasolina</span>
                                        </div>
                                        <span className="text-white font-medium">${currentStop.gasolina.toLocaleString()}</span>
                                    </div>
                                )}

                                {currentStop.polilla !== undefined && currentStop.polilla !== null && (
                                    <div className="flex justify-between items-center bg-black/30 p-4 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-3 text-gray-400">
                                            <DollarSign size={18} className="text-red-400" />
                                            <span>Polilla</span>
                                        </div>
                                        <span className="text-red-400 font-medium">${currentStop.polilla.toLocaleString()}</span>
                                    </div>
                                )}

                                <div className="flex justify-between items-center bg-black/30 p-4 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-3 text-gray-400">
                                        <DollarSign size={18} className="text-green-500" />
                                        <span>Ingreso Neto</span>
                                    </div>
                                    <span className="text-green-400 font-bold text-lg">${currentStop.neto.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {isSummaryPage && (
                        <div className="animate-fade-in flex flex-col items-center justify-center text-center">
                            <h3 className="text-2xl font-bold text-white mb-2">Resumen del Viaje</h3>

                            {viaje.estado === "activo" ? (
                                <p className="text-amber-400 text-sm mb-6 bg-amber-400/10 px-4 py-2 rounded-lg border border-amber-400/20">
                                    Este viaje sigue en curso. El total actual es temporal.
                                </p>
                            ) : (
                                <p className="text-green-400 text-sm mb-6 bg-green-400/10 px-4 py-1 rounded-lg border border-green-400/20">
                                    Este viaje ha sido finalizado correctamente.
                                </p>
                            )}

                            {viaje.estado === "finalizado" ? (
                                <div className="w-full grid grid-cols-2 gap-3 mb-4">
                                    <div className="bg-black/30 p-3 rounded-2xl border border-white/5">
                                        <p className="text-[10px] text-gray-400 mb-1 uppercase tracking-wider">Ingresos Netos</p>
                                        <p className="text-xl font-bold text-green-400">${totalNeto.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-black/30 p-3 rounded-2xl border border-flota-blue/30 shadow-[0_0_10px_rgba(59,130,246,0.1)]">
                                        <p className="text-[10px] text-gray-400 mb-1 uppercase tracking-wider">Liquidación Final</p>
                                        <p className={`text-xl font-bold ${liquidacionFinal >= 0 ? 'text-flota-blue' : 'text-red-400'}`}>
                                            ${liquidacionFinal.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full bg-black/30 p-3 rounded-2xl border border-white/5 mb-4">
                                    <p className="text-sm text-gray-400 mb-2">Total Ingresos Netos</p>
                                    <p className="text-4xl font-bold text-green-400">${totalNeto.toLocaleString()}</p>
                                </div>
                            )}

                            <div className="w-full grid grid-cols-2 gap-3">
                                <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                    <p className="text-xs text-gray-500 mb-1">Gasolina Total</p>
                                    <p className="text-sm text-white font-medium">${totalGasolina.toLocaleString()}</p>
                                </div>
                                <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                    <p className="text-xs text-gray-500 mb-1">Total Paradas</p>
                                    <p className="text-sm text-white font-medium">{paradas.length}</p>
                                </div>
                                {viaje.dineroExtra ? (
                                    <div className="bg-black/20 p-3 rounded-xl border border-white/5 col-span-2">
                                        <p className="text-xs text-gray-500 mb-1">Dinero Extra Agregado</p>
                                        <p className="text-sm text-green-400 font-medium">+ ${viaje.dineroExtra}</p>
                                    </div>
                                ) : null}

                                {viaje.estado === "finalizado" && (
                                    <div className="bg-black/20 p-3 rounded-xl border border-white/5 col-span-2 text-left">
                                        <p className="text-xs text-gray-500 mb-2 font-bold uppercase tracking-wider">Gastos Fijos Descontados</p>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-400">
                                            <div className="flex justify-between">
                                                <span>Peajes:</span>
                                                <span className="text-white font-medium">$35,000</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Conduces:</span>
                                                <span className="text-white font-medium">$250,000</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Viáticos:</span>
                                                <span className="text-white font-medium">$140,000</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Pagos:</span>
                                                <span className="text-white font-medium">$350,000</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Lavadas:</span>
                                                <span className="text-white font-medium">$50,000</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Parqueos:</span>
                                                <span className="text-white font-medium">$20,000</span>
                                            </div>
                                            <div className="col-span-2 border-t border-white/5 mt-1.5 pt-1.5 flex justify-between font-bold text-red-400">
                                                <span>Total Gastos Fijos:</span>
                                                <span>-$845,000</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {viaje.ligas !== undefined && viaje.ligas !== null && (
                                    <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                        <p className="text-xs text-gray-500 mb-1">Ligas (Descontado)</p>
                                        <p className="text-sm text-red-400 font-medium">-${viaje.ligas.toLocaleString()}</p>
                                    </div>
                                )}
                                {viaje.polillaFinal !== undefined && viaje.polillaFinal !== null && (
                                    <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                        <p className="text-xs text-gray-500 mb-1">Polilla (Sumado)</p>
                                        <p className="text-sm text-green-400 font-medium">+${viaje.polillaFinal.toLocaleString()}</p>
                                    </div>
                                )}
                                {viaje.extrasFinal && viaje.extrasFinal.length > 0 && (
                                    <div className="bg-black/20 p-3 rounded-xl border border-white/5 col-span-2 text-left">
                                        <p className="text-xs text-gray-500 mb-2 font-bold uppercase tracking-wider">Otros Extras (Descontado)</p>
                                        <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1">
                                            {viaje.extrasFinal.map((ext: any, idx: number) => (
                                                <div key={idx} className="flex justify-between text-xs text-white">
                                                    <span className="text-gray-400">{ext.nombre}</span>
                                                    <span className="text-red-400 font-medium">-${ext.valor.toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Pagination */}
                <div className="flex justify-between items-center py-1 px-4 border-t border-white/5 bg-black/20">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className={`p-2 rounded-lg flex items-center justify-center transition-colors ${currentPage === 1 ? 'text-gray-600 cursor-not-allowed' : 'text-white hover:bg-white/10'
                            }`}
                    >
                        <ChevronLeft size={24} />
                    </button>

                    <div className="flex gap-1.5">
                        {Array.from({ length: totalPages }).map((_, idx) => (
                            <div
                                key={idx}
                                className={`w-2 h-2 rounded-full transition-all ${currentPage === idx + 1
                                        ? 'bg-flota-blue w-6'
                                        : 'bg-gray-600'
                                    }`}
                            />
                        ))}
                    </div>

                    <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className={`p-2 rounded-lg flex items-center justify-center transition-colors ${currentPage === totalPages ? 'text-gray-600 cursor-not-allowed' : 'text-white hover:bg-white/10'
                            }`}
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>
            </div>
        </div>
    );
}
