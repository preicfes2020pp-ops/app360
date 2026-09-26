"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export type FilaResultado = {
  anio: number;
  puntaje_global: number;
  lectura_critica_puntaje: number | null;
  matematicas_puntaje: number | null;
  sociales_ciudadanas_puntaje: number | null;
  ciencias_naturales_puntaje: number | null;
  ingles_puntaje: number | null;
  percentil_global_nacional: number | null;
  grupo_id: string | null;
  grupos: { nombre: string } | { nombre: string }[] | null;
};

const AREAS: { clave: keyof FilaResultado; etiqueta: string }[] = [
  { clave: "lectura_critica_puntaje", etiqueta: "Lectura Crítica" },
  { clave: "matematicas_puntaje", etiqueta: "Matemáticas" },
  { clave: "sociales_ciudadanas_puntaje", etiqueta: "Sociales y Ciudadanas" },
  { clave: "ciencias_naturales_puntaje", etiqueta: "Ciencias Naturales" },
  { clave: "ingles_puntaje", etiqueta: "Inglés" },
];

function promedio(numeros: number[]): number | null {
  if (numeros.length === 0) return null;
  return Math.round((numeros.reduce((a, b) => a + b, 0) / numeros.length) * 10) / 10;
}

function nombreGrupo(r: FilaResultado): string {
  const g = r.grupos;
  if (!g) return "Sin grupo asignado";
  return Array.isArray(g) ? g[0]?.nombre ?? "Sin grupo asignado" : g.nombre;
}

function descargarCsv(nombreArchivo: string, filas: (string | number)[][]) {
  const contenido = filas
    .map((fila) =>
      fila
        .map((valor) => {
          const texto = String(valor);
          // Escapa comas y comillas para que Excel lo lea bien.
          return /[",\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
        })
        .join(",")
    )
    .join("\n");
  // BOM para que Excel detecte tildes y "ñ" correctamente.
  const blob = new Blob(["\uFEFF" + contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.click();
  URL.revokeObjectURL(url);
}

export default function Saber11Analisis({ resultados }: { resultados: FilaResultado[] }) {
  const anioActual = new Date().getFullYear();

  // El desplegable siempre muestra los últimos 10 años hasta el actual
  // (igual que el selector del reporte agregado), aunque todavía no haya
  // resultados cargados para todos ellos — así el rector ve de una vez
  // el rango completo disponible, no solo los años con datos.
  const anios = useMemo(
    () => Array.from({ length: 10 }, (_, i) => anioActual - 9 + i),
    [anioActual]
  );

  const aniosConDatos = useMemo(
    () => Array.from(new Set(resultados.map((r) => r.anio))).sort((a, b) => a - b),
    [resultados]
  );

  const [desde, setDesde] = useState(aniosConDatos[0] ?? anioActual);
  const [hasta, setHasta] = useState(aniosConDatos.at(-1) ?? anioActual);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<string>("__todos__");

  const enRangoAnio = useMemo(
    () => resultados.filter((r) => r.anio >= desde && r.anio <= hasta),
    [resultados, desde, hasta]
  );

  const gruposDisponibles = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const r of enRangoAnio) {
      const clave = r.grupo_id ?? "__sin_grupo__";
      if (!mapa.has(clave)) mapa.set(clave, nombreGrupo(r));
    }
    return Array.from(mapa.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [enRangoAnio]);

  const enRango = useMemo(() => {
    if (grupoSeleccionado === "__todos__") return enRangoAnio;
    return enRangoAnio.filter((r) => (r.grupo_id ?? "__sin_grupo__") === grupoSeleccionado);
  }, [enRangoAnio, grupoSeleccionado]);

  if (resultados.length === 0) {
    return (
      <div className="bg-white border rounded-xl p-6 text-sm text-gray-500">
        Todavía no hay resultados individuales cargados. Sube los PDF arriba para ver el análisis
        institucional aquí.
      </div>
    );
  }

  const promedioGlobal = promedio(enRango.map((r) => r.puntaje_global));
  const promedioPercentilNacional = promedio(
    enRango.map((r) => r.percentil_global_nacional).filter((n): n is number => n !== null)
  );

  const promediosPorArea = AREAS.map(({ clave, etiqueta }) => ({
    area: etiqueta,
    promedio: promedio(enRango.map((r) => r[clave] as number | null).filter((n): n is number => n !== null)),
  }));

  const evolucionPorAnio = anios
    .filter((a) => a >= desde && a <= hasta)
    .map((anio) => {
      const delAnio = enRango.filter((r) => r.anio === anio);
      return {
        anio: String(anio),
        promedioGlobal: promedio(delAnio.map((r) => r.puntaje_global)),
        estudiantes: delAnio.length,
      };
    });

  const rangosPuntaje = [
    { rango: "0-200", min: 0, max: 200 },
    { rango: "201-300", min: 201, max: 300 },
    { rango: "301-400", min: 301, max: 400 },
    { rango: "401-500", min: 401, max: 500 },
  ].map(({ rango, min, max }) => ({
    rango,
    estudiantes: enRango.filter((r) => r.puntaje_global >= min && r.puntaje_global <= max).length,
  }));

  // Comparativo por grupo — solo tiene sentido cuando se está viendo
  // "Todos los grupos" y hay más de uno con datos en el rango elegido.
  const comparativoPorGrupo = gruposDisponibles
    .map(([id, nombre]) => {
      const delGrupo = enRangoAnio.filter((r) => (r.grupo_id ?? "__sin_grupo__") === id);
      return {
        grupo: nombre,
        promedioGlobal: promedio(delGrupo.map((r) => r.puntaje_global)),
        estudiantes: delGrupo.length,
      };
    })
    .sort((a, b) => a.grupo.localeCompare(b.grupo));

  const tituloSeccion =
    grupoSeleccionado === "__todos__"
      ? "Análisis global del colegio (todos los grupos)"
      : `Análisis del grupo ${gruposDisponibles.find(([id]) => id === grupoSeleccionado)?.[1] ?? ""}`;

  function descargarExcel() {
    const filas: (string | number)[][] = [
      [tituloSeccion],
      [`Años: ${desde} a ${hasta}`, `Resultados incluidos: ${enRango.length}`],
      [],
      ["Resumen general"],
      ["Puntaje global promedio", promedioGlobal ?? ""],
      ["Percentil nacional promedio", promedioPercentilNacional ?? ""],
      [],
      ["Promedio por área", "Puntaje (0-100)"],
      ...promediosPorArea.map((a) => [a.area, a.promedio ?? ""]),
      [],
      ["Distribución de puntaje global", "Cantidad de estudiantes"],
      ...rangosPuntaje.map((r) => [r.rango, r.estudiantes]),
      [],
      ["Evolución por año", "Puntaje global promedio", "Estudiantes"],
      ...evolucionPorAnio.map((e) => [e.anio, e.promedioGlobal ?? "", e.estudiantes]),
    ];

    if (grupoSeleccionado === "__todos__" && comparativoPorGrupo.length > 0) {
      filas.push([], ["Comparativo por grupo", "Puntaje global promedio", "Estudiantes"]);
      filas.push(...comparativoPorGrupo.map((g) => [g.grupo, g.promedioGlobal ?? "", g.estudiantes]));
    }

    descargarCsv(`analisis-saber11-${grupoSeleccionado === "__todos__" ? "colegio" : grupoSeleccionado}.csv`, filas);
  }

  return (
    <div className="flex flex-col gap-6" id="reporte-saber11">
      <div className="bg-white border rounded-xl p-6 no-imprimir">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-bold" style={{ color: "var(--a360-azul-oscuro)" }}>
              {tituloSeccion}
            </h2>
            <p className="text-sm text-gray-500">
              {enRango.length} resultado(s) en la selección actual.
            </p>
          </div>
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Grupo</label>
              <select
                value={grupoSeleccionado}
                onChange={(e) => setGrupoSeleccionado(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
              >
                <option value="__todos__">Todos los grupos (colegio completo)</option>
                {gruposDisponibles.map(([id, nombre]) => (
                  <option key={id} value={id}>
                    {nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Desde</label>
              <select
                value={desde}
                onChange={(e) => setDesde(parseInt(e.target.value, 10))}
                className="border rounded-lg px-3 py-2 text-sm"
              >
                {anios.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Hasta</label>
              <select
                value={hasta}
                onChange={(e) => setHasta(parseInt(e.target.value, 10))}
                className="border rounded-lg px-3 py-2 text-sm"
              >
                {anios.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={descargarExcel}
                className="rounded-lg px-4 py-2 text-sm font-medium border"
                style={{ borderColor: "var(--a360-azul-oscuro)", color: "var(--a360-azul-oscuro)" }}
              >
                Descargar en Excel
              </button>
              <button
                onClick={() => window.print()}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white"
                style={{ backgroundColor: "var(--a360-azul-oscuro)" }}
              >
                Descargar en PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      <h1 className="hidden print:block text-xl font-bold" style={{ color: "var(--a360-azul-oscuro)" }}>
        {tituloSeccion} — {desde === hasta ? desde : `${desde} a ${hasta}`}
      </h1>

      {grupoSeleccionado === "__todos__" && comparativoPorGrupo.length > 1 && (
        <div className="bg-white border rounded-xl p-6">
          <h3 className="font-medium mb-4 text-sm text-gray-600">
            Comparativo de puntaje global promedio por grupo
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={comparativoPorGrupo}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="grupo" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 500]} />
              <Tooltip />
              <Bar dataKey="promedioGlobal" name="Puntaje global promedio" fill="#4f8ef7" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-xl p-6 flex flex-col items-center justify-center">
          <p className="text-sm text-gray-500 mb-1">Puntaje global promedio</p>
          <p className="text-4xl font-bold" style={{ color: "var(--a360-azul-oscuro)" }}>
            {promedioGlobal ?? "—"}
            <span className="text-lg text-gray-400">/500</span>
          </p>
        </div>
        <div className="bg-white border rounded-xl p-6 flex flex-col items-center justify-center">
          <p className="text-sm text-gray-500 mb-1">Percentil nacional promedio</p>
          <p className="text-4xl font-bold" style={{ color: "var(--a360-azul-oscuro)" }}>
            {promedioPercentilNacional ?? "—"}
            <span className="text-lg text-gray-400">%</span>
          </p>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-6">
        <h3 className="font-medium mb-4 text-sm text-gray-600">Promedio por área</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={promediosPorArea}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="area" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Bar dataKey="promedio" fill="var(--a360-azul-oscuro, #1e3a5f)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white border rounded-xl p-6">
        <h3 className="font-medium mb-4 text-sm text-gray-600">
          Distribución de estudiantes por puntaje global
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={rangosPuntaje}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="rango" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="estudiantes" fill="#4f8ef7" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {evolucionPorAnio.length > 1 && (
        <div className="bg-white border rounded-xl p-6">
          <h3 className="font-medium mb-4 text-sm text-gray-600">
            Evolución del puntaje global promedio por año
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={evolucionPorAnio}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="anio" />
              <YAxis domain={[0, 500]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="promedioGlobal"
                name="Puntaje global promedio"
                stroke="var(--a360-azul-oscuro, #1e3a5f)"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
