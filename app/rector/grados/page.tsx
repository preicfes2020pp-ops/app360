import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import Sidebar from "@/app/components/Sidebar";
import FormularioGrado from "@/app/components/FormularioGrado";

export default async function GradosRector() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: perfil } = await supabase.from("perfiles").select("rol, nombre_completo, institucion_id").eq("id", user.id).single();
  if (!perfil || perfil.rol !== "rector") redirect("/login");

  const { data: grados } = await supabase.from("grados").select("id, nombre").eq("institucion_id", perfil.institucion_id).order("nombre");

  return (
    <div className="flex">
      <Sidebar rol="rector" nombre={perfil.nombre_completo} />
      <main className="flex-1 p-8 flex flex-col gap-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--a360-azul-oscuro)" }}>Grados</h1>
        <FormularioGrado institucionId={perfil.institucion_id} />
        <div className="bg-white border rounded-xl divide-y">
          {(grados ?? []).map((g) => <div key={g.id} className="p-3 text-sm">{g.nombre}</div>)}
          {(grados ?? []).length === 0 && <p className="p-4 text-sm text-gray-400">Aún no hay grados.</p>}
        </div>
      </main>
    </div>
  );
}
