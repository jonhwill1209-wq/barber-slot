/* ================================================
    web/src/components/layout/PublicHeader.tsx
    Diseño del Header Público
================================================ */
import Image from "next/image";
import Link from "next/link";

import PrimaryButton from "@/components/ui/PrimaryButton";

const navigation = [
    { label: "Inicio", href: "/" },
    { label: "Barberos", href: "/barberos" }
];

export default function Header() {
    return (
        <header className="bg-brand-black">
            <div className="app-container flex min-h-28 items-center justify-between gap-8">
                {/* Logo */}
                <Link href="/" aria-label="Ir al inicio">
                <Image src="/images/brand/logo.svg"
                        alt="BarberSlot"
                        width={72}
                        height={72}
                        priority />
                </Link>

                {/* Navegación principal */}
                <nav className="hidden items-center gap-12 lg:flex">
                    {navigation.map((item) => (
                        <Link key={item.href}
                                href={item.href}
                                className="nav-link" >
                            {item.label}
                        </Link>
                    ))}
                </nav>

                {/* Botón para reservar una cita */}
                <PrimaryButton href="/reservar">
                    Reservar cita
                </PrimaryButton>
            </div>
        </header>
    );
}
