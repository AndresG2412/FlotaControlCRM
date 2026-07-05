"use client";

import React, { useState } from "react";
import { X, Wrench, DollarSign, Plus } from "lucide-react";
import { MANTENIMIENTOS_TIPOS } from "@/app/constants/data";
import Swal from "sweetalert2";

interface ModalMantenimientoViajeProps {
    onClose: () => void;
    onConfirm: (data: { nombreRepuesto: string, categoria: string, precio: number }) => Promise<void>;
}

export default function ModalMantenimientoViaje({ onClose, onConfirm }: ModalMantenimientoViajeProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        nombreRepuesto: "",
        categoria: "",
        precio: "",
    });

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const errors: string[] = [];
        if (!formData.nombreRepuesto.trim()) {
            errors.push("Nombre del repuesto");
        }
        if (!formData.categoria) {
            errors.push("Categoría");
        }
        const precioVal = parseFloat(formData.precio);
        if (!formData.precio || isNaN(precioVal) || precioVal <= 0) {
            errors.push("Precio (debe ser un número mayor a 0)");
        }

        if (errors.length > 0) {
            Swal.fire({
                title: "Campos incompletos",
                html: `Faltan los siguientes campos:<br><br>${errors.join("<br>")}`,
                icon: "error",
                background: "#000000",
                color: "#ffffff",
                confirmButtonColor: "#ef4444",
            });
            return;
        }

        setLoading(true);
        try {
            await onConfirm({
                nombreRepuesto: formData.nombreRepuesto.trim(),
                categoria: formData.categoria,
                precio: precioVal,
            });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-flota-surface border border-flota-border-focus rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-scale-up">
                
                {/* Header */}
                <div className="flex justify-between items-center py-4 px-6 border-b border-white/5 bg-black/20">
                    <div className="flex items-center gap-2 text-white">
                        <Wrench size={20} className="text-flota-blue" />
                        <h2 className="text-xl tracking-wider font-secundario font-bold">
                            Registrar Mantenimiento
                        </h2>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-gray-400 hover:text-white hover:bg-white/5 p-1.5 rounded-full transition-all"
                        disabled={loading}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
                    {/* Nombre del Repuesto */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="nombreRepuesto" className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Nombre del Repuesto / Reparación
                        </label>
                        <input
                            type="text"
                            id="nombreRepuesto"
                            name="nombreRepuesto"
                            value={formData.nombreRepuesto}
                            onChange={handleInputChange}
                            placeholder="Ej. Filtro de aceite, Pastillas de freno"
                            className="w-full bg-black/20 border border-flota-border-focus rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-flota-blue placeholder:text-gray-600 transition-all"
                            disabled={loading}
                        />
                    </div>

                    {/* Categoría */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="categoria" className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Categoría
                        </label>
                        <select
                            id="categoria"
                            name="categoria"
                            value={formData.categoria}
                            onChange={handleInputChange}
                            className="w-full bg-flota-surface border border-flota-border-focus rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-flota-blue cursor-pointer transition-all"
                            disabled={loading}
                        >
                            <option value="" className="bg-flota-surface text-gray-400">Seleccionar categoría...</option>
                            {MANTENIMIENTOS_TIPOS.map((tipo) => (
                                <option key={tipo} value={tipo} className="bg-flota-surface text-white">
                                    {tipo}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Precio */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="precio" className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Costo / Precio
                        </label>
                        <div className="flex items-center bg-black/20 border border-flota-border-focus rounded-xl overflow-hidden focus-within:border-flota-blue transition-all">
                            <span className="pl-3 pr-2 text-sm text-gray-400 border-r border-white/5">
                                $
                            </span>
                            <input
                                type="number"
                                id="precio"
                                name="precio"
                                value={formData.precio}
                                onChange={handleInputChange}
                                placeholder="0"
                                min="0"
                                className="w-full bg-transparent px-3 py-2.5 text-sm text-white outline-none placeholder:text-gray-600"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-3 mt-4 w-full">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-1/3 py-3 border border-white/10 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all outline-none"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="w-2/3 py-3 bg-flota-blue text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-all flex items-center justify-center gap-2 outline-none shadow-lg shadow-blue-500/10"
                            disabled={loading}
                        >
                            <Plus size={16} />
                            {loading ? "Guardando..." : "Registrar"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
