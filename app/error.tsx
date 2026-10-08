"use client";

import Image from "next/image";
import Link from "next/link";

export default function ErrorPagina({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-10" style={{ background: "var(--a360-fondo)" }}>
      <div className="bg-white w-full max-w-md rounded-2xl shadow-lg p-8 flex flex-col gap-4 items-center text-center">
        <Image src="/logo.png" alt="AULA360" width={64} height={64} />
        <h1 className="text-xl font-bold" style={{ color: "var(--a360-azul-oscuro)" }}>
          Algo salió mal
        </h1>
        <p className="text-sm text-gray-600">
          Tuvimos un problema al cargar esta página. Puedes intentarlo de nuevo o volver al inicio.
        </p>
        <button onClick={() => reset()} className="a360-gradiente text-white font-semibold rounded-lg py-2 px-6 w-full">
          Intentar de nuevo
        </button>
        <Link href="/" className="text-sm font-semibold" style={{ color: "var(--a360-azul)" }}>
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
