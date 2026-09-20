import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import Sidebar from "@/app/components/Sidebar";
import Saber11Subida from "@/app/components/Saber11Subida";
import Saber11Analisis from "@/app/components/Saber11Analisis";
import type { RolAula360 } from "@/lib/roles";

export default async function PaginaSaber11() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol, nombre_completo, institucion_id")
    .eq("id", user.id)
    .single();

  if (!perfil || !["rector", "coordinador", "superadmin"].includes(perfil.rol)) {
    redirect("/login");
  }

  const { data: resultados } = await supabase
    .from("saber11_resultados_individuales")
    .select(
      "anio, puntaje_global, lectura_critica_puntaje, matematicas_puntaje, sociales_ciudadanas_puntaje, ciencias_naturales_puntaje, ingles_puntaje, percentil_global_nacional"
    )
    .eq("institucion_id", perfil.institucion_id)
    .order("anio", { ascending: true });

  return (
    <div className="flex">
      <Sidebar rol={perfil.rol as RolAula360} nombre={perfil.nombre_completo} />
      <main className="flex-1 p-8 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--a360-azul-oscuro)" }}>
            Resultados Saber 11
          </h1>
          <p className="text-sm text-gray-500">
            Sube los resultados individuales para ver el análisis institucional en tiempo real, sin
            esperar al reporte oficial del ICFES.
          </p>
        </div>

        <Saber11Subida />
        <Saber11Analisis resultados={resultados ?? []} />
      </main>
    </div>
  );
}
