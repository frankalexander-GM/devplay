'use client'

import { useEffect, useRef } from 'react'
import { driver, type Driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { useUIStore } from '@/lib/stores'
import { useCurrentUser } from '@/hooks/use-current-user'

/**
 * Tour guiado de DevPlay — actualizado al diseño "Terracota & Crema".
 * - Arranca solo la primera vez (onboardingDone persistido).
 * - Se puede relanzar al instante desde el sidebar (Ayuda → Tour guiado)
 *   sin recargar la página, gracias a tourNonce.
 */
export function OnboardingTour() {
  const { onboardingDone, setOnboardingDone, tourNonce } = useUIStore()
  const { user } = useCurrentUser()
  const driverRef = useRef<Driver | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    if (!user) return

    const buildAndDrive = () => {
      const header = document.getElementById('devplay-header')
      const sidebar = document.querySelector('aside nav') as HTMLElement | null
      // El botón Crear existe dos veces (header desktop + dock móvil): usar el VISIBLE
      // Nota: los elementos fixed tienen offsetParent null → usar rect + checkVisibility
      const isVisible = (el: HTMLElement) => {
        if (typeof el.checkVisibility === 'function') return el.checkVisibility()
        const r = el.getBoundingClientRect()
        return r.width > 0 && r.height > 0
      }
      const createBtn = (
        Array.from(document.querySelectorAll<HTMLElement>('[data-tour="create"]')).find(isVisible) ?? null
      )
      const chatPanel = document.querySelector('[data-tour="chat-panel"]') as HTMLElement | null
      const buddy = document.querySelector('[data-tour="pixel-buddy"]') as HTMLElement | null

      const steps = [
        header && {
          element: header,
          popover: {
            title: '¡Bienvenido a DevPlay! 🎮',
            description:
              'Tu plaza retro para devs indie. Aquí puedes buscar juegos, devs y betas, entrar a tu cuenta y cambiar entre modo claro y oscuro (sol/luna).',
            side: 'bottom' as const,
            align: 'start' as const,
          },
        },
        sidebar && {
          element: sidebar,
          popover: {
            title: 'Todo el universo DevPlay',
            description:
              'Navega con el menú principal: Inicio, Descubrir, Betas, Videos, Chat Mundial y Tienda (con DevCoins). En "Comunidad" tienes atajos a Trending, Betas y Devs, en "Mi biblioteca" tus guardados, betas, logros y Reportes, y con el botón ⋮ personalizas este sidebar.',
            side: 'right' as const,
            align: 'start' as const,
          },
        },
        chatPanel && {
          element: chatPanel,
          popover: {
            title: 'Chat Mundial en vivo',
            description:
              'La plaza pública: chatea con devs de todo el mundo en tiempo real. Con el botón ⋮ puedes limpiar la conversación, eliminar tus mensajes o reportar problemas. Ojo: hay 5 segundos de espera entre mensajes para evitar spam.',
            side: 'left' as const,
            align: 'start' as const,
          },
        },
        createBtn && {
          element: createBtn,
          popover: {
            title: 'Crea y comparte',
            description:
              'Publica devlogs con imágenes y videos, sube tus betas para que las prueben, lanza encuestas o anuncia tus streams. ¡La comunidad quiere ver lo que haces!',
            side: 'bottom' as const,
            align: 'end' as const,
          },
        },
        buddy && {
          element: buddy,
          popover: {
            title: 'Pixel, tu asistente de IA 🤖',
            description:
              'Este botoncito se pasea por la pantalla y te da tips según dónde estés. Tócalo y pregúntale lo que quieras: cómo subir una beta, ideas para tu juego, cómo ganar nivel...',
            side: 'left' as const,
            align: 'start' as const,
          },
        },
        {
          element: 'body',
          popover: {
            title: 'Un consejo antes de empezar',
            description:
              'Da feedback con cariño, celebra los logros de otros devs y cuéntanos tu devlog de la semana. Bienvenido a la plaza ☕',
            side: 'top' as const,
            align: 'center' as const,
          },
        },
      ].filter(Boolean) as {
        element: string | HTMLElement
        popover: { title: string; description: string; side: 'top' | 'bottom' | 'left' | 'right'; align: 'start' | 'center' | 'end' }
      }[]

      const drv = driver({
        showProgress: true,
        allowClose: true,
        progressText: '{{current}} de {{total}}',
        nextBtnText: 'Siguiente',
        prevBtnText: 'Atrás',
        doneBtnText: '¡A jugar!',
        steps,
        onDestroyed: () => {
          setOnboardingDone(true)
          driverRef.current = null
        },
      })

      driverRef.current = drv
      drv.drive()
    }

    // Modo manual: tourNonce > 0 → lanzar al instante (botón "Tour guiado")
    if (tourNonce > 0) {
      buildAndDrive()
      return
    }

    // Modo automático: solo la primera vez
    if (onboardingDone || startedRef.current) return
    startedRef.current = true
    const timer = setTimeout(buildAndDrive, 1200)
    return () => clearTimeout(timer)
  }, [onboardingDone, user, setOnboardingDone, tourNonce])

  return null
}
