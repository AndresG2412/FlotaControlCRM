// app/components/driver/Filtro.tsx
import React, { useState } from "react";
import { Filter } from "lucide-react";
import { MANTENIMIENTOS_TIPOS } from "@/app/constants/data";

interface FiltroProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export default function Filtro({ selectedCategory, onCategoryChange }: FiltroProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (tipo: string) => {
    onCategoryChange(tipo);
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-flota-elevated border border-flota-border-focus rounded-xl text-gray-300 hover:bg-flota-border-focus transition-colors h-[42px]"
      >
        <Filter size={18} className="text-gray-400" />
        <span className="text-sm truncate max-w-[120px]">
          {selectedCategory === "TODOS" ? "Filtro" : selectedCategory}
        </span>
      </button>

      {isOpen && (
        <div className="basis-full w-full mt-2 p-4 bg-flota-elevated border border-flota-border-focus rounded-xl animate-in fade-in slide-in-from-top-2">
          <span className="text-sm text-gray-400 mb-3 block">Selecciona una categoría:</span>
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => handleSelect("TODOS")}
              className={`px-4 py-1.5 rounded-lg text-sm transition-colors border ${
                selectedCategory === "TODOS"
                  ? "bg-flota-border-focus border-flota-border-focus text-white"
                  : "bg-black/30 border-flota-border-focus text-gray-400 hover:bg-flota-border-focus hover:text-white"
              }`}
            >
              Todos
            </button>
            {MANTENIMIENTOS_TIPOS.map((tipo) => (
              <button
                key={tipo}
                onClick={() => handleSelect(tipo)}
                className={`px-4 py-1.5 rounded-lg text-sm transition-colors border ${
                  selectedCategory === tipo
                    ? "bg-flota-border-focus border-flota-border-focus text-white"
                    : "bg-black/30 border-flota-border-focus text-gray-400 hover:bg-flota-border-focus hover:text-white"
                }`}
              >
                {tipo}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}