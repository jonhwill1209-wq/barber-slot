/* ================================================
    web/prisma/seed.ts
    Datos de ejemplo para desarrollo (reemplaza al mock de localStorage)
================================================ */
import { config } from "dotenv";
config({ path: ".env.local" });

import bcrypt from "bcrypt";
import { prisma } from "../src/lib/prisma";
import { combinarFechaHora, obtenerFechaLocalISO } from "../src/lib/fechas";

async function main() {
    // Se limpia en orden inverso a las relaciones para no chocar con las
    // llaves foráneas, y así el seed se puede correr varias veces sin fallar.
    await prisma.cita.deleteMany();
    await prisma.cliente.deleteMany();
    await prisma.usuario.deleteMany();
    await prisma.barbero.deleteMany();
    await prisma.servicio.deleteMany();

    const henry = await prisma.barbero.create({
        data: { nombre: "Henry Martinez", especialidad: "Corte y barba", activo: true, disponible: true, imagenUrl: "/images/barberos/pablo-neruda.jpg" },
    });
    const francisco = await prisma.barbero.create({
        data: { nombre: "Francisco Duran", especialidad: "Corte", activo: true, disponible: true, imagenUrl: "/images/barberos/nelson-portillo.jpg" },
    });
    const christopher = await prisma.barbero.create({
        data: { nombre: "Christopher Alvarenga", especialidad: "Barba", activo: true, disponible: true, imagenUrl: "/images/barberos/juan-melendez.jpg" },
    });
    const carlos = await prisma.barbero.create({
        data: { nombre: "Carlos Villacorta", especialidad: "Corte clásico", activo: true, disponible: true, imagenUrl: "/images/barberos/primero-disponible.jpg" },
    });

    const soloCorte = await prisma.servicio.create({
        data: { nombre: "Solo Corte", descripcion: "Servicio de corte de cabello.", precio: 5, duracionMinutos: 30, activo: true },
    });
    const corteYBarba = await prisma.servicio.create({
        data: { nombre: "Corte y Barba", descripcion: "Servicio combinado de corte y barba.", precio: 8, duracionMinutos: 45, activo: true },
    });
    const soloBarba = await prisma.servicio.create({
        data: { nombre: "Solo Barba", descripcion: "Perfilado y arreglo de barba.", precio: 3, duracionMinutos: 15, activo: true },
    });
    await prisma.servicio.create({
        data: { nombre: "Afeitado Clásico", descripcion: "Servicio de afeitado clásico.", precio: 2, duracionMinutos: 10, activo: true },
    });

    await prisma.usuario.create({
        data: {
            nombre: "Administrador BarberSlot",
            correo: "admin@barberslot.test",
            contraHash: await bcrypt.hash("Admin123!", 10),
            rol: "administrador",
            activo: true,
        },
    });
    await prisma.usuario.create({
        data: {
            nombre: "Henry Martinez",
            correo: "henry@barberslot.test",
            contraHash: await bcrypt.hash("Barber123!", 10),
            rol: "barbero",
            activo: true,
            barberoId: henry.id,
        },
    });

    const hoy = obtenerFechaLocalISO();

    async function crearCitaEjemplo(
        nombreCliente: string,
        barberoId: string,
        servicioId: string,
        hora: string,
        duracionMinutos: number,
        estado: "pendiente" | "confirmada" | "cancelada"
    ) {
        const fechaInicio = combinarFechaHora(hoy, hora);
        const fechaFin = new Date(fechaInicio.getTime() + duracionMinutos * 60_000);
        const correo = `${nombreCliente.toLowerCase().replace(/\s+/g, ".")}@ejemplo.com`;

        await prisma.cita.create({
            data: {
                fechaInicio,
                fechaFin,
                estado,
                barbero: { connect: { id: barberoId } },
                servicio: { connect: { id: servicioId } },
                cliente: { create: { nombre: nombreCliente, correo, telefono: "0000-0000" } },
            },
        });
    }

    await crearCitaEjemplo("Carlos Mendoza", francisco.id, soloCorte.id, "09:00", soloCorte.duracionMinutos, "confirmada");
    await crearCitaEjemplo("Victor Flores", christopher.id, corteYBarba.id, "10:30", corteYBarba.duracionMinutos, "pendiente");
    await crearCitaEjemplo("Elias Quinteros", carlos.id, soloBarba.id, "12:00", soloBarba.duracionMinutos, "confirmada");
    await crearCitaEjemplo("Samuel Anaya", henry.id, corteYBarba.id, "14:00", corteYBarba.duracionMinutos, "pendiente");
    await crearCitaEjemplo("Kevin Hernandez", carlos.id, soloCorte.id, "16:30", soloCorte.duracionMinutos, "cancelada");

    console.log("Seed completado.");
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
