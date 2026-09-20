import { redirect, notFound } from "next/navigation";
import Image from "next/image";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { puedeVerRecurso } from "@/lib/autorizacion";
import BotonImprimir from "@/app/components/BotonImprimir";

const ETIQUETA_TIPO: Record<string, string> = { continuo: "Texto continuo", discontinuo: "Texto discontinuo", mixto: "Texto mixto" };

export default async function ImprimirExamen({ params }: { params: Promise<{ id: string }> }) {
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

  const { data: vinculos } = await supabase
    .from("examen_preguntas")
    .select("orden, preguntas(tipo_texto, contexto, enunciado, opciones, imagen_url)")
    .eq("examen_id", id)
    .order("orden");

  // Las imágenes se firman UNA sola vez (no por estudiante) — se comparten
  // en todas las copias personalizadas del examen.
  const items = await Promise.all((vinculos ?? []).map(async (v: any) => {
    const p = v.preguntas;
    let imagenFirmada: string | null = null;
    if (p.imagen_url) {
      const { data } = await supabase.storage.from("documentos").createSignedUrl(p.imagen_url, 60 * 10);
      imagenFirmada = data?.signedUrl ?? null;
    }
    return { ...p, imagenFirmada };
  }));

  const inst: any = examen.instituciones;
  const asig: any = examen.asignaciones_docente;
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
          Este grupo todavía no tiene estudiantes registrados. Pide al rector que cargue el listado
          de estudiantes (nombre completo y número de documento) en Estudiantes antes de imprimir el examen.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white overflow-x-hidden">
      <div className="flex justify-end p-4 print:hidden"><BotonImprimir /></div>

      {estudiantes.map((est, idxEst) => (
        <div
          key={est.id}
          className={`min-h-screen p-10 max-w-3xl mx-auto ${idxEst < estudiantes.length - 1 ? "break-after-page" : ""}`}
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

          <h1 className="text-xl font-bold text-center mb-1" style={{ color: "var(--a360-azul-oscuro)" }}>Examen: {examen.tema}</h1>
          <p className="text-center text-sm text-gray-500 mb-6">
            {asig?.areas?.nombre} / {asig?.asignaturas?.nombre} — {asig?.grados?.nombre} {asig?.grupos?.nombre}
          </p>

          <div className="grid grid-cols-2 gap-3 text-sm mb-8 border rounded-lg p-4">
            <p>Estudiante: <span className="font-semibold">{est.nombre_completo}</span></p>
            <p>Documento: <span className="font-semibold">{est.numero_documento ?? "—"}</span></p>
            <p>Grado y grupo: <span className="font-semibold">{asig?.grados?.nombre} {asig?.grupos?.nombre}</span></p>
            <p>Docente: <span className="font-semibold">{nombreDocente}</span></p>
            <p>Fecha: <span className="inline-block border-b border-gray-400 w-40">&nbsp;</span></p>
          </div>

          <div className="flex flex-col gap-6">
            {items.map((p: any, idx: number) => (
              <div key={idx} className="break-inside-avoid">
                <p className="text-[10px] uppercase font-semibold text-gray-400 mb-1">{ETIQUETA_TIPO[p.tipo_texto]}</p>
                <p className="text-xs text-gray-700 mb-2 whitespace-pre-line break-words [overflow-wrap:anywhere]">{p.contexto}</p>
                {p.imagenFirmada && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imagenFirmada} alt="Tabla o gráfico" className="max-w-sm mb-2 border rounded" />
                )}
                <p className="text-sm font-semibold mb-1">{idx + 1}. {p.enunciado}</p>
                <ul className="text-sm space-y-0.5 ml-4">
                  {(["A", "B", "C", "D"] as const).map((op) => <li key={op}>{op}. {p.opciones[op]}</li>)}
                </ul>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400 text-center mt-10">Elaborado con AULA360 — Sistema Inteligente de Gestión y Evaluación Educativa.</p>
        </div>
      ))}
    </div>
  );
}
