'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/firebase/config';
import { NavItem } from '@/app/constants/data';
import { User, LogOut, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';

type NavbarProps = {
    items: NavItem[];
    role: 'admin' | 'driver';
};

export default function Navbar({ items, role }: NavbarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const user = auth.currentUser;
        if (user?.email) setEmail(user.email);
    }, []);

    // Cerrar el menú si cambia la ruta (opcional, pero útil para seguridad)
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    async function handleLogout() {
        await signOut(auth);
        router.replace('/');
    }

    const roleLabel = role === 'admin' ? 'Administrador' : 'Conductor';

    return (
        <>
            {/* Botón Hamburguesa para Móviles y Tablets */}
            <button
                onClick={() => setIsOpen(true)}
                className={`
                    lg:hidden fixed top-5 left-5 z-40 p-2.5 
                    bg-flota-surface border border-flota-border-default 
                    rounded-xl shadow-sm text-flota-textPrimary
                    transition-all duration-300
                    ${isOpen ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}
                `}
                aria-label="Abrir menú"
            >
                <Menu size={24} />
            </button>

            {/* Overlay de fondo para móviles */}
            <div
                className={`
                    lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm transition-opacity duration-300
                    ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
                `}
                onClick={() => setIsOpen(false)}
            />

            {/* Sidebar / Navbar */}
            <aside className={`
                fixed lg:sticky top-0 left-0 h-screen z-50
                w-[75%] sm:w-[50%] md:w-[40%] lg:w-1/4 lg:min-w-[260px] lg:max-w-[300px]
                bg-flota-surface border-r border-flota-border-focus
                flex flex-col shrink-0
                transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none
                ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                {/* Logo */}
                <div className="px-8 py-7 border-b border-flota-border-default flex justify-between items-center">
                    <div>
                        <p className="text-2xl font-bold tracking-wider font-principal text-flota-textPrimary">
                            Flota<span className="text-flota-textSecondary">Control</span>
                        </p>
                        <span className="text-xs font-serif text-flota-textTertiary tracking-widest uppercase mt-1 block">
                            {roleLabel}
                        </span>
                    </div>
                    {/* Botón cerrar para móviles */}
                    <button
                        onClick={() => setIsOpen(false)}
                        className="lg:hidden p-2 text-flota-textTertiary hover:text-flota-textPrimary transition-colors"
                        aria-label="Cerrar menú"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Nav items */}
                <nav className="flex-1 px-4 py-6 flex flex-col gap-1 overflow-y-auto">
                    {items.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                className={`
                                    flex items-center gap-3 px-4 py-3 rounded-lg
                                    font-serif text-sm tracking-wide
                                    transition-all duration-150 group
                                    ${isActive
                                        ? 'bg-flota-elevated text-flota-textPrimary border border-flota-border-strong'
                                        : 'text-flota-textSecondary hover:bg-flota-elevated/60 hover:text-flota-textPrimary border border-transparent'
                                    }
                                `}
                            >
                                <span className={`
                                    transition-colors
                                    ${isActive ? 'text-flota-textPrimary' : 'text-flota-textTertiary group-hover:text-flota-textSecondary'}
                                `}>
                                    {item.icon}
                                </span>
                                {item.label}

                                {/* indicador activo */}
                                {isActive && (
                                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-flota-textSecondary" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer con usuario y logout */}
                <div className="px-4 py-5 border-t border-flota-border-default">
                    <div className="flex flex-col gap-3">
                        <div className="px-4">
                            <p className="text-xs text-flota-textTertiary font-serif tracking-wider truncate">
                                {email}
                            </p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="
                                flex items-center gap-3 px-4 py-3 rounded-lg w-full
                                font-serif text-sm tracking-wide
                                text-flota-textSecondary
                                hover:bg-flota-elevated/60 hover:text-flota-textPrimary
                                border border-transparent hover:border-flota-border-default
                                transition-all duration-150 cursor-pointer
                            "
                        >
                            <User size={18} className="text-flota-textTertiary" />
                            Cerrar sesión
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}