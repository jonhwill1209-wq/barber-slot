"use client";

/* ================================================
    web/src/app/(public)/barberos/page.tsx
    Página para visualizar barberos disponibles
================================================ */
import { useEffect, useState } from "react";

import BarberosCard from "@/components/barberos/BarberosCard";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { barberoService } from "@/services/barbero.service";
import type { Barbero } from "@/types/barbero";

export default function BarberosPage() {
    const [barberos, setBarberos] = useState<Barbero[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        barberoService
            .obtenerDisponibles()
            .then(setBarberos)
            .catch(() => setError("No se pudieron cargar los barberos. Intenta de nuevo más tarde."))
            .finally(() => setCargando(false));
    }, []);

    return (
        <section className="section-spacing">
            <div className="app-container">
                <h1 className="section-title">
                    Nuestro equipo
                </h1>

                <p className="section-subtitle">
                    Cada uno tiene una historia que contarte, un regalo, una convicción
                    que darte.
                </p>

                {cargando && (
                    <p className="mt-14 text-center text-lg font-semibold">Cargando barberos...</p>
                )}

                {!cargando && error && (
                    <p role="alert" className="mt-14 text-center text-lg font-semibold text-red-700">{error}</p>
                )}

                {!cargando && !error && barberos.length === 0 && (
                    <p className="mt-14 text-center text-lg font-semibold">No hay barberos disponibles por el momento.</p>
                )}

                {!cargando && barberos.length > 0 && (
                    <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {barberos.map((barbero) => (
                            <BarberosCard key={barbero.id} barbero={barbero} />
                        ))}
                    </div>
                )}

                <div className="mt-14 flex justify-center">
                    <PrimaryButton href="/reservar" className="min-w-56 text-lg">
                        Reservar cita
                    </PrimaryButton>
                </div>
            </div>
        </section>
    );
}
