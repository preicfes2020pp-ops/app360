import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import Sidebar from "@/app/components/Sidebar";
import ExamenGenerador from "@/app/components/ExamenGenerador";
import ExamenInglesGenerador from "@/app/components/ExamenInglesGenerador";

export default async function ExamenesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: perfil } = await supabase.from("perfiles").select("rol, nombre_completo").eq("id", user.id).single();
  if (!perfil || perfil.rol !== "docente") redirect("/login");

  const { data: asignacionesRaw } = await supabase
    .from("asignaciones_docente")
    .select("id, grados(nombre), grupos(nombre), areas(nombre), asignaturas(nombre)")
    .eq("docente_id", user.id);
  const asignaciones = (asignacionesRaw ?? []).map((a: any) => ({
    id: a.id, label: `${a.grados?.nombre} ${a.grupos?.nombre} — ${a.areas?.nombre} / ${a.asignaturas?.nombre}`,
  }));

  // Cada versión (A/B/C) es su propia fila en `examenes` — no hay una
  // columna que las agrupe, así que se agrupan aquí por (asignacion_id +
  // tema), que es la combinación que uso al crearlas.
  const { data: examenesRaw } = await supabase
    .from("examenes")
    .select("id, tema, version, tipo, estado, creado_en, asignacion_id, asignaciones_docente(grados(nombre), grupos(nombre), areas(nombre))")
    .eq("docente_id", user.id)
    .order("creado_en", { ascending: false });

  const familias = new Map<string, { tema: string; clase: string; tipo: string; estado: string; creado_en: string; versiones: Record<string, string> }>();
  (examenesRaw ?? []).forEach((e: any) => {
    const clave = `${e.asignacion_id}__${e.tema}`;
    if (!familias.has(clave)) {
      familias.set(clave, {
        tema: e.tema, tipo: e.tipo,
        clase: `${e.asignaciones_docente?.grados?.nombre ?? ""} ${e.asignaciones_docente?.grupos?.nombre ?? ""} — ${e.asignaciones_docente?.areas?.nombre ?? ""}`,
        estado: e.estado, creado_en: e.creado_en, versiones: {},
      });
    }
    familias.get(clave)!.versiones[e.version] = e.id;
    // La versión A es la que manda el estado que se muestra en la tabla.
    if (e.version === "A") familias.get(clave)!.estado = e.estado;
  });

  return (
    <div className="flex">
      <Sidebar rol="docente" nombre={perfil.nombre_completo} />
      <main className="flex-1 p-8 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--a360-azul-oscuro)" }}>Exámenes tipo ICFES</h1>
          <p className="text-gray-500 text-sm mt-1">
            La IA genera un examen de mínimo 20 preguntas (textos continuos,
            discontinuos y mixtos), guardadas en tu banco de preguntas
            reutilizable. Como en el Generador Pedagógico, nada queda listo
            hasta que lo apruebes. Al aprobar se crean las versiones B y C
            con las preguntas en otro orden, para imprimir.
          </p>
        </div>

        <ExamenGenerador asignaciones={asignaciones} />

        <div>
          <p className="text-sm font-semibold mb-2" style={{ color: "var(--a360-azul-oscuro)" }}>Examen de inglés (formato Saber 11°)</p>
          <p className="text-gray-500 text-sm mb-3">
            Estructura oficial ICFES de 7 partes (45 preguntas), alineada al Marco Común
            Europeo de Referencia (MCER, niveles Pre A1 a B1) — no el generador genérico de arriba.
          </p>
          <ExamenInglesGenerador asignaciones={asignaciones} />
        </div>

        {familias.size > 0 && (
          <div>
            <p className="text-sm font-semibold mb-2" style={{ color: "var(--a360-azul-oscuro)" }}>Tus exámenes</p>
            <div className="bg-white border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr><th className="p-3">Clase</th><th className="p-3">Tema</th><th className="p-3">Estado</th><th className="p-3">Imprimir</th></tr>
                </thead>
                <tbody>
                  {[...familias.values()].map((f, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-3">{f.clase}</td>
                      <td className="p-3">{f.tema}</td>
                      <td className="p-3">{f.estado === "aprobado" ? "Aprobado" : "Pendiente de aprobación"}</td>
                      <td className="p-3">
                        {f.estado === "aprobado" ? (
                          f.tipo === "ingles_saber11" ? (
                            <div className="flex gap-2 items-center">
                              <Link href={`/dashboard/examenes/imprimir-ingles/${f.versiones["A"]}`} target="_blank" className="underline" style={{ color: "var(--a360-azul)" }}>
                                Ver examen
                              </Link>
                              <span className="text-gray-300">·</span>
                              <Link href={`/dashboard/examenes/imprimir-ingles/${f.versiones["A"]}/claves`} target="_blank" className="text-xs underline text-gray-500">
                                Clave
                              </Link>
                            </div>
                          ) : (
                          <div className="flex gap-2 flex-wrap items-center">
                            {["A", "B", "C"].map((letra) => f.versiones[letra] && (
                              <Link key={letra} href={`/dashboard/examenes/imprimir/${f.versiones[letra]}`} target="_blank" className="underline" style={{ color: "var(--a360-azul)" }}>
                                {letra}
                              </Link>
                            ))}
                            {f.versiones["A"] && (
                              <>
                                <span className="text-gray-300">·</span>
                                <Link href={`/dashboard/examenes/imprimir/${f.versiones["A"]}/claves`} target="_blank" className="text-xs underline text-gray-500">
                                  Clave
                                </Link>
                                <Link href={`/dashboard/examenes/imprimir/${f.versiones["A"]}/hoja-respuestas`} target="_blank" className="text-xs underline text-gray-500">
                                  Hoja de respuestas
                                </Link>
                              </>
                            )}
                          </div>
                          )
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
