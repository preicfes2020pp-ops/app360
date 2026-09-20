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

export default function Saber11Analisis({ resultados }: { resultados: FilaResultado[] }) {
  const anios = useMemo(
    () => Array.from(new Set(resultados.map((r) => r.anio))).sort((a, b) => a - b),
    [resultados]
  );

  const [desde, setDesde] = useState(anios[0] ?? new Date().getFullYear());
  const [hasta, setHasta] = useState(anios.at(-1) ?? new Date().getFullYear());

  const enRango = useMemo(
    () => resultados.filter((r) => r.anio >= desde && r.anio <= hasta),
    [resultados, desde, hasta]
  );

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
      const delAnio = resultados.filter((r) => r.anio === anio);
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

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white border rounded-xl p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-bold" style={{ color: "var(--a360-azul-oscuro)" }}>
              Análisis institucional
            </h2>
            <p className="text-sm text-gray-500">
              {enRango.length} resultado(s) en el rango seleccionado.
            </p>
          </div>
          <div className="flex items-end gap-3">
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
          </div>
        </div>
      </div>

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
