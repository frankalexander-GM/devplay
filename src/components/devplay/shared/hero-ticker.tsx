'use client'

// ═══════════════════════════════════════════════════════════════
// CINTAS DE TELETIPO del hero 🎞️ — los juegos pasando como en las
// gacetas retro. Dos cintas: una con portadas+nombre (va a la izq.)
// y otra con eldato de cada juego (va a la der.). El marquee usa el
// CSS .ticker-track de globals.css (pausa al pasar el mouse).
// Truco del loop perfecto: el track contiene la MISMA secuencia 2x
// y la animación mueve translateX(0 → -50%).
// ═══════════════════════════════════════════════════════════════

import { Gamepad2 } from 'lucide-react'

export interface TickerGame {
  id: string
  title: string
  version?: string | null
  genre?: string | null
  coverImage?: string | null
  downloads?: number
}

function Seq({ games }: { games: TickerGame[] }) {
  return (
    <>
      {games.map((g, i) => (
        <span key={`${g.id}-${i}`} className="inline-flex items-center gap-2 mx-4 whitespace-nowrap">
          {g.coverImage ? (
            <img
              src={g.coverImage}
              alt=""
              className="h-6 w-9 object-cover rounded-[2px] border border-black/25 shadow-[1px_1px_0_rgba(0,0,0,0.3)]"
            />
          ) : (
            <Gamepad2 className="h-3.5 w-3.5 opacity-70" />
          )}
          <span className="font-bold text-[11px] tracking-wide">{g.title}</span>
          {g.version && <span className="text-[9px] opacity-60">v{g.version.replace(/^v/i, '')}</span>}
          <span className="text-[8px] opacity-50 select-none">◆</span>
        </span>
      ))}
    </>
  )
}

function SeqMeta({ games }: { games: TickerGame[] }) {
  return (
    <>
      {games.map((g, i) => (
        <span key={`${g.id}-m-${i}`} className="inline-flex items-center gap-1.5 mx-4 whitespace-nowrap text-[10px]">
          <span className="font-semibold tracking-wide">{g.title}</span>
          {g.genre && <span className="opacity-75">· {g.genre}</span>}
          {typeof g.downloads === 'number' && <span className="opacity-75">· {g.downloads} descargas</span>}
          <span className="text-[8px] opacity-60 select-none">✦</span>
        </span>
      ))}
    </>
  )
}

export function HeroTicker({ games }: { games: TickerGame[] }) {
  const list = games.filter(g => g.title)
  if (list.length === 0) return null

  // Cada mitad del track debe sobrepasar el ancho de pantalla: si hay
  // pocos juegos repetimos la secuencia hasta tener ~8 items por mitad.
  const reps = Math.max(1, Math.ceil(8 / list.length))
  const seq = Array.from({ length: reps }, () => list).flat()

  return (
    <div aria-hidden className="-mt-1 select-none">
      {/* Cinta 1 — portadas + nombres (va hacia la izquierda) */}
      <div className="overflow-hidden bg-[#40302A] text-[#F6EFDE] border-y-2 border-[#D9A441]/60">
        <div className="ticker-track py-1.5">
          <Seq games={seq} />
          <Seq games={seq} />
        </div>
      </div>
      {/* Cinta 2 — datos de cada juego (va hacia la derecha) */}
      <div className="overflow-hidden bg-[#C05B2E] text-[#F6EFDE] border-b-2 border-[#D9A441]/60">
        <div className="ticker-track ticker-track-reverse py-1">
          <SeqMeta games={seq} />
          <SeqMeta games={seq} />
        </div>
      </div>
    </div>
  )
}
