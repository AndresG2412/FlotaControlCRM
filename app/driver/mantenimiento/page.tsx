// app/driver/mantenimiento/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import Navbar from "@/app/components/Navbar";
import Container from "@/app/components/Container";
import Button from "@/app/components/Button";
import { DRIVER_NAV_ITEMS, BUSETA_DATOS } from "@/app/constants/data";
import { getMantenimientos, MantenimientoWithId } from "@/firebase/driver/mantenimiento";
import CardMantenimiento from "@/app/components/CardMantenimiento";
import Filtro from "@/app/components/Filtro";
import Search from "@/app/components/Search";
export default function MantenimientoPage() {
  const router = useRouter();
  const [mantenimientos, setMantenimientos] = useState<MantenimientoWithId[]>([]);
  const [filtered, setFiltered] = useState<MantenimientoWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("TODOS");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getMantenimientos();
        setMantenimientos(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Efecto para filtrar cuando cambia la categoría, la búsqueda o los mantenimientos
  useEffect(() => {
    let result = mantenimientos;

    if (selectedCategory !== "TODOS") {
      result = result.filter((m) => m.categoria === selectedCategory);
    }

    if (searchTerm.trim() !== "") {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter((m) => m.nombreRepuesto.toLowerCase().includes(lowerSearch));
    }

    setFiltered(result);
  }, [selectedCategory, searchTerm, mantenimientos]);

  return (
    <div className="flex h-screen">
      <Navbar items={DRIVER_NAV_ITEMS} role="driver" />
      <Container>
        {/* Header similar a RutaPage */}
        <div className="flex mx-auto flex-col gap-y-5 justify-center items-center w-full mb-6">
          <div className="gap-x-5 w-full md:flex-row flex flex-col justify-center items-center mt-8">
            <div className="w-2/3">
              <p className="text-4xl text-start font-secundario tracking-wider">
                Mantenimientos {BUSETA_DATOS.Numero_Buseta}
              </p>
            </div>
            <div className="w-1/3">
              <Button
                text="Nuevo Mantenimiento"
                onClick={() => router.push("/driver/mantenimiento/nuevo")}
                icon={<Plus />}
              />
            </div>
          </div>

          {/* Divisor: Aquí se muestran los documentos */}
          <div className="w-full">
            <div className="border-t border-flota-border-focus my-4" />

            {/* Filtro y Búsqueda */}
            <div className="flex flex-wrap items-start gap-4 w-full mb-6">
              <Search value={searchTerm} onChange={setSearchTerm} placeholder="Buscar repuesto..." />
              <Filtro selectedCategory={selectedCategory} onCategoryChange={setSelectedCategory} />
            </div>

            {/* Lista de tarjetas */}
            {loading ? (
              <div className="text-gray-400 text-center py-8">Cargando mantenimientos...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-gray-500 py-8 border border-dashed border-flota-border-focus rounded-2xl">
                No hay mantenimientos registrados {selectedCategory !== "TODOS" && `en la categoría "${selectedCategory}"`}.
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {filtered.map((item) => (
                  <CardMantenimiento
                    key={item.id}
                    id={item.id}
                    nombreRepuesto={item.nombreRepuesto}
                    categoria={item.categoria}
                    precio={item.precio}
                    createdAt={item.createdAt}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}