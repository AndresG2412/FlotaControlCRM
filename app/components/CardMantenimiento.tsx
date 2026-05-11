// app/components/driver/CardMantenimiento.tsx
import React from "react";
import { Wrench, DollarSign, Tag, Clock } from "lucide-react";

interface CardMantenimientoProps {
  id: string;
  nombreRepuesto: string;
  categoria: string;
  precio: number;
  createdAt: Date | any; // Puede ser Date o Timestamp de Firebase
}

export default function CardMantenimiento({
  nombreRepuesto,
  categoria,
  precio,
  createdAt,
}: CardMantenimientoProps) {
  // Versión más simple, solo fecha sin hora
  const formatDate = (date: any) => {
    if (!date) return "Fecha no disponible";
    
    let dateObj = date;
    if (date?.toDate) dateObj = date.toDate();
    else if (typeof date === "string" || typeof date === "number") dateObj = new Date(date);
    
    if (isNaN(dateObj.getTime())) return "Fecha inválida";
    
    // Formato: 15/05/2026
    return dateObj.toLocaleDateString("es-ES");
  };

  return (
    <div className="bg-flota-elevated border border-flota-border-focus rounded-2xl py-2 px-4 shadow-sm transition-all w-full">
      <div className="flex gap-4">
        {/* Contenido */}
        <div className="flex-1">
          <h3 className="text-lg capitalize font-bold text-white">{nombreRepuesto}</h3>
          <div className="flex flex-col gap-2 text-sm mt-2">
            <div className="flex items-center gap-2 text-gray-300">
              <Tag size={16} className="text-blue-400" />
              <span className="font-medium">{categoria}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <DollarSign size={16} className="text-green-400" />
              <span className="font-medium">{precio.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400 border-t border-white/5 pt-2 mt-1">
              <Clock size={16} className="text-amber-400" />
              <span>{formatDate(createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}