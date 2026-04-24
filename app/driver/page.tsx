'use client';

import Navbar from '@/app/components/Navbar';
import { DRIVER_NAV_ITEMS } from '@/app/constants/data';

export default function DriverPage() {
    return (
        <div className="flex h-screen bg-flota-background">

            <Navbar items={DRIVER_NAV_ITEMS} role="driver" />

            {/* Contenido principal */}
            <main className="flex-1 overflow-y-auto p-10">

                <div className="mb-10">
                    <h1 className="text-4xl font-principal font-bold tracking-wider text-flota-textPrimary mb-2">
                        Mi Ruta
                    </h1>
                    <p className="text-flota-textSecondary font-serif tracking-wide">
                        Aquí verás tu ruta y asignaciones del día.
                    </p>
                </div>

                {/* Estado vacío */}
                <div className="bg-flota-surface border border-flota-border-default rounded-xl p-10 flex flex-col items-center justify-center text-center gap-3">
                    <p className="text-flota-textSecondary font-serif tracking-wider text-sm">
                        No tienes rutas asignadas por el momento.
                    </p>
                </div>

            </main>
        </div>
    );
}