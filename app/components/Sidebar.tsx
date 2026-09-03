"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { RolAula360 } from "@/lib/roles";

// Regla heredada de LlévameQ: el Sidebar SOLO enlaza a páginas que ya
// existen y funcionan. Nada de botones a secciones todavía no construidas.
// Cada fase que agregue una página real, agrega aquí su enlace.
const NAV_POR_ROL: Record<RolAula360, { href: string; label: string }[]> = {
  docente: [
    { href: "/dashboard", label: "Inicio" },
    { href: "/dashboard/generador-ia", label: "Generador IA" },
    { href: "/dashboard/plan-de-area", label: "Plan de área" },
    { href: "/dashboard/dia-a-dia", label: "Día a día" },
    { href: "/dashboard/asistencia", label: "Asistencia" },
  ],
  rector: [
    { href: "/rector", label: "Inicio" },
    { href: "/rector/docentes", label: "Docentes" },
    { href: "/rector/grados", label: "Grados" },
    { href: "/rector/grupos", label: "Grupos" },
    { href: "/rector/areas", label: "Áreas y asignaturas" },
    { href: "/rector/asignaciones", label: "Asignación de docentes" },
    { href: "/rector/estudiantes", label: "Estudiantes" },
  ],
  superadmin: [
    { href: "/superadmin", label: "Inicio" },
    { href: "/superadmin/instituciones", label: "Instituciones" },
  ],
};

export default function Sidebar({
  rol,
  nombre,
}: {
  rol: RolAula360;
  nombre: string;
}) {
  const router = useRouter();

  async function cerrarSesion() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="w-64 shrink-0 bg-white border-r flex flex-col justify-between min-h-screen">
      <div>
        <div className="flex items-center gap-2 px-5 py-5 border-b">
          <Image src="/logo.png" alt="AULA360" width={36} height={36} />
          <span className="font-bold" style={{ color: "var(--a360-azul-oscuro)" }}>
            AULA360
          </span>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {NAV_POR_ROL[rol].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-100"
              style={{ color: "var(--a360-texto)" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="p-3 border-t">
        <p className="text-xs text-gray-400 px-3 mb-2 truncate">{nombre}</p>
        <button
          onClick={cerrarSesion}
          className="w-full text-left rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
