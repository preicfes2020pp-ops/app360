import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import Sidebar from "@/app/components/Sidebar";
import FormularioAreaAsignatura from "@/app/components/FormularioAreaAsignatura";

export default async function AreasRector() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: perfil } = await supabase.from("perfiles").select("rol, nombre_completo, institucion_id").eq("id", user.id).single();
  if (!perfil || perfil.rol !== "rector") redirect("/login");

  const { data: areas } = await supabase
    .from("areas")
    .select("id, nombre, asignaturas(id, nombre)")
    .eq("institucion_id", perfil.institucion_id)
    .order("nombre");

  return (
    <div className="flex">
      <Sidebar rol="rector" nombre={perfil.nombre_completo} />
      <main className="flex-1 p-8 flex flex-col gap-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--a360-azul-oscuro)" }}>Áreas y asignaturas</h1>
        <FormularioAreaAsignatura institucionId={perfil.institucion_id} areas={(areas ?? []).map(a => ({ id: a.id, nombre: a.nombre }))} />

        <div className="bg-white border rounded-xl divide-y">
          {(areas ?? []).map((a) => (
            <div key={a.id} className="p-4">
              <p className="font-semibold text-sm">{a.nombre}</p>
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
