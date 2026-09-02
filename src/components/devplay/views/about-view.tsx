'use client'

import { motion } from 'framer-motion'
import {
  Gamepad2, Users, Video, BarChart3, MessageCircle,
  Shield, Palette, Sparkles, Code, Zap, Heart, Github,
} from 'lucide-react'

export function AboutView() {
  const features = [
    { icon: Gamepad2, title: 'Betas de Juegos', desc: 'Sube y descarga betas con formulario completo, screenshots y versionado' },
    { icon: Video, title: 'Videos', desc: 'Comparte gameplays, trailers y devlogs con la comunidad' },
    { icon: BarChart3, title: 'Encuestas', desc: 'Crea encuestas interactivas y obtén resultados en tiempo real' },
    { icon: MessageCircle, title: 'Chat Mundial', desc: 'Chatea en tiempo real con otros desarrolladores' },
    { icon: Users, title: 'Perfiles', desc: 'Personaliza tu perfil con tags, redes sociales y logros' },
    { icon: Shield, title: 'Seguridad', desc: 'Bloquea usuarios, reporta contenido y controla tu privacidad' },
    { icon: Palette, title: 'Temas', desc: 'Modo claro/oscuro con diseño limpio y profesional' },
    { icon: Sparkles, title: 'Tienda', desc: 'Sistema de DevCoins con power-ups y artículos premium' },
  ]

  const tech = [
    { name: 'Next.js 16', icon: Code },
    { name: 'TypeScript', icon: Code },
    { name: 'Prisma ORM', icon: Zap },
    { name: 'Socket.io', icon: Zap },
    { name: 'Tailwind CSS 4', icon: Palette },
    { name: 'NextAuth.js', icon: Shield },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-8">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center pt-8"
      >
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-accent shadow-lg">
          <img src="/logo-devplay.png" alt="DevPlay" className="h-14 w-14 rounded-2xl object-cover" />
        </div>
        <h1 className="text-4xl font-bold gradient-text">DevPlay</h1>
        <p className="text-lg text-muted-foreground mt-2 max-w-2xl mx-auto">
          Red social para desarrolladores y testers de videojuegos indie
        </p>
        <p className="text-sm text-muted-foreground mt-1">v1.0 · MVP</p>
      </motion.div>

      {/* ¿Qué es? */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6 sm:p-8"
      >
        <h2 className="text-2xl font-bold mb-3">¿Qué es DevPlay?</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          DevPlay es una plataforma social diseñada específicamente para la comunidad de
          desarrolladores de videojuegos independientes. Al igual que YouTube conecta a creadores
          de contenido con su audiencia, DevPlay conecta a desarrolladores de juegos indie con
          jugadores, testers y otros creadores.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed mt-3">
          Aquí puedes compartir tus betas, publicar gameplays y devlogs, crear encuestas para
          obtener feedback, chatear en tiempo real con la comunidad y descubrir nuevos proyectos
          indie. Todo en un solo lugar, diseñado por y para amantes de los videojuegos.
        </p>
      </motion.section>

      {/* Features */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-2xl font-bold mb-4 text-center">Funcionalidades principales</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className="glass-card p-4 flex items-start gap-3"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{f.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Tech Stack */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card p-6 sm:p-8"
      >
        <h2 className="text-2xl font-bold mb-4">Tecnologías</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {tech.map((t, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl bg-secondary/40 p-3">
              <t.icon className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-medium">{t.name}</span>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Stats */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        <StatCard label="Componentes" value="78+" />
        <StatCard label="APIs REST" value="44+" />
        <StatCard label="Modelos DB" value="19" />
        <StatCard label="Vistas" value="9" />
      </motion.section>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-center py-8"
      >
        <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
          Hecho con <Heart className="h-4 w-4 text-red-500" /> para la comunidad indie
        </p>
        <p className="text-xs text-muted-foreground mt-1">DevPlay · 2025</p>
      </motion.div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card p-4 text-center">
      <div className="text-2xl font-bold gradient-text">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  )
}
