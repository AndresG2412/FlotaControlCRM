'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/config';
import { useRouter } from 'next/navigation';

export default function DriverLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.replace('/');
                return;
            }

            const token = await user.getIdTokenResult();

            // Si es admin no debería estar aquí
            if (token.claims.role === 'admin') {
                router.replace('/admin');
                return;
            }

            setChecking(false);
        });

        return () => unsub();
    }, [router]);

    if (checking) {
        return (
            <div className="h-screen flex items-center justify-center bg-flota-background">
                <p className="text-flota-textSecondary font-serif tracking-wider animate-pulse">
                    Verificando acceso...
                </p>
            </div>
        );
    }

    return <>{children}</>;
}