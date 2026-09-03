"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase";
import { RUTA_POR_ROL, type RolAula360 } from "@/lib/roles";

export default function LoginPage() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    const supabase = createClient();

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({ email: correo, password });

    if (authError || !authData.user) {
      setError("Correo o contraseña incorrectos.");
      setCargando(false);
      return;
    }

    // El rol vive en `perfiles`, no se asume desde el cliente.
    const { data: perfil, error: perfilError } = await supabase
      .from("perfiles")
      .select("rol")
      .eq("id", authData.user.id)
      .single();

    if (perfilError || !perfil) {
      setError(
        "Tu cuenta no tiene un perfil AULA360 asociado todavía. Contacta al administrador de tu institución."
      );
      setCargando(false);
      return;
    }

    router.push(RUTA_POR_ROL[perfil.rol as RolAula360] ?? "/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--a360-fondo)" }}>
      <form
        onSubmit={handleSubmit}
        className="bg-white w-full max-w-sm rounded-2xl shadow-lg p-8 flex flex-col gap-4"
      >
        <div className="flex flex-col items-center gap-2 mb-2">
          <Image src="/logo.png" alt="AULA360" width={72} height={72} />
          <h1 className="text-xl font-bold" style={{ color: "var(--a360-azul-oscuro)" }}>
            Ingresar a AULA360
          </h1>
        </div>

        <label className="text-sm font-medium">
          Correo
          <input
            type="email"
            required
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            className="mt-1 w-full border rounded-lg px-3 py-2"
            placeholder="docente@institucion.edu.co"
          />
        </label>

        <label className="text-sm font-medium">
          Contraseña
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full border rounded-lg px-3 py-2"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={cargando}
          className="a360-gradiente text-white font-semibold rounded-lg py-2 disabled:opacity-60"
        >
          {cargando ? "Ingresando..." : "Ingresar"}
        </button>

        <a href="/registro" className="text-center text-sm text-gray-500 hover:underline">
          ¿Eres docente y no tienes cuenta? Regístrate
        </a>
      </form>
    </main>
  );
}
