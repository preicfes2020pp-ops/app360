import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import Sidebar from "@/app/components/Sidebar";

export default async function DashboardSuperAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol, nombre_completo")
    .eq("id", user.id)
    .single();

  if (!perfil || perfil.rol !== "superadmin") redirect("/login");

  const { count: totalInstituciones } = await supabase
    .from("instituciones")
    .select("id", { count: "exact", head: true });

  const { count: totalUsuarios } = await supabase
    .from("perfiles")
    .select("id", { count: "exact", head: true });

  return (
    <div className="flex">
      <Sidebar rol="superadmin" nombre={perfil.nombre_completo} />
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold" style={{ color: "var(--a360-azul-oscuro)" }}>
          Panel SuperAdmin
        </h1>
        <p className="text-gray-500 mt-1">Administración global de la plataforma AULA360.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          <div className="bg-white rounded-xl shadow-sm p-5 border">
            <p className="text-sm text-gray-500">Instituciones</p>
            <p className="text-3xl font-bold mt-1" style={{ color: "var(--a360-azul)" }}>
              {totalInstituciones ?? 0}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border">
            <p className="text-sm text-gray-500">Usuarios totales</p>
            <p className="text-3xl font-bold mt-1" style={{ color: "var(--a360-verde)" }}>
              {totalUsuarios ?? 0}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border opacity-60">
            <p className="text-sm text-gray-500">Auditoría</p>
            <p className="text-xs text-gray-400 mt-2">Vista de registro disponible en la próxima fase</p>
          </div>
        </div>
      </main>
    </div>
  );
}
