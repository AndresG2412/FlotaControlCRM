// app/components/Search.tsx
import React from "react";
import { Search as SearchIcon } from "lucide-react";

interface SearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function Search({ value, onChange, placeholder = "Buscar..." }: SearchProps) {
  return (
    <div className="flex-1 relative h-[42px]">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <SearchIcon size={18} className="text-gray-400" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="block w-full h-full pl-10 pr-3 py-2 border border-flota-border-focus rounded-xl leading-5 bg-black/30 text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-flota-border-focus sm:text-sm transition-colors"
      />
    </div>
  );
}
