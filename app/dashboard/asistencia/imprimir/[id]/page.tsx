import { redirect, notFound } from "next/navigation";
import Image from "next/image";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import BotonImprimir from "@/app/components/BotonImprimir";

const ETIQUETA_ESTADO: Record<string, string> = {
  presente: "Presente", ausente: "Ausente", excusa: "Excusa", retardo: "Retardo",
};

export default async function ImprimirAsistencia({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: attendance } = await supabase
    .from("attendance")
    .select(`
      id, fecha,
      instituciones(nombre, ciudad, logo_url),
      perfiles(nombre_completo),
      asignaciones_docente(grados(nombre), grupos(nombre), areas(nombre), asignaturas(nombre))
    `)
    .eq("id", id)
    .single();

  if (!attendance) notFound();

  const { data: detalle } = await supabase
    .from("attendance_estudiante")
    .select("estado, observaciones, estudiantes(nombre_completo, numero_documento)")
    .eq("attendance_id", id);

  const inst: any = attendance.instituciones;
  const docente: any = attendance.perfiles;
  const asig: any = attendance.asignaciones_docente;

  return (
    <div className="min-h-screen bg-white p-10 max-w-3xl mx-auto">
      <div className="flex justify-end mb-4">
        <BotonImprimir />
      </div>

      <header className="flex items-center gap-4 border-b-2 pb-4 mb-6" style={{ borderColor: "var(--a360-azul)" }}>
        <Image src={inst?.logo_url || "/logo.png"} alt="Logo institucional" width={64} height={64} />
        <div>
          <p className="font-bold text-lg" style={{ color: "var(--a360-azul-oscuro)" }}>{inst?.nombre ?? "Institución"}</p>
          <p className="text-sm text-gray-500">{inst?.ciudad}</p>
        </div>
      </header>

      <h1 className="text-xl font-bold text-center mb-4" style={{ color: "var(--a360-azul-oscuro)" }}>Registro de Asistencia</h1>

      <div className="grid grid-cols-2 gap-2 text-sm mb-6">
        <p><span className="text-gray-500">Docente:</span> {docente?.nombre_completo}</p>
        <p><span className="text-gray-500">Fecha:</span> {attendance.fecha}</p>
        <p><span className="text-gray-500">Grado:</span> {asig?.grados?.nombre}</p>
        <p><span className="text-gray-500">Grupo:</span> {asig?.grupos?.nombre}</p>
        <p><span className="text-gray-500">Área:</span> {asig?.areas?.nombre}</p>
        <p><span className="text-gray-500">Asignatura:</span> {asig?.asignaturas?.nombre}</p>
      </div>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2" style={{ borderColor: "var(--a360-azul)" }}>
            <th className="text-left py-2">#</th>
            <th className="text-left py-2">Estudiante</th>
            <th className="text-left py-2">Documento</th>
            <th className="text-left py-2">Estado</th>
            <th className="text-left py-2">Observación</th>
          </tr>
        </thead>
        <tbody>
          {(detalle ?? []).map((d: any, idx: number) => (
            <tr key={idx} className="border-b">
              <td className="py-1.5">{idx + 1}</td>
              <td className="py-1.5">{d.estudiantes?.nombre_completo}</td>
              <td className="py-1.5">{d.estudiantes?.numero_documento ?? "—"}</td>
              <td className="py-1.5">{ETIQUETA_ESTADO[d.estado] ?? d.estado}</td>
              <td className="py-1.5">{d.observaciones ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-16 flex justify-between text-sm">
        <div className="border-t w-48 pt-1 text-center">Firma del docente</div>
        <div className="border-t w-48 pt-1 text-center">Firma del rector / coordinador</div>
      </div>

      <p className="text-xs text-gray-400 text-center mt-10">
        Elaborado con AULA360 — Sistema Inteligente de Gestión y Evaluación Educativa.
      </p>
    </div>
  );
}
