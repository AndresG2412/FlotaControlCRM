'use client';

import Navbar from '@/app/components/Navbar';
import { ADMIN_NAV_ITEMS } from '@/app/constants/data';

export default function AdminPage() {
    return (
        <div className="flex h-screen bg-flota-background">

            <Navbar items={ADMIN_NAV_ITEMS} role="admin" />

            {/* Contenido principal */}
            <main className="flex-1 overflow-y-auto p-10">

                <div className="mb-10">
                    <h1 className="text-4xl font-secundario font-bold tracking-wider text-flota-textPrimary mb-2">
                        Dashboard
                    </h1>
                    <p className="text-flota-textSecondary font-serif tracking-wide">
                        Resumen general de la flota.
                    </p>
                </div>

                {/* Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    {[
                        { label: 'Vehículos activos', value: '0' },
                        { label: 'Conductores',        value: '0' },
                        { label: 'Rutas en curso',     value: '0' },
                    ].map(({ label, value }) => (
                        <div
                            key={label}
                            className="bg-flota-surface border border-flota-border-default rounded-xl p-6 flex flex-col gap-2"
                        >
                            <p className="text-flota-textSecondary font-serif text-sm tracking-wider">
                                {label}
                            </p>
                            <p className="text-4xl font-principal font-bold text-flota-textPrimary">
                                {value}
                            </p>
                        </div>
                    ))}
                </div>

            </main>
        </div>
    );
}