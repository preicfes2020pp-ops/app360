import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import Sidebar from "@/app/components/Sidebar";
import FormularioGenerarBanco from "@/app/components/FormularioGenerarBanco";

const AREAS_ICFES = ["MAT", "LEC", "NAT", "SOC"];

type Fila = { area: string; asignatura: string; grado: number; sin_revisar: number; verificada: number; rechazada: number };

export default async function BancoSuperadmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: perfil } = await supabase.from("perfiles").select("rol, nombre_completo").eq("id", user.id).single();
  if (!perfil || perfil.rol !== "superadmin") redirect("/login");

  const { data: crudo } = await supabase
    .from("catalogo_areas")
    .select("id, codigo, nombre, orden, catalogo_asignaturas(id, nombre, orden)")
    .in("codigo", AREAS_ICFES)
    .eq("activa", true)
    .order("orden");

  const areas = ((crudo ?? []) as any[]).map((a) => ({
    id: a.id as string,
    nombre: a.nombre as string,
    asignaturas: ((a.catalogo_asignaturas ?? []) as any[])
      .sort((x, y) => x.orden - y.orden)
      .map((s) => ({ id: s.id as string, nombre: s.nombre as string })),
  }));

  const { data: resumenCrudo } = await supabase.from("resumen_banco").select("area, asignatura, grado, estado, total");

  const mapa = new Map<string, Fila>();
  const totales = { sin_revisar: 0, verificada: 0, rechazada: 0 };
  for (const r of (resumenCrudo ?? []) as any[]) {
    const clave = `${r.area}|${r.asignatura}|${r.grado}`;
    const fila: Fila = mapa.get(clave) ?? { area: r.area, asignatura: r.asignatura, grado: r.grado, sin_revisar: 0, verificada: 0, rechazada: 0 };
    if (r.estado in totales) {
      (fila as any)[r.estado] += r.total;
      (totales as any)[r.estado] += r.total;
    }
    mapa.set(clave, fila);
  }
  const filas = Array.from(mapa.values()).sort(
    (a, b) => a.area.localeCompare(b.area, "es") || a.asignatura.localeCompare(b.asignatura, "es") || a.grado - b.grado
  );

  return (
    <div className="flex">
      <Sidebar rol="superadmin" nombre={perfil.nombre_completo} />
      <main className="flex-1 p-8 flex flex-col gap-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--a360-azul-oscuro)" }}>Banco de preguntas</h1>

        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <div className="bg-white border rounded-xl p-4">
            <p className="text-2xl font-extrabold">{totales.sin_revisar}</p>
            <p className="text-gray-500">Sin revisar</p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <p className="text-2xl font-extrabold text-green-600">{totales.verificada}</p>
            <p className="text-gray-500">Verificadas</p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <p className="text-2xl font-extrabold text-red-500">{totales.rechazada}</p>
            <p className="text-gray-500">Rechazadas</p>
          </div>
        </div>

        <FormularioGenerarBanco areas={areas} />

        <div className="bg-white border rounded-xl overflow-hidden">
          <h2 className="p-3 font-semibold border-b bg-gray-50 text-sm">Preguntas por asignatura y grado</h2>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="p-3">Área</th><th className="p-3">Asignatura</th><th className="p-3">Grado</th>
                <th className="p-3">Sin revisar</th><th className="p-3">Verificadas</th><th className="p-3">Rechazadas</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={`${f.area}|${f.asignatura}|${f.grado}`} className="border-t">
                  <td className="p-3">{f.area}</td>
                  <td className="p-3">{f.asignatura}</td>
                  <td className="p-3">{f.grado}</td>
                  <td className="p-3">{f.sin_revisar}</td>
                  <td className="p-3">{f.verificada}</td>
                  <td className="p-3">{f.rechazada}</td>
                </tr>
              ))}
              {filas.length === 0 && (
                <tr><td colSpan={6} className="p-4 text-gray-400">El banco está vacío todavía.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
