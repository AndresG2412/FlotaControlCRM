"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/app/components/Navbar";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Fuel, ArrowRight, ArrowLeft, Upload } from "lucide-react";
import { DRIVER_NAV_ITEMS } from "@/app/constants/data";
import { TERMINALES } from "@/app/constants/data";
import Container from "@/app/components/Container";
import Tittle from "@/app/components/Tittle";
import Button from "@/app/components/Button";
import Swal from "sweetalert2";
import { createViaje, addStopToViaje } from "@/firebase/driver/viaje";

export default function NuevaRutaPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const viajeId = searchParams.get("viajeId");
    const stopNumber = parseInt(searchParams.get("stop") || "1", 10);

    const [loading, setLoading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        gasolina: "",
        ticketImage: null as File | null,
        dineroNeto: "",
        terminalSalida: "",
        horaSalida: "",
        // polilla: ""
    });

    useEffect(() => {
        if (!formData.ticketImage) {
            setPreviewUrl(null);
            return;
        }

        const url = URL.createObjectURL(formData.ticketImage);
        setPreviewUrl(url);

        // Cleanup function to avoid memory leaks
        return () => URL.revokeObjectURL(url);
    }, [formData.ticketImage]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setFormData(prev => ({ ...prev, ticketImage: file }));
    };

    const validateForm = () => {
        const errors = [];

        // Dinero Neto: Required and positive
        const dineroVal = parseFloat(formData.dineroNeto);
        if (!formData.dineroNeto || isNaN(dineroVal) || dineroVal <= 0) {
            errors.push("Dinero Neto (debe ser mayor a 0)");
        }

        // Terminal de Salida: Required
        if (!formData.terminalSalida) {
            errors.push("Terminal de Salida");
        }

        // Polilla: Required and positive/zero (commented out)
        /*
        const polillaVal = parseFloat(formData.polilla);
        if (!formData.polilla || isNaN(polillaVal) || polillaVal < 0) {
            errors.push("Polilla (debe ser mayor o igual a 0)");
        }
        */

        // Hora de Salida: Required
        if (!formData.horaSalida) {
            errors.push("Hora de Salida");
        }

        // Gasolina is optional. If provided, it should be a positive number.
        if (formData.gasolina) {
            const gasolinaVal = parseFloat(formData.gasolina);
            if (isNaN(gasolinaVal) || gasolinaVal < 0) {
                errors.push("Gasolina (debe ser mayor o igual a 0)");
            }
        }

        if (errors.length > 0) {
            Swal.fire({
                title: 'Campos incompletos o inválidos',
                html: `Por favor corrige los siguientes campos:<br><br>${errors.join("<br>")}`,
                icon: 'error',
                background: '#000000',
                color: '#ffffff',
                confirmButtonColor: '#3b82f6'
            });
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (validateForm()) {
            setLoading(true);
            try {
                const dataToSave: any = {
                    [`Terminal ${stopNumber}`]: formData.terminalSalida,
                    [`Neto ${stopNumber}`]: parseFloat(formData.dineroNeto),
                    // [`Polilla ${stopNumber}`]: parseFloat(formData.polilla),
                    [`Hora ${stopNumber}`]: formData.horaSalida,
                    [`Gasolina ${stopNumber}`]: formData.gasolina ? parseFloat(formData.gasolina) : 0,
                };

                let result;
                if (viajeId) {
                    result = await addStopToViaje(viajeId, dataToSave, stopNumber);
                } else {
                    // Si es el primer stop (inicio del viaje), también guardamos Gasolina en la raíz para que lo lea la UI
                    dataToSave.Gasolina = formData.gasolina ? parseFloat(formData.gasolina) : 0;
                    result = await createViaje(dataToSave);
                }

                if (result.success) {
                    Swal.fire({
                        title: viajeId ? '¡Parada Registrada!' : '¡Viaje Iniciado!',
                        text: 'La información se ha guardado correctamente',
                        icon: 'success',
                        background: '#000000',
                        color: '#ffffff',
                        confirmButtonColor: '#3b82f6',
                        timer: 2500
                    });

                    // Redirigir a la lista de rutas
                    router.push("/driver/ruta");
                } else {
                    throw new Error("Error al guardar en Firebase");
                }
            } catch (error) {
                console.error(error);
                Swal.fire({
                    title: 'Error',
                    text: 'No se pudo guardar la información. Por favor intenta de nuevo.',
                    icon: 'error',
                    background: '#000000',
                    color: '#ffffff',
                    confirmButtonColor: '#ef4444'
                });
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="flex h-screen">
            <Navbar items={DRIVER_NAV_ITEMS} role={"driver"} />

            <div className="flex-1 flex items-center justify-center p-4">
                <Container>
                    <form
                        className="flex flex-col gap-6 border border-flota-border-focus bg-flota-elevated rounded-2xl w-full max-w-2xl mx-auto p-6 shadow-sm"
                        onSubmit={handleSubmit}
                    >
                        <div className="flex flex-col gap-1">
                            <p className="text-4xl font-secundario tracking-wider text-center">{viajeId ? "Cont. Viaje" : "Nuevo Viaje"}</p>
                            <p className="text-sm text-gray-400">
                                {viajeId ? `Registro de Parada #${stopNumber}` : "Completa los datos del viaje"}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {/* Fila 1 y 2 - Col 1: Imagen (Ocupa 2 filas) */}
                            <div className="flex flex-col gap-1.5 md:col-span-1 md:row-span-2 h-full">
                                <label className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
                                    <Upload size={12} className="opacity-60" />
                                    Tiquete (Opcional)
                                </label>
                                <div className="flex-1 border border-dashed border-flota-border-focus rounded-lg bg-black/20 flex items-center justify-center relative overflow-hidden min-h-[120px] md:min-h-full">
                                    {formData.ticketImage ? (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                            {previewUrl && (
                                                <img
                                                    src={previewUrl}
                                                    alt="Tiquete"
                                                    className="absolute inset-0 w-full h-full object-contain p-0.5"
                                                />
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, ticketImage: null }))}
                                                className="absolute right-1 top-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] z-10"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer w-full h-full flex items-center justify-center py-6">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageChange}
                                                className="hidden"
                                            />
                                            <div className="text-center flex flex-col items-center gap-1.5">
                                                <Upload size={20} className="text-gray-400" />
                                                <span className="text-xs text-gray-400 font-medium">Subir foto</span>
                                            </div>
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* Gasolina (Opcional) */}
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="gasolina" className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
                                    <Fuel size={12} className="opacity-60" />
                                    Gasolina (Opcional)
                                </label>
                                <div className="flex items-center border border-flota-border-focus rounded-lg overflow-hidden bg-black/20 h-[38px] focus-within:ring-1 focus-within:ring-flota-border-focus transition-all">
                                    <span className="px-2 py-2 text-xs text-gray-400 border-r border-flota-border-focus select-none">
                                        $
                                    </span>
                                    <input
                                        type="number"
                                        id="gasolina"
                                        name="gasolina"
                                        value={formData.gasolina}
                                        onChange={handleInputChange}
                                        placeholder="0.00"
                                        min={0}
                                        step="0.01"
                                        className="flex-1 px-2 py-2 text-xs bg-transparent outline-none placeholder:text-gray-600"
                                    />
                                </div>
                            </div>

                            {/* Dinero Neto (Obligatorio) */}
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="dineroNeto" className="text-xs font-medium text-gray-300">
                                    Dinero Neto *
                                </label>
                                <div className="flex items-center border border-flota-border-focus rounded-lg overflow-hidden bg-black/20 h-[38px] focus-within:ring-1 focus-within:ring-flota-border-focus transition-all">
                                    <span className="px-2 py-2 text-xs text-gray-400 border-r border-flota-border-focus select-none">
                                        $
                                    </span>
                                    <input
                                        type="number"
                                        id="dineroNeto"
                                        name="dineroNeto"
                                        value={formData.dineroNeto}
                                        onChange={handleInputChange}
                                        placeholder="0.00"
                                        min={0}
                                        step="0.01"
                                        className="flex-1 px-2 py-2 text-xs bg-transparent outline-none placeholder:text-gray-600"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Terminal de Salida (Obligatorio) */}
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="terminalSalida" className="text-xs font-medium text-gray-300">
                                    Terminal de Salida *
                                </label>
                                <select
                                    id="terminalSalida"
                                    name="terminalSalida"
                                    value={formData.terminalSalida}
                                    onChange={handleInputChange}
                                    className="border border-flota-border-strong rounded-lg px-2 py-2 text-xs bg-flota-surface text-flota-textPrimary outline-none focus:border-flota-border-focus focus:ring-1 focus:ring-flota-border-focus cursor-pointer h-[38px]"
                                    required
                                >
                                    <option value="" className="bg-flota-surface text-flota-textPrimary">Seleccionar...</option>
                                    {TERMINALES.map((terminal) => (
                                        <option key={terminal} value={terminal} className="bg-flota-surface text-flota-textPrimary">
                                            {terminal}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Polilla (Obligatorio) - Comentado por si se requiere volver a usar
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="polilla" className="text-xs font-medium text-gray-300">
                                    Polilla *
                                </label>
                                <div className="flex items-center border border-flota-border-focus rounded-lg overflow-hidden bg-black/20 h-[38px] focus-within:ring-1 focus-within:ring-flota-border-focus transition-all">
                                    <span className="px-2 py-2 text-xs text-gray-400 border-r border-flota-border-focus select-none">
                                        $
                                    </span>
                                    <input
                                        type="number"
                                        id="polilla"
                                        name="polilla"
                                        value={formData.polilla}
                                        onChange={handleInputChange}
                                        placeholder="0.00"
                                        min={0}
                                        step="0.01"
                                        className="flex-1 px-2 py-2 text-xs bg-transparent outline-none placeholder:text-gray-600"
                                        required
                                    />
                                </div>
                            </div>
                            */}

                            {/* Hora de Salida (Obligatorio) */}
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="horaSalida" className="text-xs font-medium text-gray-300">
                                    Hora de Salida *
                                </label>
                                <input
                                    type="time"
                                    id="horaSalida"
                                    name="horaSalida"
                                    value={formData.horaSalida}
                                    onChange={handleInputChange}
                                    className="border border-flota-border-focus rounded-lg px-2 py-2 text-xs bg-black/20 outline-none focus:ring-1 focus:ring-flota-border-focus h-[38px]"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-4">
                            <Button
                                text={loading ? "Guardando..." : (viajeId ? "Guardar Parada" : "Iniciar Viaje")}
                                icon={<Plus size={16} />}
                                type="submit"
                                disabled={loading}
                            />
                        </div>
                    </form>
                </Container>
            </div>
        </div>
    );
}