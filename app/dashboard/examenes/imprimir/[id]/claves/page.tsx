import { redirect, notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { puedeVerRecurso } from "@/lib/autorizacion";
import BotonImprimir from "@/app/components/BotonImprimir";

export default async function ClavesExamen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: examen } = await supabase.from("examenes").select("id, tema, version, estado, docente_id, institucion_id").eq("id", id).single();
  if (!examen || examen.estado !== "aprobado") notFound();
  if (!(await puedeVerRecurso(supabase, user.id, examen))) notFound();

  const { data: vinculos } = await supabase
    .from("examen_preguntas")
    .select("orden, preguntas(competencia, respuesta_correcta, explicacion)")
    .eq("examen_id", id)
    .order("orden");

  return (
    <div className="min-h-screen bg-white p-10 max-w-2xl mx-auto">
      <div className="flex justify-end mb-4"><BotonImprimir /></div>
      <h1 className="text-xl font-bold mb-1" style={{ color: "var(--a360-azul-oscuro)" }}>Hoja de respuestas — {examen.tema}</h1>
      <p className="text-sm text-gray-500 mb-6">Versión {examen.version} · Uso exclusivo del docente, no entregar al estudiante.</p>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2" style={{ borderColor: "var(--a360-azul)" }}>
            <th className="text-left py-2">#</th><th className="text-left py-2">Correcta</th><th className="text-left py-2">Competencia</th>
          </tr>
        </thead>
        <tbody>
          {(vinculos ?? []).map((v: any, idx: number) => (
            <tr key={idx} className="border-b">
              <td className="py-1.5">{idx + 1}</td>
              <td className="py-1.5 font-semibold" style={{ color: "var(--a360-verde)" }}>{v.preguntas.respuesta_correcta}</td>
              <td className="py-1.5">{v.preguntas.competencia}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-8 flex flex-col gap-3">
        <p className="text-sm font-semibold" style={{ color: "var(--a360-azul-oscuro)" }}>Justificaciones</p>
        {(vinculos ?? []).map((v: any, idx: number) => (
          <p key={idx} className="text-xs text-gray-600"><span className="font-semibold">{idx + 1}.</span> {v.preguntas.explicacion}</p>
        ))}
      </div>
    </div>
  );
}
