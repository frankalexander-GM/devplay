'use client'

import { useEffect, useRef } from 'react'
import { driver, type Driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { useUIStore } from '@/lib/stores'
import { useCurrentUser } from '@/hooks/use-current-user'

export function OnboardingTour() {
  const { onboardingDone, setOnboardingDone } = useUIStore()
  const { user } = useCurrentUser()
  const driverRef = useRef<Driver | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    if (onboardingDone || startedRef.current) return
    if (!user) return

    const startTour = () => {
      if (startedRef.current) return
      startedRef.current = true

      const header = document.getElementById('devplay-header')
      const sidebar = document.querySelector('aside nav') as HTMLElement | null
      const createBtn = document.querySelector('[data-tour="create"]') as HTMLElement | null

      const steps = [
        {
          element: header ?? '#devplay-header',
          popover: {
            title: 'Bienvenido a DevPlay',
            description:
              'Aqui puedes buscar juegos, devs y betas. Tambien puedes cambiar entre modo claro y oscuro con el boton de sol/luna.',
            side: 'bottom' as const,
            align: 'start' as const,
          },
        },
        {
          element: sidebar ?? 'aside',
          popover: {
            title: 'Navegacion',
            description:
              'Explora el Inicio, Descubre nuevos devs, mira Betas de juegos, Videos de la comunidad, chatea en el Chat Mundial, visita la Tienda con DevCoins o conoce mas en Acerca de.',
            side: 'right' as const,
            align: 'start' as const,
          },
        },
        {
          element: createBtn ?? '#devplay-header',
          popover: {
            title: 'Crear contenido',
            description:
              'Sube publicaciones, betas de juegos, videos o crea encuestas. ¡Comparte tus proyectos con la comunidad!',
            side: 'bottom' as const,
            align: 'end' as const,
          },
        },
        {
          element: 'body',
          popover: {
            title: 'Consejo',
            description:
              'Usa el boton de sol/luna arriba a la derecha para cambiar entre modo claro y oscuro. ¡Disfruta el nuevo diseno violeta!',
            side: 'top' as const,
            align: 'center' as const,
          },
        },
      ]

      const drv = driver({
        showProgress: true,
        allowClose: true,
        progressText: '{{current}} de {{total}}',
        nextBtnText: 'Siguiente',
        prevBtnText: 'Atras',
        doneBtnText: 'Entendido',
        steps,
        onDestroyed: () => {
          setOnboardingDone(true)
        },
      })

      driverRef.current = drv
      drv.drive()
    }

    const timer = setTimeout(startTour, 1000)
    return () => {
      clearTimeout(timer)
    }
  }, [onboardingDone, user, setOnboardingDone])

  return null
}
