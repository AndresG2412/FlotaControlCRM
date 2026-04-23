'use client';

import { signOut } from 'firebase/auth';
import { auth } from '@/libs/firebase/config';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DriverPage() {
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
                        — Panel Conductor
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
            <main className="flex-1 p-10 flex flex-col items-center justify-center">
                <h1 className="text-4xl font-principal font-bold tracking-wider text-flota-textPrimary mb-2">
                    Bienvenido, Conductor
                </h1>
                <p className="text-flota-textSecondary font-serif tracking-wide">
                    Aquí verás tu ruta y asignaciones del día.
                </p>
            </main>
        </div>
    );
}