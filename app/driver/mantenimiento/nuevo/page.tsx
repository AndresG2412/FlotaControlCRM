"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/app/components/Navbar";
import Container from "@/app/components/Container";
import Tittle from "@/app/components/Tittle";
import Button from "@/app/components/Button";
import { DRIVER_NAV_ITEMS, MANTENIMIENTOS_TIPOS } from "@/app/constants/data";
import Swal from "sweetalert2";
import { ArrowLeft, Plus, Upload, Wrench } from "lucide-react";
import Link from "next/link";
import { addMantenimiento } from "@/firebase/driver/mantenimiento";

export default function NuevoMantenimientoPage() {
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombreRepuesto: "",
    categoria: "",
    precio: "",
    photo: null as File | null,
  });

  // Generar URL de previsualización para la foto
  useEffect(() => {
    if (!formData.photo) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(formData.photo);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [formData.photo]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData((prev) => ({ ...prev, photo: file }));
  };

  const validateForm = () => {
    const errors: string[] = [];

    if (!formData.nombreRepuesto.trim()) {
      errors.push("Nombre del repuesto");
    }
    if (!formData.categoria) {
      errors.push("Categoría");
    }
    const precioVal = parseFloat(formData.precio);
    if (!formData.precio || isNaN(precioVal) || precioVal <= 0) {
      errors.push("Precio (debe ser positivo)");
    }

    if (errors.length > 0) {
      Swal.fire({
        title: "Campos incompletos",
        html: `Faltan los siguientes campos:<br><br>${errors.join("<br>")}`,
        icon: "error",
        background: "#000000",
        color: "#ffffff",
        confirmButtonColor: "#3b82f6",
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const dataToSave = {
        nombreRepuesto: formData.nombreRepuesto.trim(),
        categoria: formData.categoria,
        precio: parseFloat(formData.precio),
        // photoUrl will be added here once storage is configured
      };

      // Guardado en Firebase
      await addMantenimiento(dataToSave);

      Swal.fire({
        title: "¡Mantenimiento Registrado!",
        text: "La información se ha guardado correctamente",
        icon: "success",
        background: "#000000",
        color: "#ffffff",
        confirmButtonColor: "#3b82f6",
        timer: 2500,
      });

      // Reiniciar el formulario
      setFormData({
        nombreRepuesto: "",
        categoria: "",
        precio: "",
        photo: null,
      });
    } catch (error) {
      console.error(error);
      Swal.fire({
        title: "Error",
        text: "No se pudo guardar la información. Intenta de nuevo.",
        icon: "error",
        background: "#000000",
        color: "#ffffff",
        confirmButtonColor: "#ef4444",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen">
      <Navbar items={DRIVER_NAV_ITEMS} role="driver" />

        <Container>
      <div className="flex-1 flex items-center justify-center p-4">
          <form
            className="flex flex-col gap-4 border border-flota-border-focus bg-flota-elevated rounded-2xl w-full max-w-lg mx-auto p-6 shadow-sm"
            onSubmit={handleSubmit}
          >
            {/* Encabezado */}
            <div className="flex flex-col gap-1">
              <p className="text-4xl font-secundario tracking-wider text-center">
                Nuevo Mantenimiento
              </p>
            </div>

            {/* Fila 1: Fotos (opcional) */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                <Upload size={14} className="opacity-60" />
                Fotos
              </label>
              <div className="h-28 border-2 border-dashed border-flota-border-focus rounded-lg bg-black/20 flex items-center justify-center relative overflow-hidden">
                {formData.photo ? (
                  <div className="relative w-full h-full">
                    <img
                      src={previewUrl || ""}
                      alt="Vista previa"
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, photo: null }))
                      }
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
                      <p className="text-xs text-gray-400">
                        Haz clic para subir imagen
                      </p>
                    </div>
                  </label>
                )}
              </div>
            </div>

            {/* Fila 2: Nombre del repuesto */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="nombreRepuesto"
                className="text-sm font-medium text-gray-300 flex items-center gap-1.5"
              >
                <Wrench size={14} className="opacity-60" />
                Nombre del Repuesto
              </label>
              <input
                type="text"
                id="nombreRepuesto"
                name="nombreRepuesto"
                value={formData.nombreRepuesto}
                onChange={handleInputChange}
                placeholder="Ej. Filtro de aceite"
                className="border border-flota-border-focus rounded-lg px-3 py-2.5 text-sm bg-black/20 outline-none focus:ring-2 focus:ring-flota-border-focus placeholder:text-gray-600"
              />
            </div>

            {/* Fila 3: Categoría y Precio en una misma fila */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-300">
                  Categoría
                </label>
                <select
                  name="categoria"
                  value={formData.categoria}
                  onChange={handleInputChange}
                  className="border border-flota-border-strong rounded-lg px-2 py-2 text-xs bg-flota-surface text-flota-textPrimary outline-none focus:border-flota-border-focus focus:ring-1 focus:ring-flota-border-focus cursor-pointer"
                >
                  <option value="" className="bg-flota-surface text-flota-textPrimary">Seleccionar...</option>
                  {MANTENIMIENTOS_TIPOS.map((tipo) => (
                    <option key={tipo} value={tipo} className="bg-flota-surface text-flota-textPrimary">
                      {tipo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-300">
                  Precio
                </label>
                <div className="flex items-center border border-flota-border-focus rounded-lg overflow-hidden bg-black/20">
                  <span className="px-2 py-2 text-xs text-gray-400 border-r border-flota-border-focus">
                    $
                  </span>
                  <input
                    type="number"
                    name="precio"
                    value={formData.precio}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    min={0}
                    step="0.01"
                    className="flex-1 px-2 py-2 text-xs bg-transparent outline-none placeholder:text-gray-600"
                  />
                </div>
              </div>
            </div>

            {/* Botón de envío */}
            <div className="flex gap-3 w-full">
                <div className="w-1/3">
                    <Link href="/driver/mantenimiento">
                        <Button text="Regresar" icon={<ArrowLeft size={16} />} />
                    </Link>
                </div>
                <div className="w-2/3">
                    <Button
                        text={loading ? "Guardando..." : "Guardar Mantenimiento"}
                        icon={<Plus size={16} />}
                        type="submit"
                        disabled={loading}
                    />
                </div>
            </div>
          </form>
      </div>
        </Container>
    </div>
  );
}