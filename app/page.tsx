'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/firebase/config';
import { useRouter } from 'next/navigation';

export default function Home() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const tokenResult = await userCredential.user.getIdTokenResult();

            if (tokenResult.claims.role === 'admin') {
                router.push('/admin');
            } else {
                router.push('/driver');
            }
        } catch {
            setError('Correo o contraseña incorrectos');
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <div className="h-screen flex items-center justify-center">

                {/* ══ PANEL IZQUIERDO ══ */}
                <div className="left-panel w-1/2 bg-flota-surface h-full p-10 flex flex-col items-center justify-center gap-10 border-r border-flota-textPrimary text-flota-textSecondary">

                    {/* Título */}
                    <div
                        className="text-center flex flex-col gap-y-3 w-full anim-fade-up"
                        style={{ animationDelay: '60ms' }}
                    >
                        <p className="text-6xl font-bold tracking-wider font-principal text-flota-textPrimary">
                            Flota<span className="text-flota-textSecondary">Control</span>
                        </p>
                        <p className="text-xl w-3/4 mx-auto tracking-wider text-center font-semibold font-serif text-flota-textSecondary">
                            Tu herramienta para gestionar tu flota de vehículos de manera eficiente y profesional.
                        </p>
                    </div>

                    {/* Indicador de ruta */}
                    <div
                        className="anim-fade-up"
                        style={{ animationDelay: '200ms' }}
                    >
                        <div className="flex flex-col gap-y-0 relative">

                            {/* Línea conectora animada */}
                            <div className="route-connector" />

                            {[
                                { city: 'Florencia', region: 'Caquetá', label: 'Terminal principal', delay: '260ms' },
                                { city: 'Pitalito', region: 'Huila', label: 'Parada intermedia', delay: '360ms' },
                                { city: 'Cali', region: 'Valle del Cauca', label: 'Parada final', delay: '460ms' },
                            ].map(({ city, region, label, delay }, i) => (
                                <div
                                    key={i}
                                    className="route-item flex items-center gap-x-3 py-[14px] cursor-default"
                                    style={{ animation: `fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) ${delay} both` }}
                                >
                                    <div
                                        className="route-dot w-3 h-3 bg-flota-textSecondary rounded-full"
                                        style={{ animation: `dotPop 0.4s cubic-bezier(0.34,1.56,0.64,1) ${delay} both` }}
                                    />
                                    <div className="route-text flex flex-col">
                                        <div className="tracking-wider font-principal text-xl text-flota-textPrimary">
                                            {city}
                                        </div>
                                        <div className="text-flota-textSecondary/60 text-sm font-serif tracking-wider">
                                            {region} · {label}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ══ PANEL DERECHO ══ */}
                <div className="w-1/2 h-full bg-flota-background flex items-center justify-center relative">
                    <div className="w-full max-w-3/4 px-6">

                        <div className="mb-10 anim-fade-up" style={{ animationDelay: '140ms' }}>
                            <h1 className="font-principal tracking-wider text-[38px] leading-[1.1] text-flota-textPrimary">
                                Ingresa al Sistema
                            </h1>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

                            {/* Campo email */}
                            <div className="flex flex-col gap-1.5 anim-fade-up" style={{ animationDelay: '220ms' }}>
                                <label htmlFor="email" className="font-serif font-semibold text-md tracking-wider text-flota-textSecondary">
                                    Correo
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    placeholder="correo@ejemplo.com"
                                    autoComplete="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="input-field w-full bg-flota-elevated border border-flota-border-default rounded-md
                                               px-4 py-3 text-sm text-flota-textPrimary
                                               placeholder:text-flota-textTertiary placeholder:font-light
                                               outline-none hover:border-flota-border-strong
                                               focus:border-flota-border-focus focus:ring-2 focus:ring-flota-ring-blue"
                                />
                            </div>

                            {/* Campo contraseña */}
                            <div className="flex flex-col gap-1.5 anim-fade-up" style={{ animationDelay: '300ms' }}>
                                <label htmlFor="password" className="font-serif font-semibold text-md tracking-wider text-flota-textSecondary">
                                    Contraseña
                                </label>
                                <input
                                    type="password"
                                    id="password"
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="input-field w-full bg-flota-elevated border border-flota-border-default rounded-md
                                               px-4 py-3 text-sm text-flota-textPrimary
                                               placeholder:text-flota-textTertiary
                                               outline-none hover:border-flota-border-strong
                                               focus:border-flota-border-focus focus:ring-2 focus:ring-flota-ring-blue"
                                />
                            </div>

                            {/* Error */}
                            {error && (
                                <p className="text-red-400 text-sm font-serif tracking-wide">
                                    {error}
                                </p>
                            )}

                            <div className="h-px bg-flota-border-subtle anim-fade-in" style={{ animationDelay: '360ms' }} />

                            {/* Botón */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-submit bg-flota-btn-primary-bg hover:bg-flota-btn-primary-bg-hover
                                           active:bg-flota-btn-primary-bg-press
                                           text-flota-textPrimary font-semibold text-md tracking-wider font-serif
                                           rounded-xl py-3 cursor-pointer anim-fade-up w-3/4 mx-auto
                                           disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ animationDelay: '400ms' }}
                            >
                                {loading ? 'Verificando...' : 'Entrar al Sistema'}
                            </button>

                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}