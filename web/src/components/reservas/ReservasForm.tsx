"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { obtenerFechaLocalISO } from "@/lib/fechas";
import { barberoService } from "@/services/barbero.service";
import { servicioService } from "@/services/servicio.service";
import { citaService, ErrorHorarioNoDisponible } from "@/services/cita.service";
import type { Barbero } from "@/types/barbero";
import type { Servicio } from "@/types/servicio";

// El tipo restringe el índice del wizard a las cuatro etapas disponibles.
type Paso = 1 | 2 | 3 | 4;

// Iniciales para el marcador de posición cuando un barbero no tiene foto.
function calcularIniciales(nombre: string): string {
    return nombre
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((palabra) => palabra[0]?.toUpperCase() ?? "")
        .join("");
}

// Se agrega la hora del mediodía para evitar cambios de fecha por la zona horaria.
function formatearFecha(fecha: string) {
    if (!fecha) return "Sin seleccionar";

    // Se utiliza una fecha al mediodía para que el navegador no la desplace al día anterior.
    return new Intl.DateTimeFormat("es-SV", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(new Date(`${fecha}T12:00:00`));
}

export default function ReservasForm() {
    // El estado del formulario se conserva durante todo el recorrido de los cuatro pasos.
    const [paso, setPaso] = useState<Paso>(1);
    // Estos identificadores permiten relacionar la selección con los catálogos locales.
    const [barberoId, setBarberoId] = useState("");
    const [servicioId, setServicioId] = useState("");
    // La fecha se conserva en formato ISO para que pueda guardarse directamente en una cita.
    const [fecha, setFecha] = useState("");
    const [hora, setHora] = useState("");
    // Los datos del cliente se completan en la última etapa del proceso.
    const [nombre, setNombre] = useState("");
    const [correo, setCorreo] = useState("");
    const [telefono, setTelefono] = useState("");
    const [error, setError] = useState("");
    const [confirmada, setConfirmada] = useState(false);
    const [enviando, setEnviando] = useState(false);

    // El catálogo ahora viene de la API en vez de estar hardcodeado.
    const [barberos, setBarberos] = useState<Barbero[]>([]);
    const [servicios, setServicios] = useState<Servicio[]>([]);
    const [cargandoCatalogo, setCargandoCatalogo] = useState(true);

    useEffect(() => {
        async function cargarCatalogo() {
            try {
                const [barberosDisponibles, serviciosActivos] = await Promise.all([
                    barberoService.obtenerDisponibles(),
                    servicioService.obtenerActivos(),
                ]);

                setBarberos(barberosDisponibles);
                setServicios(serviciosActivos);
            } catch {
                setError("No se pudo cargar el catálogo. Intenta de nuevo más tarde.");
            } finally {
                setCargandoCatalogo(false);
            }
        }

        cargarCatalogo();
    }, []);

    // Los horarios disponibles dependen del barbero, el servicio y la fecha
    // elegidos, así que se recalculan contra la API cada vez que cambian.
    // Se guarda junto con la combinación consultada: si la selección cambió y
    // la respuesta aún no llega, la lista anterior no se muestra y se sabe que
    // todavía se está cargando.
    const claveHorarios = `${barberoId}|${servicioId}|${fecha}`;
    const [horarios, setHorarios] = useState({ clave: "", lista: [] as string[] });
    const horariosDisponibles = horarios.clave === claveHorarios ? horarios.lista : [];
    const cargandoHorarios = Boolean(fecha) && horarios.clave !== claveHorarios;

    useEffect(() => {
        if (!barberoId || !servicioId || !fecha) {
            return;
        }

        let cancelado = false;

        citaService
            .obtenerDisponibilidad(barberoId, servicioId, fecha)
            .then((lista) => {
                if (!cancelado) setHorarios({ clave: claveHorarios, lista });
            })
            .catch(() => {
                if (cancelado) return;
                setHorarios({ clave: claveHorarios, lista: [] });
                setError("No se pudieron consultar los horarios disponibles.");
            });

        return () => {
            cancelado = true;
        };
    }, [barberoId, servicioId, fecha, claveHorarios]);

    // Se recalculan únicamente cuando cambia el identificador seleccionado.
    const barberoSeleccionado = useMemo(
        () => barberos.find((barbero) => barbero.id === barberoId),
        [barberos, barberoId],
    );
    const servicioSeleccionado = useMemo(
        () => servicios.find((servicio) => servicio.id === servicioId),
        [servicios, servicioId],
    );

    function siguientePaso() {
        setError("");

        // Cada paso valida su selección antes de permitir avanzar.
        if (paso === 1 && !barberoId) {
            setError("Selecciona un barbero para continuar.");
            return;
        }

        if (paso === 2 && !servicioId) {
            setError("Selecciona un servicio para continuar.");
            return;
        }

        if (paso === 3 && (!fecha || !hora)) {
            setError("Selecciona una fecha y una hora para continuar.");
            return;
        }

        // Math.min evita que el estado supere la última etapa del formulario.
        setPaso((pasoActual) => Math.min(4, pasoActual + 1) as Paso);
    }

    function pasoAnterior() {
        setError("");
        // Math.max mantiene deshabilitada la navegación antes del primer paso.
        setPaso((pasoActual) => Math.max(1, pasoActual - 1) as Paso);
    }

    async function confirmarReserva(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        // La reserva no se guarda si falta información seleccionada en pasos anteriores.
        if (!barberoSeleccionado || !servicioSeleccionado || !fecha || !hora) {
            setError("Completa todos los datos de la reserva.");
            return;
        }

        setError("");
        setEnviando(true);

        try {
            await citaService.crear({
                nombreCliente: nombre,
                correoCliente: correo,
                telefonoCliente: telefono,
                idBarbero: barberoSeleccionado.id,
                idServicio: servicioSeleccionado.id,
                fecha,
                hora,
            });

            setConfirmada(true);
        } catch (error) {
            if (error instanceof ErrorHorarioNoDisponible) {
                // Otra persona reservó ese horario primero: se refresca la
                // lista y se regresa al paso de fecha/hora para elegir otro.
                setHorarios({ clave: claveHorarios, lista: error.horarios });
                setHora("");
                setPaso(3);
            }

            setError(error instanceof Error ? error.message : "No se pudo confirmar la reserva.");
        } finally {
            setEnviando(false);
        }
    }

    if (confirmada) {
        // La confirmación reemplaza el formulario para evitar envíos duplicados.
        return (
            <section className="app-container section-spacing">
                <div className="mx-auto max-w-3xl rounded-3xl bg-brand-dark p-8 text-center text-white shadow-xl md:p-14">
                    <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-success text-3xl">
                        ✓
                    </span>
                    <h1 className="mt-6 text-3xl font-extrabold text-brand-gold md:text-4xl">
                        ¡Reserva recibida!
                    </h1>
                    <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/80">
                        Hemos registrado tu solicitud. Te esperamos el{" "}
                        <strong className="text-white">{formatearFecha(fecha)}</strong>{" "}
                        a las <strong className="text-white">{hora}</strong>.
                    </p>
                    <Link href="/" className="btn-primary mt-8">
                        Volver al inicio
                    </Link>
                </div>
            </section>
        );
    }

    return (
        <section className="app-container section-spacing">
            <div className="mx-auto max-w-6xl">
                {/* El encabezado identifica la etapa actual y mantiene una instrucción común. */}
                <div className="mb-10 text-center">
                    <p className="font-bold uppercase tracking-[0.25em] text-brand-gold">
                        Reserva tu cita
                    </p>
                    <h1 className="mt-3 text-3xl font-extrabold text-brand-black md:text-5xl">
                        {paso === 1 && "Elige tu barbero"}
                        {paso === 2 && "Elige tu servicio"}
                        {paso === 3 && "Selecciona fecha y hora"}
                        {paso === 4 && "Confirma tus datos"}
                    </h1>
                    <p className="mx-auto mt-4 max-w-2xl text-brand-gray">
                        Completa los pasos para agendar una experiencia hecha para ti.
                    </p>
                </div>

                {/* El indicador permite ubicar al usuario dentro del proceso de reserva. */}
                <div className="mb-10 flex items-center justify-center gap-2 md:gap-4">
                    {[1, 2, 3, 4].map((numero) => (
                        <div key={numero} className="flex items-center gap-2 md:gap-4">
                            <span
                                className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${
                                    numero <= paso
                                        ? "bg-brand-gold text-white"
                                        : "bg-brand-dark/10 text-brand-gray"
                                }`}
                            >
                                {numero}
                            </span>
                            {numero < 4 && (
                                <span
                                    className={`h-1 w-8 rounded-full md:w-16 ${
                                        numero < paso ? "bg-brand-gold" : "bg-brand-dark/10"
                                    }`}
                                />
                            )}
                        </div>
                    ))}
                </div>

                <div className="rounded-3xl bg-white p-5 shadow-xl md:p-10">
                    {/* El contenido cambia según el paso actual, sin perder las selecciones anteriores. */}
                    {/* Paso 1: las imágenes conservan una proporción común para evitar tarjetas irregulares. */}
                    {paso === 1 && cargandoCatalogo && (
                        <p className="py-16 text-center text-lg font-semibold">Cargando barberos...</p>
                    )}

                    {paso === 1 && !cargandoCatalogo && (
                        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                            {barberos.map((barbero) => (
                                <button
                                    key={barbero.id}
                                    type="button"
                                    onClick={() => setBarberoId(barbero.id)}
                                    className={`flex h-full flex-col overflow-hidden rounded-2xl border text-left transition hover:-translate-y-1 hover:border-brand-gold hover:shadow-md ${
                                        barberoId === barbero.id
                                            ? "border-brand-gold bg-brand-gold/10 ring-2 ring-brand-gold"
                                            : "border-gray-200"
                                    }`}
                                >
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
                                    <span className="flex flex-1 flex-col p-5">
                                        <strong className="block text-lg text-brand-black">
                                            {barbero.nombre}
                                        </strong>
                                        <span className="mt-2 block text-sm leading-6 text-brand-gray">
                                            {barbero.especialidad}
                                        </span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Paso 2: cada servicio muestra precio, descripción y duración estimada. */}
                    {paso === 2 && cargandoCatalogo && (
                        <p className="py-16 text-center text-lg font-semibold">Cargando servicios...</p>
                    )}

                    {paso === 2 && !cargandoCatalogo && (
                        <div className="grid gap-5 md:grid-cols-3">
                            {servicios.map((servicio) => (
                                <button
                                    key={servicio.id}
                                    type="button"
                                    onClick={() => setServicioId(servicio.id)}
                                    className={`rounded-2xl border p-6 text-left transition hover:-translate-y-1 hover:border-brand-gold hover:shadow-md ${
                                        servicioId === servicio.id
                                            ? "border-brand-gold bg-brand-gold/10 ring-2 ring-brand-gold"
                                            : "border-gray-200"
                                    }`}
                                >
                                    <span className="text-4xl font-extrabold text-brand-gold">
                                        ${servicio.precio}
                                    </span>
                                    <strong className="mt-4 block text-xl text-brand-black">
                                        {servicio.nombre}
                                    </strong>
                                    <span className="mt-2 block text-sm leading-6 text-brand-gray">
                                        {servicio.descripcion}
                                    </span>
                                    <span className="mt-4 block text-sm font-semibold text-brand-dark">
                                        Duración aproximada: {servicio.duracionMinutos} min
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Paso 3: la fecha limita la selección al día actual o fechas posteriores. */}
                    {paso === 3 && (
                        <div className="grid gap-8 md:grid-cols-2">
                            <label className="block">
                                <span className="mb-3 block font-bold text-brand-black">
                                    Fecha de la cita
                                </span>
                                <input
                                    type="date"
                                    min={obtenerFechaLocalISO()}
                                    value={fecha}
                                    onChange={(event) => setFecha(event.target.value)}
                                    className="input-base"
                                />
                            </label>
                            <fieldset>
                                <legend className="mb-3 font-bold text-brand-black">
                                    Hora disponible
                                </legend>
                                {!fecha && (
                                    <p className="text-sm text-brand-gray">Elige primero una fecha.</p>
                                )}
                                {fecha && cargandoHorarios && (
                                    <p className="text-sm text-brand-gray">Buscando horarios disponibles...</p>
                                )}
                                {fecha && !cargandoHorarios && horariosDisponibles.length === 0 && (
                                    <p className="text-sm text-brand-gray">No hay horarios disponibles ese día.</p>
                                )}
                                {/* Las horas se muestran como botones para facilitar la selección en móvil. */}
                                <div className="grid grid-cols-3 gap-3">
                                    {fecha && horariosDisponibles.map((horario) => (
                                        <button
                                            key={horario}
                                            type="button"
                                            onClick={() => setHora(horario)}
                                            className={`rounded-xl border px-3 py-3 font-semibold transition ${
                                                hora === horario
                                                    ? "border-brand-gold bg-brand-gold text-white"
                                                    : "border-gray-200 text-brand-black hover:border-brand-gold"
                                            }`}
                                        >
                                            {horario}
                                        </button>
                                    ))}
                                </div>
                            </fieldset>
                        </div>
                    )}

                    {/* Paso 4: el formulario y el resumen se presentan en columnas independientes. */}
                    {paso === 4 && (
                        <div className="grid gap-8 lg:grid-cols-[1fr_0.85fr]">
                            <form id="reserva-form" onSubmit={confirmarReserva} className="space-y-5">
                                <label className="block">
                                    <span className="mb-2 block font-bold text-brand-black">
                                        Nombre completo
                                    </span>
                                    <input
                                        required
                                        type="text"
                                        value={nombre}
                                        onChange={(event) => setNombre(event.target.value)}
                                        placeholder="Ej. Carlos Mendoza"
                                        className="input-base"
                                    />
                                </label>
                                <label className="block">
                                    <span className="mb-2 block font-bold text-brand-black">
                                        Correo electrónico
                                    </span>
                                    <input
                                        required
                                        type="email"
                                        value={correo}
                                        onChange={(event) => setCorreo(event.target.value)}
                                        placeholder="correo@ejemplo.com"
                                        className="input-base"
                                    />
                                </label>
                                <label className="block">
                                    <span className="mb-2 block font-bold text-brand-black">
                                        Teléfono
                                    </span>
                                    <input
                                        required
                                        type="tel"
                                        value={telefono}
                                        onChange={(event) => setTelefono(event.target.value)}
                                        placeholder="0000-0000"
                                        className="input-base"
                                    />
                                </label>
                            </form>

                            <aside className="rounded-2xl bg-brand-dark p-6 text-white">
                                <h2 className="text-xl font-extrabold text-brand-gold">
                                    Resumen de tu reserva
                                </h2>
                                <dl className="mt-6 space-y-5">
                                    <div>
                                        <dt className="text-sm text-white/60">Barbero</dt>
                                        <dd className="mt-1 font-bold">
                                            {barberoSeleccionado?.nombre}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm text-white/60">Servicio</dt>
                                        <dd className="mt-1 font-bold">
                                            {servicioSeleccionado?.nombre}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm text-white/60">Fecha y hora</dt>
                                        <dd className="mt-1 font-bold">
                                            {formatearFecha(fecha)}
                                            <br />
                                            {hora}
                                        </dd>
                                    </div>
                                    <div className="border-t border-white/20 pt-5">
                                        <dt className="text-sm text-white/60">Total</dt>
                                        <dd className="mt-1 text-3xl font-extrabold text-brand-gold">
                                            ${servicioSeleccionado?.precio}
                                        </dd>
                                    </div>
                                </dl>
                            </aside>
                        </div>
                    )}

                    {/* Los errores se muestran dentro del flujo para no perder las selecciones realizadas. */}
                    {error && (
                        <p role="alert" className="mt-6 rounded-xl bg-red-50 p-3 text-center font-semibold text-red-700">
                            {error}
                        </p>
                    )}

                    {/* La navegación se mantiene fuera de cada paso para conservar una posición consistente. */}
                    <div className="mt-10 flex flex-col-reverse gap-4 border-t border-gray-100 pt-6 sm:flex-row sm:justify-between">
                        <button
                            type="button"
                            onClick={pasoAnterior}
                            disabled={paso === 1}
                            className="btn-navigation bg-brand-dark disabled:bg-brand-dark/40"
                        >
                            Atrás
                        </button>
                        {paso < 4 ? (
                            <button type="button" onClick={siguientePaso} className="btn-navigation">
                                Siguiente
                            </button>
                        ) : (
                            <>
                                {/* El botón se vincula al formulario mediante su id porque se renderiza fuera del form. */}
                                <button
                                    type="submit"
                                    form="reserva-form"
                                    disabled={enviando}
                                    className="btn-navigation disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {enviando ? "Enviando..." : "Confirmar reserva"}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
