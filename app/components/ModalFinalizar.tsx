import React, { useState } from "react";
import { X, DollarSign, Plus, Trash2, ClipboardList } from "lucide-react";
import Swal from "sweetalert2";

interface ExtraItem {
    nombre: string;
    valor: number;
}

interface ModalFinalizarProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: { ligas: number; polillaFinal: number; extrasFinal: ExtraItem[] }) => void;
    loading?: boolean;
}

export default function ModalFinalizar({ isOpen, onClose, onConfirm, loading = false }: ModalFinalizarProps) {
    const [ligas, setLigas] = useState("");
    const [polilla, setPolilla] = useState("");
    const [extras, setExtras] = useState<ExtraItem[]>([]);
    
    // Local state for the "Add Extra" sub-form
    const [extraNombre, setExtraNombre] = useState("");
    const [extraValor, setExtraValor] = useState("");

    if (!isOpen) return null;

    const handleAddExtra = () => {
        if (!extraNombre.trim()) {
            Swal.fire({
                title: "Error",
                text: "Por favor ingresa una descripción para el extra.",
                icon: "error",
                background: "#000000",
                color: "#ffffff",
                confirmButtonColor: "#3b82f6"
            });
            return;
        }

        const value = parseFloat(extraValor);
        if (isNaN(value) || value <= 0) {
            Swal.fire({
                title: "Error",
                text: "Por favor ingresa un valor numérico mayor a 0.",
                icon: "error",
                background: "#000000",
                color: "#ffffff",
                confirmButtonColor: "#3b82f6"
            });
            return;
        }

        setExtras(prev => [...prev, { nombre: extraNombre.trim(), valor: value }]);
        setExtraNombre("");
        setExtraValor("");
    };

    const handleRemoveExtra = (indexToRemove: number) => {
        setExtras(prev => prev.filter((_, idx) => idx !== indexToRemove));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const ligasVal = parseFloat(ligas);
        if (!ligas || isNaN(ligasVal) || ligasVal < 0) {
            Swal.fire({
                title: "Campo requerido",
                text: "Por favor ingresa un valor válido para Ligas (mayor o igual a 0).",
                icon: "error",
                background: "#000000",
                color: "#ffffff",
                confirmButtonColor: "#3b82f6"
            });
            return;
        }

        const polillaVal = parseFloat(polilla);
        if (!polilla || isNaN(polillaVal) || polillaVal < 0) {
            Swal.fire({
                title: "Campo requerido",
                text: "Por favor ingresa un valor válido para Polilla (mayor o igual a 0).",
                icon: "error",
                background: "#000000",
                color: "#ffffff",
                confirmButtonColor: "#3b82f6"
            });
            return;
        }

        onConfirm({
            ligas: ligasVal,
            polillaFinal: polillaVal,
            extrasFinal: extras
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-flota-surface border border-flota-border-focus rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex justify-between items-center py-4 px-5 border-b border-white/5 bg-black/20">
                    <h2 className="text-xl tracking-wider font-secundario font-bold text-white flex items-center gap-2">
                        <ClipboardList size={20} className="text-red-500" />
                        Finalizar Viaje
                    </h2>
                    <button
                        onClick={onClose}
                        type="button"
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                        disabled={loading}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto flex-1 text-white">
                    
                    {/* Ligas */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="modal-ligas" className="text-xs font-semibold text-gray-300">
                            Ligas *
                        </label>
                        <div className="flex items-center border border-flota-border-focus rounded-lg overflow-hidden bg-black/20 h-[38px] focus-within:ring-1 focus-within:ring-flota-border-focus transition-all">
                            <span className="px-2.5 py-2 text-xs text-gray-400 border-r border-flota-border-focus select-none bg-black/10">
                                $
                            </span>
                            <input
                                type="number"
                                id="modal-ligas"
                                value={ligas}
                                onChange={e => setLigas(e.target.value)}
                                placeholder="0.00"
                                min={0}
                                step="0.01"
                                className="flex-1 px-3 py-2 text-xs bg-transparent outline-none placeholder:text-gray-600 text-white h-full"
                                required
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {/* Polilla */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="modal-polilla" className="text-xs font-semibold text-gray-300">
                            Polilla *
                        </label>
                        <div className="flex items-center border border-flota-border-focus rounded-lg overflow-hidden bg-black/20 h-[38px] focus-within:ring-1 focus-within:ring-flota-border-focus transition-all">
                            <span className="px-2.5 py-2 text-xs text-gray-400 border-r border-flota-border-focus select-none bg-black/10">
                                $
                            </span>
                            <input
                                type="number"
                                id="modal-polilla"
                                value={polilla}
                                onChange={e => setPolilla(e.target.value)}
                                placeholder="0.00"
                                min={0}
                                step="0.01"
                                className="flex-1 px-3 py-2 text-xs bg-transparent outline-none placeholder:text-gray-600 text-white h-full"
                                required
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {/* Divider */}
                    <hr className="border-white/5 my-2" />

                    {/* Extras Section */}
                    <div className="flex flex-col gap-2">
                        <span className="text-xs font-bold text-white tracking-wide uppercase">Extras</span>
                        
                        {/* Add Extra form row */}
                        <div className="grid grid-cols-2 gap-2 bg-black/10 p-3 rounded-xl border border-white/5">
                            <div className="flex flex-col gap-1 col-span-2">
                                <label className="text-[10px] text-gray-400 font-semibold uppercase">Descripción del Extra</label>
                                <input
                                    type="text"
                                    placeholder="Ej: arreglo televisor"
                                    value={extraNombre}
                                    onChange={e => setExtraNombre(e.target.value)}
                                    className="border border-flota-border-focus rounded-lg px-2.5 py-1.5 text-xs bg-black/35 outline-none focus:ring-1 focus:ring-flota-border-focus text-white h-[32px]"
                                    disabled={loading}
                                />
                            </div>
                            
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] text-gray-400 font-semibold uppercase">Valor</label>
                                <div className="flex items-center border border-flota-border-focus rounded-lg overflow-hidden bg-black/35 h-[32px] focus-within:ring-1 focus-within:ring-flota-border-focus transition-all">
                                    <span className="px-2 py-1 text-[10px] text-gray-400 border-r border-flota-border-focus select-none bg-black/10">
                                        $
                                    </span>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={extraValor}
                                        onChange={e => setExtraValor(e.target.value)}
                                        min={0}
                                        className="flex-1 px-2.5 py-1 text-xs bg-transparent outline-none text-white h-full"
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <div className="flex items-end justify-end">
                                <button
                                    type="button"
                                    onClick={handleAddExtra}
                                    className="flex w-full items-center justify-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all h-[32px]"
                                    disabled={loading}
                                >
                                    <Plus size={14} />
                                    Añadir
                                </button>
                            </div>
                        </div>

                        {/* List of Added Extras */}
                        {extras.length > 0 ? (
                            <div className="mt-2 space-y-2 max-h-[150px] overflow-y-auto pr-1">
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Agregados:</span>
                                {extras.map((item, index) => (
                                    <div
                                        key={index}
                                        className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg border border-white/5 text-xs text-white"
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-medium">{item.nombre}</span>
                                            <span className="text-[10px] text-green-400 font-bold">${item.valor.toLocaleString()}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveExtra(index)}
                                            className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all"
                                            disabled={loading}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <span className="text-xs text-gray-500 italic mt-1">No se han añadido extras para este cierre.</span>
                        )}
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex gap-3 mt-4 pt-2 border-t border-white/5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all border border-white/5"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                            disabled={loading}
                        >
                            {loading ? "Finalizando..." : "Confirmar Cierre"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
