'use client';

import { signOut } from 'firebase/auth';
import { auth } from '@/libs/firebase/config';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AdminPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');

    useEffect(() => {
        const user = auth.currentUser;
        if (user?.email) setEmail(user.email);
    }, []);

    async function handleLogout() {
        await signOut(auth);
        router.replace('/');
    }

    return (
        <div className="h-screen bg-flota-background flex flex-col">

            {/* Navbar */}
            <header className="flex items-center justify-between px-10 py-5 border-b border-flota-border-default bg-flota-surface">
                <p className="text-2xl font-bold tracking-wider font-principal text-flota-textPrimary">
                    Flota<span className="text-flota-textSecondary">Control</span>
                    <span className="ml-3 text-sm font-serif font-normal text-flota-textTertiary">
                        — Panel Admin
                    </span>
                </p>
                <div className="flex items-center gap-6">
                    <span className="text-sm font-serif text-flota-textSecondary tracking-wide">
                        {email}
                    </span>
                    <button
                        onClick={handleLogout}
                        className="text-sm font-serif tracking-wider text-flota-textSecondary
                                   border border-flota-border-default rounded-lg px-4 py-2
                                   hover:border-flota-border-strong hover:text-flota-textPrimary
                                   transition-colors cursor-pointer"
                    >
                        Cerrar sesión
                    </button>
                </div>
            </header>

            {/* Contenido */}
            <main className="flex-1 p-10">
                <h1 className="text-4xl font-principal font-bold tracking-wider text-flota-textPrimary mb-2">
                    Bienvenido, Administrador
                </h1>
                <p className="text-flota-textSecondary font-serif tracking-wide mb-10">
                    Desde aquí puedes gestionar toda la flota.
                </p>

                {/* Cards de ejemplo */}
                <div className="grid grid-cols-3 gap-6">
                    {[
                        { label: 'Vehículos activos',  value: '0' },
                        { label: 'Conductores',         value: '0' },
                        { label: 'Rutas en curso',      value: '0' },
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