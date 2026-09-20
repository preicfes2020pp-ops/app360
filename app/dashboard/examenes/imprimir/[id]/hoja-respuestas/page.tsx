import { redirect, notFound } from "next/navigation";
import Image from "next/image";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { puedeVerRecurso } from "@/lib/autorizacion";
import BotonImprimir from "@/app/components/BotonImprimir";

export default async function HojaRespuestasEstudiante({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: examen } = await supabase
    .from("examenes")
    .select(`
      id, tema, version, estado, docente_id, institucion_id,
      instituciones(nombre, ciudad, logo_url),
      asignaciones_docente(grupo_id, grados(nombre), grupos(nombre), areas(nombre), asignaturas(nombre)),
      perfiles(nombre_completo)
    `)
    .eq("id", id).single();
  if (!examen || examen.estado !== "aprobado") notFound();
  if (!(await puedeVerRecurso(supabase, user.id, examen))) notFound();

  const { count: totalPreguntas } = await supabase
    .from("examen_preguntas")
    .select("id", { count: "exact", head: true })
    .eq("examen_id", id);

  const asig: any = examen.asignaciones_docente;
  const { data: estudiantes } = await supabase
    .from("estudiantes")
    .select("id, nombre_completo, numero_documento")
    .eq("grupo_id", asig?.grupo_id)
    .order("nombre_completo");

  const inst: any = examen.instituciones;
  const numeros = Array.from({ length: totalPreguntas ?? 0 }, (_, i) => i + 1);
  const nombreDocente = (examen as any).perfiles?.nombre_completo ?? "—";

  if (!estudiantes || estudiantes.length === 0) {
    return (
      <div className="min-h-screen bg-white p-10 max-w-3xl mx-auto">
        <p className="text-sm text-gray-500">
          Este grupo todavía no tiene estudiantes registrados. Pide al rector que cargue el listado
          de estudiantes (nombre completo y número de documento) en Estudiantes antes de imprimir esta hoja.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white overflow-x-hidden">
      <div className="flex justify-end p-4 print:hidden"><BotonImprimir /></div>

      {estudiantes.map((est, idx) => (
        <div
          key={est.id}
          className={`min-h-screen p-10 max-w-3xl mx-auto ${idx < estudiantes.length - 1 ? "break-after-page" : ""}`}
        >
          <header className="flex items-center gap-4 border-b-2 pb-4 mb-6" style={{ borderColor: "var(--a360-azul)" }}>
            <Image src={inst?.logo_url || "/logo.png"} alt="Logo institucional" width={64} height={64} />
            <div className="flex-1">
              <p className="font-bold text-lg" style={{ color: "var(--a360-azul-oscuro)" }}>{inst?.nombre ?? "Institución"}</p>
              <p className="text-sm text-gray-500">{inst?.ciudad}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Versión</p>
              <p className="text-2xl font-bold" style={{ color: "var(--a360-verde)" }}>{examen.version}</p>
            </div>
          </header>

          <h1 className="text-xl font-bold text-center mb-1" style={{ color: "var(--a360-azul-oscuro)" }}>Hoja de respuestas</h1>
          <p className="text-center text-sm text-gray-500 mb-6">
            {examen.tema} — {asig?.areas?.nombre} / {asig?.asignaturas?.nombre} — {asig?.grados?.nombre} {asig?.grupos?.nombre}
          </p>
          <p className="text-center text-xs text-gray-400 mb-6">
            Marca con lápiz HB2, rellenando completamente el óvalo de tu respuesta. Una sola marca por pregunta.
          </p>

          <div className="grid grid-cols-2 gap-3 text-sm mb-8 border rounded-lg p-4">
            <p>Estudiante: <span className="font-semibold">{est.nombre_completo}</span></p>
            <p>Documento: <span className="font-semibold">{est.numero_documento ?? "—"}</span></p>
            <p>Grado y grupo: <span className="font-semibold">{asig?.grados?.nombre} {asig?.grupos?.nombre}</span></p>
            <p>Docente: <span className="font-semibold">{nombreDocente}</span></p>
            <p>Fecha: <span className="inline-block border-b border-gray-400 w-40">&nbsp;</span></p>
          </div>

          <div className="grid grid-cols-2 gap-x-10 gap-y-3">
            {numeros.map((n) => (
              <div key={n} className="flex items-center gap-3 text-sm break-inside-avoid">
                <span className="w-6 text-right font-semibold text-gray-600">{n}.</span>
                {(["A", "B", "C", "D"] as const).map((letra) => (
                  <span key={letra} className="flex items-center gap-1">
                    <span className="inline-block w-4 h-4 rounded-full border-2 border-gray-500" />
                    <span className="text-xs text-gray-500">{letra}</span>
                  </span>
                ))}
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400 text-center mt-10">
            Elaborado con AULA360 — Sistema Inteligente de Gestión y Evaluación Educativa.
          </p>
        </div>
      ))}
    </div>
  );
}
