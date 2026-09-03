import Link from "next/link";
import Image from "next/image";

// Landing mínima de entrada. La lógica real de "a dónde va cada rol"
// vive en /login, que redirige según perfiles.rol tras autenticar.
export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <Image src="/logo.png" alt="AULA360" width={140} height={140} priority />
      <div>
        <h1 className="text-3xl font-bold" style={{ color: "var(--a360-azul-oscuro)" }}>
          AULA360
        </h1>
        <p className="text-sm text-gray-500 mt-1">Planea. Enseña. Evalúa. Mejora.</p>
      </div>
      <Link
        href="/login"
        className="a360-gradiente text-white font-semibold px-6 py-3 rounded-xl shadow-md hover:opacity-90 transition"
      >
        Ingresar a AULA360
      </Link>
    </main>
  );
}
