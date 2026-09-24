/* =====================================================
    web/src/components/barberos/BarberosCard.tsx
    Diseño de la vista de Barberos
===================================================== */
import Image from "next/image";
import type { Barbero } from "@/types/barbero";

function calcularIniciales(nombre: string): string {
    return nombre
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((palabra) => palabra[0]?.toUpperCase() ?? "")
        .join("");
}

export default function BarberosCard({ barbero }: { barbero: Barbero }) {
    return (
        <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 text-left shadow-sm">
            {barbero.imagenUrl ? (
                <Image
                    src={barbero.imagenUrl}
                    alt={barbero.nombre}
                    width={640}
                    height={420}
                    className="aspect-[4/3] w-full object-cover"
                />
            ) : (
                <span className="flex aspect-[4/3] w-full items-center justify-center bg-brand-dark text-3xl font-extrabold text-brand-gold">
                    {calcularIniciales(barbero.nombre)}
                </span>
            )}
            <div className="flex flex-1 flex-col p-5">
                <strong className="block text-lg text-brand-black">{barbero.nombre}</strong>
                <span className="mt-2 block text-sm leading-6 text-brand-gray">{barbero.especialidad}</span>
            </div>
        </div>
    );
}
