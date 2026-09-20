import { redirect, notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { puedeVerRecurso } from "@/lib/autorizacion";
import BotonImprimir from "@/app/components/BotonImprimir";
import { PARTES_INGLES_ICFES } from "@/lib/ai/ingles-compartido";

export default async function ClavesExamenIngles({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: examen } = await supabase.from("examenes").select("id, tema, estado, docente_id, institucion_id").eq("id", id).single();
  if (!examen || examen.estado !== "aprobado") notFound();
  if (!(await puedeVerRecurso(supabase, user.id, examen))) notFound();

  const { data: vinculos } = await supabase
    .from("examen_preguntas")
    .select("orden, preguntas(respuesta_correcta, explicacion)")
    .eq("examen_id", id)
    .order("orden");
  const preguntas = (vinculos ?? []).map((v: any) => v.preguntas);

  let cursor = 0;
  const partes = PARTES_INGLES_ICFES.map((spec) => {
    const inicio = cursor + 1;
    const slice = preguntas.slice(cursor, cursor + spec.cantidad);
    cursor += spec.cantidad;
    return { spec, preguntas: slice, inicio };
  });

  return (
    <div className="min-h-screen bg-white p-10 max-w-2xl mx-auto">
      <div className="flex justify-end mb-4"><BotonImprimir /></div>
      <h1 className="text-xl font-bold mb-1" style={{ color: "var(--a360-azul-oscuro)" }}>
        Clave de respuestas — Prueba de Inglés Saber 11.° ({examen.tema})
      </h1>
      <p className="text-sm text-gray-500 mb-6">Uso exclusivo del docente, no entregar al estudiante.</p>

      {partes.map(({ spec, preguntas: preguntasParte, inicio }) => (
        <div key={spec.numero} className="mb-6">
          <p className="text-sm font-bold mb-2" style={{ color: "var(--a360-azul)" }}>Parte {spec.numero} — {spec.titulo}</p>
          <table className="w-full text-sm border-collapse mb-2">
            <thead>
              <tr className="border-b"><th className="text-left py-1">#</th><th className="text-left py-1">Correcta</th></tr>
            </thead>
            <tbody>
              {preguntasParte.map((p: any, i: number) => (
                <tr key={i} className="border-b">
                  <td className="py-1">{inicio + i}</td>
                  <td className="py-1 font-semibold" style={{ color: "var(--a360-verde)" }}>{p.respuesta_correcta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
