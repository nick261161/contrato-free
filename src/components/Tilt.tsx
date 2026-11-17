import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'

interface TiltProps {
  children: ReactNode
  className?: string
  /** Elemento renderizado (padrão: div). */
  as?: 'div' | 'article'
  /** Inclinação máxima em graus. */
  max?: number
  'aria-hidden'?: boolean
}

/**
 * Card com efeito 3D (tilt) que inclina seguindo o cursor do mouse.
 *
 * O transform é aplicado direto no DOM (via ref) para não gerar re-render a
 * cada movimento. Ignora toque e respeita "reduzir movimentos" do sistema.
 */
export function Tilt({
  children,
  className,
  as = 'div',
  max = 8,
  ...rest
}: TiltProps) {
  const ref = useRef<HTMLDivElement>(null)

  function handlePointerMove(event: ReactPointerEvent<HTMLElement>) {
    const el = ref.current
    if (!el || event.pointerType === 'touch') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const rect = el.getBoundingClientRect()
    const clamp = (v: number) => Math.max(-0.5, Math.min(0.5, v))
    const x = clamp((event.clientX - rect.left) / rect.width - 0.5)
    const y = clamp((event.clientY - rect.top) / rect.height - 0.5)

    // Cursor no topo → rotateX negativo (topo vem na direção do olhar).
    // O translateY(-4px) mantém o levantamento do hover enquanto inclina.
    el.style.transform = `translateY(-4px) perspective(900px) rotateX(${(y * max).toFixed(2)}deg) rotateY(${(x * max).toFixed(2)}deg)`
    el.style.setProperty('--glare-x', `${((x + 0.5) * 100).toFixed(1)}%`)
    el.style.setProperty('--glare-y', `${((y + 0.5) * 100).toFixed(1)}%`)
  }

  function handlePointerLeave() {
    const el = ref.current
    if (!el) return
    el.style.removeProperty('transform')
    el.style.removeProperty('--glare-x')
    el.style.removeProperty('--glare-y')
  }

  const classe = className ? `tilt ${className}` : 'tilt'

  if (as === 'article') {
    return (
      <article
        ref={ref}
        className={classe}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        {...rest}
      >
        {children}
      </article>
    )
  }

  return (
    <div
      ref={ref}
      className={classe}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      {...rest}
    >
      {children}
    </div>
  )
}
