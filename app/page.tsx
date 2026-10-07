import Image from "next/image";
import Link from "next/link";

export default function PaginaInicio() {
  return (
    <main style={{ background: "var(--a360-fondo)" }}>
      {/* NAV */}
      <header className="sticky top-0 z-20 bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="AULA360" width={40} height={40} />
            <div className="leading-tight">
              <div className="font-extrabold text-lg" style={{ color: "var(--a360-azul-oscuro)" }}>AULA360</div>
              <div className="text-[10px] text-gray-500 hidden sm:block">SISTEMA INTELIGENTE DE GESTIÓN Y EVALUACIÓN EDUCATIVA</div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium" style={{ color: "var(--a360-texto)" }}>
            <a href="#inicio">Inicio</a>
            <a href="#nosotros">Nosotros</a>
            <a href="#caracteristicas">Características</a>
            <a href="#planes">Planes</a>
            <a href="#contacto">Contacto</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:inline-block text-sm font-semibold rounded-full px-5 py-2 border" style={{ color: "var(--a360-azul)", borderColor: "var(--a360-azul)" }}>
              Iniciar sesión
            </Link>
            <Link href="/registro" className="a360-gradiente text-white text-sm font-semibold rounded-full px-5 py-2">
              Registrarse
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section id="inicio" className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <Image src="/logo.png" alt="AULA360" width={72} height={72} className="mb-4" />
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight" style={{ color: "var(--a360-azul-oscuro)" }}>
              Tecnología que impulsa{" "}
              <span style={{ color: "var(--a360-verde)" }}>el aprendizaje</span>
            </h1>
            <p className="mt-4 text-gray-600 max-w-md">
              Una plataforma moderna, completa y fácil de usar, diseñada para la gestión académica y la evaluación educativa.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/registro" className="a360-gradiente text-white font-semibold rounded-full px-6 py-3">
                🚀 Comienza ahora
              </Link>
              <a href="#caracteristicas" className="font-semibold rounded-full px-6 py-3 border" style={{ color: "var(--a360-azul)", borderColor: "var(--a360-azul)" }}>
                ▶ Ver características
              </a>
            </div>
          </div>

          <div className="relative rounded-3xl overflow-hidden min-h-[320px]">
            <Image src="/estudiantes-hero.jpg" alt="Estudiantes usando AULA360" fill style={{ objectFit: "cover" }} />
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(11,36,71,0) 40%, rgba(11,36,71,0.55) 100%)" }} />
            <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur rounded-xl px-4 py-2 text-sm font-semibold" style={{ color: "var(--a360-azul-oscuro)" }}>
              🎓 Educación sin límites
            </div>
          </div>
        </div>
      </section>

      {/* CARACTERISTICAS */}
      <section id="caracteristicas" className="bg-white py-14">
        <div className="max-w-7xl mx-auto px-6 grid sm:grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { color: "var(--a360-azul)", titulo: "Gestión Académica Integral", texto: "Administra estudiantes, docentes, grupos, asignaturas y más, en un solo lugar." },
            { color: "var(--a360-verde)", titulo: "Evaluación Inteligente", texto: "Crea, aplica y analiza pruebas con reportes detallados y en tiempo real." },
            { color: "var(--a360-dorado)", titulo: "Planeación Eficiente", texto: "Organiza el calendario académico, actividades y seguimiento de procesos." },
            { color: "var(--a360-azul-claro)", titulo: "Seguimiento Personalizado", texto: "Identifica fortalezas y áreas de mejora para cada estudiante." },
          ].map((f) => (
            <div key={f.titulo} className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl" style={{ background: f.color }}>★</div>
              <h3 className="font-bold" style={{ color: "var(--a360-azul-oscuro)" }}>{f.titulo}</h3>
              <p className="text-sm text-gray-500">{f.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TODO LO QUE NECESITAS */}
      <section id="nosotros" className="py-16" style={{ background: "var(--a360-fondo)" }}>
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-sm font-bold tracking-wide" style={{ color: "var(--a360-verde)" }}>PLATAFORMA, MUCHAS SOLUCIONES</p>
            <h2 className="text-3xl font-extrabold mt-2 mb-4" style={{ color: "var(--a360-azul-oscuro)" }}>
              Todo lo que necesitas en un solo sistema
            </h2>
            <p className="text-gray-600 mb-6">
              AULA360 integra tecnología, pedagogía y análisis de datos para transformar la educación y llevarla al siguiente nivel.
            </p>
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm font-semibold" style={{ color: "var(--a360-azul-oscuro)" }}>
              {["Seguro", "Confiable", "Fácil de usar", "En la nube"].map((t) => (
                <span key={t} className="flex items-center gap-2">
                  <span style={{ color: "var(--a360-verde)" }}>✓</span> {t}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <Image src="/logo.png" alt="" width={24} height={24} />
              <span className="font-bold text-sm" style={{ color: "var(--a360-azul-oscuro)" }}>AULA360</span>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-4 text-center text-xs">
              {[
                { n: "128", t: "Estudiantes", c: "var(--a360-azul)" },
                { n: "12", t: "Evaluaciones", c: "var(--a360-verde)" },
                { n: "5", t: "Tareas", c: "var(--a360-dorado)" },
                { n: "82%", t: "Promedio", c: "var(--a360-azul-claro)" },
              ].map((s) => (
                <div key={s.t} className="rounded-xl p-3" style={{ background: s.c, color: "white" }}>
                  <div className="font-extrabold">{s.n}</div>
                  <div>{s.t}</div>
                </div>
              ))}
            </div>
            <div className="flex items-end gap-2 h-24">
              {[40, 70, 55, 90, 60, 75].map((h, i) => (
                <div key={i} className="flex-1 rounded-t-md a360-gradiente" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* MAS QUE UN SISTEMA */}
      <section id="planes" className="bg-white py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-extrabold mb-10" style={{ color: "var(--a360-azul-oscuro)" }}>
            Más que un sistema… una herramienta para el futuro
          </h2>
          <div className="grid sm:grid-cols-2 gap-8 text-left">
            {[
              { i: "🔒", t: "Datos seguros" },
              { i: "☁️", t: "Acceso desde cualquier lugar" },
              { i: "💻", t: "Compatible con todos los dispositivos" },
              { i: "🎧", t: "Soporte continuo" },
            ].map((b) => (
              <div key={b.t} className="flex items-center gap-3">
                <span className="text-2xl">{b.i}</span>
                <span className="font-semibold" style={{ color: "var(--a360-azul-oscuro)" }}>{b.t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contacto" className="a360-gradiente text-white py-10 text-center text-sm">
        <p className="font-bold text-lg mb-1">AULA360</p>
        <p className="opacity-90">Sistema Inteligente de Gestión y Evaluación Educativa</p>
        <p className="mt-4 opacity-75">© {new Date().getFullYear()} AULA360. Todos los derechos reservados.</p>
      </footer>
    </main>
  );
}
