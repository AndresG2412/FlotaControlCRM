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
                <div className="h-screen w-full flex items-center justify-center">
                    <div className="border border-flota-border-focus bg-flota-surface rounded-2xl p-6 flex flex-col gap-y-5 w-1/2">
                        <p className="text-4xl font-secundario tracking-wider font-bold mb-2">Buseta: {BUSETA_DATOS.Empresa} {BUSETA_DATOS.Numero_Buseta}</p>
                        <ul id="informacion" className="list-disc ps-6 font-semibold tracking-wide text-xl">
                            <li>Dueño: {BUSETA_DATOS.Dueño}</li>
                            <li>Numero Personal: {BUSETA_DATOS.Numero_Personal}</li>
                            <li>Aceite: {BUSETA_DATOS.Aceite}</li>
                            <li>Motor: {BUSETA_DATOS.Motor}</li>
                        </ul>
                    </div>
                </div>
            </Container>
        </div>
    );
}