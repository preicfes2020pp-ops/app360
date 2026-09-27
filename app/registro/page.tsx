"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase";
import FotoPerfil from "@/app/components/FotoPerfil";

type Institucion = { id: string; nombre: string };
type Rol = "docente" | "rector" | "coordinador";

export default function RegistroDocente() {
  const router = useRouter();
  const supabase = createClient();

  const [instituciones, setInstituciones] = useState<Institucion[]>([]);
  const [rol, setRol] = useState<Rol>("docente");
  const [form, setForm] = useState({
    nombreCompleto: "",
    numeroDocumento: "",
    correo: "",
    telefono: "",
    institucionId: "",
    areaPrincipal: "",
    codigo: "",
    password: "",
  });
  const [fotoBlob, setFotoBlob] = useState<Blob | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    supabase
      .from("instituciones")
      .select("id, nombre")
      .eq("activa", true)
      .order("nombre")
      .then(({ data }) => setInstituciones(data ?? []));
  }, [supabase]);

  function actualizar<K extends keyof typeof form>(campo: K, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);

    if (rol === "docente" && !form.institucionId) {
      setError("Selecciona tu institución.");
      return;
    }
    if (rol !== "docente" && !form.codigo.trim()) {
      setError("Escribe el código de invitación que te dieron.");
      return;
    }
    setEnviando(true);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: form.correo,
      password: form.password,
    });

    if (signUpError || !signUpData.user) {
      setError(signUpError?.message ?? "No pudimos crear tu cuenta.");
      setEnviando(false);
      return;
    }
    const userId = signUpData.user.id;

    let fotoUrl: string | null = null;
    if (fotoBlob && signUpData.session) {
      const ruta = `${userId}/perfil.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("fotos-perfil")
        .upload(ruta, fotoBlob, { upsert: true, contentType: "image/jpeg" });
      if (!uploadError) {
        fotoUrl = supabase.storage.from("fotos-perfil").getPublicUrl(ruta).data.publicUrl;
      }
    }

    const res = await fetch("/api/registro/completar-perfil", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userId,
        rolElegido: rol,
        nombreCompleto: form.nombreCompleto,
        numeroDocumento: form.numeroDocumento,
        correo: form.correo,
        telefono: form.telefono,
        fotoUrl,
        institucionId: form.institucionId,
        areaPrincipal: form.areaPrincipal,
        codigo: form.codigo,
      }),
    });
    const data = await res.json();
    setEnviando(false);

    if (!res.ok) {
      setError(data.error ?? "No pudimos completar tu registro.");
      return;
    }

    if (!signUpData.session) {
      setOk("Cuenta creada. Revisa tu correo para confirmar tu cuenta, luego inicia sesión.");
      return;
    }

    if (rol === "rector") router.push("/rector");
    else if (rol === "coordinador") router.push("/saber11");
    else router.push("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-10" style={{ background: "var(--a360-fondo)" }}>
      <form onSubmit={handleSubmit} className="bg-white w-full max-w-md rounded-2xl shadow-lg p-8 flex flex-col gap-4">
        <div className="flex flex-col items-center gap-2 mb-2">
          <Image src="/logo.png" alt="AULA360" width={64} height={64} />
          <h1 className="text-xl font-bold" style={{ color: "var(--a360-azul-oscuro)" }}>
            Crear cuenta
          </h1>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(["docente", "rector", "coordinador"] as Rol[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRol(r)}
              className={`rounded-lg py-2 text-sm font-semibold border ${rol === r ? "a360-gradiente text-white border-transparent" : "text-gray-600"}`}
            >
              {r === "docente" ? "Docente" : r === "rector" ? "Rector" : "Coordinador"}
            </button>
          ))}
        </div>

        <FotoPerfil onFotoLista={(blob, preview) => { setFotoBlob(blob); setFotoPreview(preview); }} />
        {fotoPreview && (
          <p className="text-xs text-green-600 text-center -mt-2">Foto lista para guardar ✓</p>
        )}

        <input required placeholder="Nombre completo" className="border rounded-lg px-3 py-2 text-sm"
          value={form.nombreCompleto} onChange={(e) => actualizar("nombreCompleto", e.target.value)} />
        <input required placeholder="Número de documento" className="border rounded-lg px-3 py-2 text-sm"
          value={form.numeroDocumento} onChange={(e) => actualizar("numeroDocumento", e.target.value)} />
        <input required type="email" placeholder="Correo" className="border rounded-lg px-3 py-2 text-sm"
          value={form.correo} onChange={(e) => actualizar("correo", e.target.value)} />
        <input placeholder="Teléfono" className="border rounded-lg px-3 py-2 text-sm"
          value={form.telefono} onChange={(e) => actualizar("telefono", e.target.value)} />

        {rol === "docente" ? (
          <>
            <select required className="border rounded-lg px-3 py-2 text-sm" value={form.institucionId}
              onChange={(e) => actualizar("institucionId", e.target.value)}>
              <option value="">Selecciona tu institución</option>
              {instituciones.map((i) => (
                <option key={i.id} value={i.id}>{i.nombre}</option>
              ))}
            </select>
            {instituciones.length === 0 && (
              <p className="text-xs text-amber-600">
                Todavía no hay instituciones registradas. Pide al SuperAdmin que registre tu institución primero.
              </p>
            )}
            <input placeholder="Área principal (ej. Ciencias Naturales)" className="border rounded-lg px-3 py-2 text-sm"
              value={form.areaPrincipal} onChange={(e) => actualizar("areaPrincipal", e.target.value)} />
          </>
        ) : (
          <input required placeholder={`Código de invitación de ${rol}`} className="border rounded-lg px-3 py-2 text-sm font-mono"
            value={form.codigo} onChange={(e) => actualizar("codigo", e.target.value.toUpperCase())} />
        )}

        <input required type="password" placeholder="Contraseña" minLength={6} className="border rounded-lg px-3 py-2 text-sm"
          value={form.password} onChange={(e) => actualizar("password", e.target.value)} />

        {error && <p className="text-sm text-red-600">{error}</p>}
        {ok && <p className="text-sm text-green-600">{ok}</p>}

        <button type="submit" disabled={enviando} className="a360-gradiente text-white font-semibold rounded-lg py-2 disabled:opacity-60">
          {enviando ? "Creando cuenta..." : "Crear mi cuenta"}
        </button>
      </form>
    </main>
  );
}
