"use client";
export default function BotonImprimir() {
  return (
    <button
      onClick={() => window.print()}
      className="a360-gradiente text-white text-sm font-semibold rounded-lg px-5 py-2 print:hidden"
    >
      Imprimir / Guardar como PDF
    </button>
  );
}
