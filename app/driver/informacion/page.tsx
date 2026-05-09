"use client"

import Navbar from "@/app/components/Navbar";
import Container from "@/app/components/Container";
import { DRIVER_NAV_ITEMS, BUSETA_DATOS } from "@/app/constants/data"; // Importamos BUSETA_DATOS
import Button from "@/app/components/Button";

export default function InformacionPage() {
    return (
        <div className="flex h-screen">
            <Navbar items={DRIVER_NAV_ITEMS} role="driver" />
            <Container>
                <p className="text-4xl font-secundario tracking-wider font-bold mb-2">Buseta: {BUSETA_DATOS.Empresa} {BUSETA_DATOS.Numero_Buseta}</p>
            </Container>
        </div>
    );
}