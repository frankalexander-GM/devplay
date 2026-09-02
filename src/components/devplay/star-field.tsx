'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

interface Star {
  id: number
  x: number
  y: number
  size: number
  delay: number
  duration: number
}

interface ShootingStar {
  id: number
  startX: number
  startY: number
  delay: number
  duration: number
}

export function StarField() {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [stars, setStars] = useState<Star[]>([])
  const [shootingStars, setShootingStars] = useState<ShootingStar[]>([])

  useEffect(() => {
    queueMicrotask(() => setMounted(true))
  }, [])

  useEffect(() => {
    if (!mounted || theme !== 'dark') return

    // Generar 80 estrellas fijas
    const newStars: Star[] = Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 5,
      duration: Math.random() * 3 + 2,
    }))

    // Generar 5 estrellas fugaces
    const newShootingStars: ShootingStar[] = Array.from({ length: 5 }, (_, i) => ({
      id: i,
      startX: Math.random() * 100,
      startY: Math.random() * 50,
      delay: Math.random() * 15,
      duration: Math.random() * 3 + 2,
    }))

    queueMicrotask(() => {
      setStars(newStars)
      setShootingStars(newShootingStars)
    })
  }, [mounted, theme])

  if (!mounted || theme !== 'dark') return null

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Estrellas fijas que titilan */}
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animation: `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
            boxShadow: '0 0 4px rgba(255,255,255,0.8)',
          }}
        />
      ))}

      {/* Estrellas fugaces (shooting stars) */}
      {shootingStars.map((star) => (
        <div
          key={`shooting-${star.id}`}
          className="absolute"
          style={{
            left: `${star.startX}%`,
            top: `${star.startY}%`,
            animation: `shoot ${star.duration}s linear ${star.delay}s infinite`,
          }}
        >
          <div
            className="h-px w-20 bg-gradient-to-r from-transparent via-white to-transparent"
            style={{ transform: 'rotate(-45deg)' }}
          />
        </div>
      ))}

      {/* Luna sutil en la esquina */}
      <div
        className="absolute top-10 right-20 h-32 w-32 rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle at 30% 30%, oklch(0.9 0.05 60), oklch(0.7 0.02 60) 60%, transparent 70%)',
          boxShadow: '0 0 60px oklch(0.9 0.05 60 / 0.3)',
        }}
      />
    </div>
  )
}
