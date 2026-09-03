"use client";

import { useRef, useState, useEffect, useCallback } from "react";

type Etapa = "elegir" | "camara" | "recorte";

// Componente real de foto de perfil (sección 7):
// - Opción 1: subir desde galería.
// - Opción 2: tomar selfie con la cámara.
// - Vista previa, recorte (pan + zoom sobre un lienzo cuadrado), repetir, confirmar.
// Al confirmar, devuelve un Blob JPEG ya recortado vía onFotoLista.
export default function FotoPerfil({
  onFotoLista,
}: {
  onFotoLista: (blob: Blob, previewUrl: string) => void;
}) {
  const [etapa, setEtapa] = useState<Etapa>("elegir");
  const [imagenOriginal, setImagenOriginal] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [arrastrando, setArrastrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ultimoPuntero = useRef({ x: 0, y: 0 });

  const LADO = 300;

  const detenerCamara = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => detenerCamara(), [detenerCamara]);

  async function abrirCamara() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      streamRef.current = stream;
      setEtapa("camara");
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch {
      setError("No pudimos acceder a la cámara. Verifica los permisos del navegador.");
    }
  }

  function tomarSelfie() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    cargarImagenDesdeDataUrl(canvas.toDataURL("image/jpeg", 0.92));
    detenerCamara();
  }

  function onArchivoSeleccionado(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => cargarImagenDesdeDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  function cargarImagenDesdeDataUrl(dataUrl: string) {
    const img = new Image();
    img.onload = () => {
      setImagenOriginal(img);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setEtapa("recorte");
    };
    img.src = dataUrl;
  }

  // Redibuja el lienzo de recorte cada vez que cambia zoom/offset/imagen.
  useEffect(() => {
    if (etapa !== "recorte" || !imagenOriginal || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d")!;
    ctx.clearRect(0, 0, LADO, LADO);
    const escalaBase = Math.max(LADO / imagenOriginal.width, LADO / imagenOriginal.height);
    const escala = escalaBase * zoom;
    const w = imagenOriginal.width * escala;
    const h = imagenOriginal.height * escala;
    const x = (LADO - w) / 2 + offset.x;
    const y = (LADO - h) / 2 + offset.y;
    ctx.drawImage(imagenOriginal, x, y, w, h);
  }, [etapa, imagenOriginal, zoom, offset]);

  function iniciarArrastre(x: number, y: number) {
    setArrastrando(true);
    ultimoPuntero.current = { x, y };
  }
  function moverArrastre(x: number, y: number) {
    if (!arrastrando) return;
    const dx = x - ultimoPuntero.current.x;
    const dy = y - ultimoPuntero.current.y;
    ultimoPuntero.current = { x, y };
    setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
  }

  function repetirFoto() {
    setImagenOriginal(null);
    setEtapa("elegir");
  }

  function confirmarFoto() {
    canvasRef.current?.toBlob(
      (blob) => {
        if (blob) onFotoLista(blob, URL.createObjectURL(blob));
      },
      "image/jpeg",
      0.9
    );
  }

  return (
    <div className="border rounded-xl p-4 flex flex-col items-center gap-3">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {etapa === "elegir" && (
        <div className="flex flex-col items-center gap-3 w-full">
          <div
            className="w-28 h-28 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs text-center"
          >
            Sin foto
          </div>
          <div className="flex gap-2 w-full">
            <label className="flex-1 text-center cursor-pointer text-sm font-medium border rounded-lg py-2 hover:bg-gray-50">
              Subir desde galería
              <input type="file" accept="image/*" className="hidden" onChange={onArchivoSeleccionado} />
            </label>
            <button
              type="button"
              onClick={abrirCamara}
              className="flex-1 text-sm font-medium border rounded-lg py-2 hover:bg-gray-50"
            >
              Tomar selfie
            </button>
          </div>
        </div>
      )}

      {etapa === "camara" && (
        <div className="flex flex-col items-center gap-3">
          <video ref={videoRef} autoPlay playsInline muted className="w-72 h-72 object-cover rounded-xl bg-black" />
          <div className="flex gap-2">
            <button type="button" onClick={() => { detenerCamara(); setEtapa("elegir"); }} className="text-sm border rounded-lg px-4 py-2">
              Cancelar
            </button>
            <button type="button" onClick={tomarSelfie} className="a360-gradiente text-white text-sm rounded-lg px-4 py-2">
              Capturar
            </button>
          </div>
        </div>
      )}

      {etapa === "recorte" && (
        <div className="flex flex-col items-center gap-3 w-full">
          <canvas
            ref={canvasRef}
            width={LADO}
            height={LADO}
            className="rounded-full cursor-move touch-none border"
            onMouseDown={(e) => iniciarArrastre(e.clientX, e.clientY)}
            onMouseMove={(e) => moverArrastre(e.clientX, e.clientY)}
            onMouseUp={() => setArrastrando(false)}
            onMouseLeave={() => setArrastrando(false)}
            onTouchStart={(e) => iniciarArrastre(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchMove={(e) => moverArrastre(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchEnd={() => setArrastrando(false)}
          />
          <label className="w-full text-xs text-gray-500 flex items-center gap-2">
            Zoom
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1"
            />
          </label>
          <p className="text-xs text-gray-400">Arrastra la foto para ajustar el encuadre.</p>
          <div className="flex gap-2 w-full">
            <button type="button" onClick={repetirFoto} className="flex-1 text-sm border rounded-lg py-2">
              Repetir foto
            </button>
            <button type="button" onClick={confirmarFoto} className="flex-1 a360-gradiente text-white text-sm rounded-lg py-2">
              Confirmar foto
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
