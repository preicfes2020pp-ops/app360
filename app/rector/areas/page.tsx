import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import Sidebar from "@/app/components/Sidebar";
import FormularioAreaAsignatura from "@/app/components/FormularioAreaAsignatura";
import FormularioCatalogoAreas from "@/app/components/FormularioCatalogoAreas";

export default async function AreasRector() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: perfil } = await supabase.from("perfiles").select("rol, nombre_completo, institucion_id").eq("id", user.id).single();
  if (!perfil || perfil.rol !== "rector") redirect("/login");

  const { data: areas } = await supabase
    .from("areas")
    .select("id, nombre, catalogo_area_id, asignaturas(id, nombre, catalogo_asignatura_id)")
    .eq("institucion_id", perfil.institucion_id)
    .order("nombre");

  const { data: catalogoCrudo } = await supabase
    .from("catalogo_areas")
    .select("id, nombre, orden, catalogo_asignaturas(id, nombre, orden)")
    .eq("activa", true)
    .order("orden");

  const catalogo = ((catalogoCrudo ?? []) as any[]).map((a) => ({
    id: a.id as string,
    nombre: a.nombre as string,
    asignaturas: ((a.catalogo_asignaturas ?? []) as any[])
      .sort((x, y) => x.orden - y.orden)
      .map((s) => ({ id: s.id as string, nombre: s.nombre as string })),
  }));

  const existentes = ((areas ?? []) as any[])
    .filter((a) => a.catalogo_area_id)
    .map((a) => ({
      areaId: a.id as string,
      catalogoAreaId: a.catalogo_area_id as string,
      catalogoAsignaturaIds: ((a.asignaturas ?? []) as any[])
        .map((s) => s.catalogo_asignatura_id)
        .filter(Boolean) as string[],
    }));

  return (
    <div className="flex">
      <Sidebar rol="rector" nombre={perfil.nombre_completo} />
      <main className="flex-1 p-8 flex flex-col gap-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--a360-azul-oscuro)" }}>Áreas y asignaturas</h1>

        <FormularioCatalogoAreas institucionId={perfil.institucion_id} catalogo={catalogo} existentes={existentes} />

        <p className="text-sm text-gray-500">
          Áreas propias del colegio (no usan el banco de preguntas):
        </p>
        <FormularioAreaAsignatura institucionId={perfil.institucion_id} areas={(areas ?? []).map(a => ({ id: a.id, nombre: a.nombre }))} />

        <div className="bg-white border rounded-xl divide-y">
          {(areas ?? []).map((a: any) => (
            <div key={a.id} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-sm">{a.nombre}</p>
                <span className={`text-xs rounded-full px-3 py-1 ${a.catalogo_area_id ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {a.catalogo_area_id ? "Banco de preguntas" : "Propia"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {(a.asignaturas ?? []).map((s: any) => (
                  <span key={s.id} className="text-xs bg-gray-100 rounded-full px-3 py-1">{s.nombre}</span>
                ))}
                {(a.asignaturas ?? []).length === 0 && <span className="text-xs text-gray-400">Sin asignaturas todavía</span>}
              </div>
            </div>
          ))}
          {(areas ?? []).length === 0 && <p className="p-4 text-sm text-gray-400">Aún no hay áreas.</p>}
        </div>
      </main>
    </div>
  );
}
