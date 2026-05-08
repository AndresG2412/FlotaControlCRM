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

export default function NuevaRuta() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const viajeId = searchParams.get("viajeId");
    const stopNumber = parseInt(searchParams.get("stop") || "1", 10);

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        gasolina: "",
        ticketImage: null as File | null,
        dineroNeto: "",
        terminalSalida: "",
        pasajerosTotales: "",
        horaSalida: ""
    });

    useEffect(() => {
        if (viajeId) {
            setStep(2);
        }
    }, [viajeId]);

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

    const validateStep1 = () => {
        const gasolinaVal = parseFloat(formData.gasolina);
        if (!formData.gasolina || isNaN(gasolinaVal) || gasolinaVal <= 0) {
            Swal.fire({
                title: 'Campo requerido',
                text: 'Por favor ingresa la gasolina consumida con un valor positivo',
                icon: 'error',
                background: '#000000',
                color: '#ffffff',
                confirmButtonColor: '#3b82f6'
            });
            return false;
        }
        return true;
    };

    const validateStep2 = () => {
        const errors = [];

        // Imagen opcional por ahora
        const dineroVal = parseFloat(formData.dineroNeto);
        if (!formData.dineroNeto || isNaN(dineroVal) || dineroVal <= 0) {
            errors.push("Dinero Neto (debe ser positivo)");
        }
        if (!formData.terminalSalida) {
            errors.push("Terminal de Salida");
        }
        const pasajerosVal = parseInt(formData.pasajerosTotales);
        if (!formData.pasajerosTotales || isNaN(pasajerosVal) || pasajerosVal <= 0 || pasajerosVal > 18) {
            errors.push("Pasajeros totales (debe ser entre 1 y 18)");
        }
        if (!formData.horaSalida) {
            errors.push("Hora de salida");
        }

        if (errors.length > 0) {
            Swal.fire({
                title: 'Campos incompletos',
                html: `Faltan los siguientes campos:<br><br>${errors.join("<br>")}`,
                icon: 'error',
                background: '#000000',
                color: '#ffffff',
                confirmButtonColor: '#3b82f6'
            });
            return false;
        }
        return true;
    };

    const handleNextStep = () => {
        if (validateStep1()) {
            setStep(2);
        }
    };

    const handlePrevStep = () => {
        setStep(1);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (validateStep2()) {
            setLoading(true);
            try {
                const dataToSave: any = {
                    [`Terminal ${stopNumber}`]: formData.terminalSalida,
                    [`Neto ${stopNumber}`]: parseFloat(formData.dineroNeto),
                    [`Pasajeros ${stopNumber}`]: parseInt(formData.pasajerosTotales),
                    [`Hora ${stopNumber}`]: formData.horaSalida,
                };

                let result;
                if (viajeId) {
                    result = await addStopToViaje(viajeId, dataToSave, stopNumber);
                } else {
                    dataToSave.Gasolina = parseFloat(formData.gasolina);
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
                        className="flex flex-col gap-6 border border-flota-border-focus bg-flota-elevated rounded-2xl w-full max-w-lg mx-auto p-8 shadow-sm"
                        onSubmit={handleSubmit}
                    >
                        <div className="flex flex-col gap-1">
                            <Tittle text={viajeId ? "Continuar Viaje" : "Generación de Viaje"} />
                            <p className="text-sm text-gray-400">
                                {step === 1 ? "Paso 1/2: Ingresa la gasolina consumida" : (viajeId ? `Registro de Parada #${stopNumber}` : "Paso 2/2: Completa los datos del viaje")}
                            </p>
                        </div>

                        {step === 1 && (
                            <div className="flex flex-col gap-2">
                                <label
                                    htmlFor="gasolina"
                                    className="text-sm font-medium text-gray-300 flex items-center gap-1.5"
                                >
                                    <Fuel size={14} className="opacity-60" />
                                    Gasolina Consumida
                                </label>

                                <div className="flex items-center border border-flota-border-focus rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-flota-border-focus transition-all bg-black/20">
                                    <span className="px-3 py-2.5 text-sm text-gray-400 border-r border-flota-border-focus select-none">
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
                                        className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none placeholder:text-gray-600"
                                    />
                                    <span className="px-3 py-2.5 text-xs text-gray-500 select-none">
                                        COP
                                    </span>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="flex flex-col gap-4">
                                {/* Imagen - Fila única */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                                        <Upload size={14} className="opacity-60" />
                                        Tiquete de Salida
                                    </label>
                                    <div className="h-28 border-2 border-dashed border-flota-border-focus rounded-lg bg-black/20 flex items-center justify-center relative overflow-hidden">
                                        {formData.ticketImage ? (
                                            <div className="relative w-full h-full">
                                                <img
                                                    src={previewUrl || ""}
                                                    alt="Tiquete de salida"
                                                    className="w-full h-full object-contain"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, ticketImage: null }))}
                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="cursor-pointer w-full h-full flex items-center justify-center">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleImageChange}
                                                    className="hidden"
                                                />
                                                <div className="text-center">
                                                    <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                                                    <p className="text-xs text-gray-400">Haz clic para subir imagen</p>
                                                </div>
                                            </label>
                                        )}
                                    </div>
                                </div>

                                {/* Grid 2x2 para los siguientes inputs */}
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Dinero Neto */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-medium text-gray-300">
                                            Dinero Neto
                                        </label>
                                        <div className="flex items-center border border-flota-border-focus rounded-lg overflow-hidden bg-black/20">
                                            <span className="px-2 py-2 text-xs text-gray-400 border-r border-flota-border-focus">
                                                $
                                            </span>
                                            <input
                                                type="number"
                                                name="dineroNeto"
                                                value={formData.dineroNeto}
                                                onChange={handleInputChange}
                                                placeholder="0.00"
                                                min={0}
                                                step="0.01"
                                                className="flex-1 px-2 py-2 text-xs bg-transparent outline-none placeholder:text-gray-600"
                                            />
                                        </div>
                                    </div>

                                    {/* Terminal de Salida */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-medium text-gray-300">
                                            Terminal de Salida
                                        </label>
                                        <select
                                            name="terminalSalida"
                                            value={formData.terminalSalida}
                                            onChange={handleInputChange}
                                            className="border border-flota-border-focus rounded-lg px-2 py-2 text-xs bg-black/20 outline-none focus:ring-1 focus:ring-flota-border-focus"
                                        >
                                            <option value="">Seleccionar...</option>
                                            {TERMINALES.map((terminal) => (
                                                <option key={terminal} value={terminal}>
                                                    {terminal}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Pasajeros Totales */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-medium text-gray-300">
                                            Pasajeros Totales (max 18)
                                        </label>
                                        <input
                                            type="number"
                                            name="pasajerosTotales"
                                            value={formData.pasajerosTotales}
                                            onChange={handleInputChange}
                                            placeholder="1-18"
                                            min={1}
                                            max={18}
                                            className="border border-flota-border-focus rounded-lg px-2 py-2 text-xs bg-black/20 outline-none focus:ring-1 focus:ring-flota-border-focus"
                                        />
                                    </div>

                                    {/* Hora de Salida */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-medium text-gray-300">
                                            Hora de Salida
                                        </label>
                                        <input
                                            type="time"
                                            name="horaSalida"
                                            value={formData.horaSalida}
                                            onChange={handleInputChange}
                                            className="border border-flota-border-focus rounded-lg px-2 py-2 text-xs bg-black/20 outline-none focus:ring-1 focus:ring-flota-border-focus"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3">
                            {step === 1 && (
                                <Button
                                    text="Siguiente"
                                    onClick={handleNextStep}
                                    icon={<ArrowRight size={16} />}
                                />
                            )}

                            {step === 2 && (
                                <>
                                    {!viajeId && (
                                        <Button
                                            text="Anterior"
                                            onClick={handlePrevStep}
                                            icon={<ArrowLeft size={16} />}
                                            type="button"
                                        />
                                    )}
                                    <Button
                                        text={loading ? "Guardando..." : (viajeId ? "Guardar Parada" : "Iniciar Viaje")}
                                        icon={<Plus size={16} />}
                                        type="submit"
                                        disabled={loading}
                                    />
                                </>
                            )}
                        </div>
                    </form>
                </Container>
            </div>
        </div>
    );
}