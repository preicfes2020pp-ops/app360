import { redirect, notFound } from "next/navigation";
import Image from "next/image";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { puedeVerRecurso } from "@/lib/autorizacion";
import BotonImprimir from "@/app/components/BotonImprimir";
import { PARTES_INGLES_ICFES } from "@/lib/ai/ingles-compartido";

export default async function ImprimirExamenIngles({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: examen } = await supabase
    .from("examenes")
    .select(`
      id, tema, estado, docente_id, institucion_id,
      instituciones(nombre, ciudad, logo_url),
      asignaciones_docente(grupo_id, grados(nombre), grupos(nombre), areas(nombre), asignaturas(nombre)),
      perfiles(nombre_completo)
    `)
    .eq("id", id).single();
  if (!examen || examen.estado !== "aprobado") notFound();
  if (!(await puedeVerRecurso(supabase, user.id, examen))) notFound();

  const { data: vinculos } = await supabase
    .from("examen_preguntas")
    .select("orden, preguntas(contexto, enunciado, opciones)")
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

  const asig: any = examen.asignaciones_docente;
  const inst: any = examen.instituciones;
  const nombreDocente = (examen as any).perfiles?.nombre_completo ?? "—";

  const { data: estudiantes } = await supabase
    .from("estudiantes")
    .select("id, nombre_completo, numero_documento")
    .eq("grupo_id", asig?.grupo_id)
    .order("nombre_completo");

  if (!estudiantes || estudiantes.length === 0) {
    return (
      <div className="min-h-screen bg-white p-10 max-w-3xl mx-auto">
        <p className="text-sm text-gray-500">
          Este grupo todavía no tiene estudiantes registrados. Cárgalos en "Estudiantes" antes de imprimir.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white overflow-x-hidden">
      <div className="flex justify-end p-4 print:hidden"><BotonImprimir /></div>

      {estudiantes.map((est, idxEst) => (
        <div key={est.id} className={`min-h-screen p-10 max-w-3xl mx-auto ${idxEst < estudiantes.length - 1 ? "break-after-page" : ""}`}>
          <header className="flex items-center gap-4 border-b-2 pb-4 mb-6" style={{ borderColor: "var(--a360-azul)" }}>
            <Image src={inst?.logo_url || "/logo.png"} alt="Logo institucional" width={64} height={64} />
            <div className="flex-1">
              <p className="font-bold text-lg" style={{ color: "var(--a360-azul-oscuro)" }}>{inst?.nombre ?? "Institución"}</p>
              <p className="text-sm text-gray-500">{inst?.ciudad}</p>
            </div>
          </header>

          <h1 className="text-xl font-bold text-center mb-1" style={{ color: "var(--a360-azul-oscuro)" }}>
            Prueba de Inglés — Saber 11.° ({examen.tema})
          </h1>
          <p className="text-center text-sm text-gray-500 mb-6">
            {asig?.grados?.nombre} {asig?.grupos?.nombre} — 45 preguntas, 7 partes
          </p>

          <div className="grid grid-cols-2 gap-3 text-sm mb-8 border rounded-lg p-4">
            <p>Estudiante: <span className="font-semibold">{est.nombre_completo}</span></p>
            <p>Documento: <span className="font-semibold">{est.numero_documento ?? "—"}</span></p>
            <p>Grado y grupo: <span className="font-semibold">{asig?.grados?.nombre} {asig?.grupos?.nombre}</span></p>
            <p>Docente: <span className="font-semibold">{nombreDocente}</span></p>
          </div>

          {partes.map(({ spec, preguntas: preguntasParte, inicio }) => (
            <section key={spec.numero} className="mb-8 break-inside-avoid-page">
              <h2 className="text-sm font-bold mb-1" style={{ color: "var(--a360-azul)" }}>PART {spec.numero}: {spec.titulo}</h2>
              <p className="text-xs text-gray-500 mb-2">{spec.instruccionEstudiante}</p>

              {spec.tieneTextoBase && preguntasParte[0] && (
                <p className="text-xs text-gray-800 mb-3 whitespace-pre-line break-words [overflow-wrap:anywhere] border-l-2 pl-2">{preguntasParte[0].contexto}</p>
              )}
              {spec.numero === 2 && preguntasParte[0] && (
                <div className="text-xs mb-3 grid grid-cols-4 gap-1 border rounded p-2">
                  {Object.entries(preguntasParte[0].opciones).map(([letra, palabra]) => (
                    <span key={letra}>{letra}. {palabra as string}</span>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-3">
                {preguntasParte.map((p: any, i: number) => (
                  <div key={i} className="text-sm break-inside-avoid">
                    <p className="font-medium">{inicio + i}.
                      {" "}{spec.numero === 4 || spec.numero === 7 ? `(espacio ${i + 1})` : p.enunciado}
                    </p>
                    {spec.numero !== 2 && (
                      <ul className="ml-4 text-sm">
                        {Object.entries(p.opciones).map(([letra, texto]) => <li key={letra}>{letra}. {texto as string}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}

          <p className="text-xs text-gray-400 text-center mt-10">Elaborado con AULA360 — Sistema Inteligente de Gestión y Evaluación Educativa.</p>
        </div>
      ))}
    </div>
  );
}
