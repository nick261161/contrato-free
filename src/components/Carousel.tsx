import {
  Children,
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'

interface CarouselProps {
  children: ReactNode
  /** Rótulo de acessibilidade do carrossel. */
  label: string
  /** Classes extras no elemento raiz (ex.: "carousel--cards"). */
  className?: string
}

interface TrackState {
  index: number
  canPrev: boolean
  canNext: boolean
  scrollable: boolean
}

/**
 * Carrossel horizontal arrastável com o mouse (touch usa o scroll nativo).
 *
 * - Arrastar move a faixa (cursor grab/grabbing);
 * - Setas e indicadores navegam até um item;
 * - Snap automático ao soltar;
 * - O ponteiro só é capturado depois de virar arrasto de verdade, para que
 *   um clique simples continue chegando aos botões dos cards.
 */
export function Carousel({ children, label, className = '' }: CarouselProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef({
    active: false,
    captured: false,
    startX: 0,
    startScroll: 0,
    moved: 0,
  })
  const rafRef = useRef<number | null>(null)

  const total = Children.count(children)
  const [track, setTrackState] = useState<TrackState>({
    index: 0,
    canPrev: false,
    canNext: false,
    scrollable: false,
  })

  const measure = useCallback(() => {
    const el = trackRef.current
    if (!el) return

    const scrollable = el.scrollWidth - el.clientWidth > 8

    // Item mais próximo da borda esquerda visível (alinhado com o
    // scroll-snap-align: start e com o alvo do goTo) — imune a
    // offsetLeft/coordenadas de scroll.
    const rect = el.getBoundingClientRect()
    let index = 0
    let best = Number.POSITIVE_INFINITY

    for (let i = 0; i < el.children.length; i++) {
      const item = (el.children[i] as HTMLElement).getBoundingClientRect()
      const dist = Math.abs(item.left - rect.left)
      if (dist < best) {
        best = dist
        index = i
      }
    }

    setTrackState({
      index,
      canPrev: el.scrollLeft > 4,
      canNext: el.scrollLeft < el.scrollWidth - el.clientWidth - 4,
      scrollable,
    })
    rootRef.current?.classList.toggle('is-scrollable', scrollable)
  }, [])

  useEffect(() => {
    const el = trackRef.current
    if (!el) return

    measure()
    const observer = new ResizeObserver(() => measure())
    observer.observe(el)

    return () => {
      observer.disconnect()
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [measure, total])

  function handleScroll() {
    if (rafRef.current != null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      measure()
    })
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    dragRef.current.moved = 0

    // Touch usa o scroll nativo do navegador.
    if (event.pointerType === 'touch') return
    if (event.pointerType === 'mouse' && event.button !== 0) return

    const el = trackRef.current
    if (!el) return

    dragRef.current = {
      active: true,
      captured: false,
      startX: event.clientX,
      startScroll: el.scrollLeft,
      moved: 0,
    }
    rootRef.current?.classList.add('is-dragging')
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    const el = trackRef.current
    if (!drag.active || !el) return

    // Auto-recuperação: se o pointerup foi perdido (ex.: solto fora da
    // janela), o próximo movimento sem botão pressionado encerra o arrasto.
    if (event.buttons === 0) {
      if (drag.captured && el.hasPointerCapture(event.pointerId)) {
        el.releasePointerCapture(event.pointerId)
      }
      drag.active = false
      rootRef.current?.classList.remove('is-dragging', 'is-captured')
      dragRef.current.moved = 0
      measure()
      return
    }

    const dx = event.clientX - drag.startX
    drag.moved = Math.max(drag.moved, Math.abs(dx))

    // Captura o ponteiro só depois do limiar de arrasto — assim um clique
    // simples (pointerdown → up sem mover) segue normal no botão do card.
    if (!drag.captured && drag.moved > 6) {
      el.setPointerCapture(event.pointerId)
      drag.captured = true
      rootRef.current?.classList.add('is-captured')
    }

    el.scrollLeft = drag.startScroll - dx
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    const el = trackRef.current
    if (!drag.active || !el) return

    drag.active = false
    if (drag.captured && el.hasPointerCapture(event.pointerId)) {
      el.releasePointerCapture(event.pointerId)
    }
    rootRef.current?.classList.remove('is-dragging', 'is-captured')
    measure()

    // Se nenhum clique vier logo em seguida, limpa a distância do arrasto
    // para o próximo clique não ser engolido.
    window.setTimeout(() => {
      dragRef.current.moved = 0
    }, 0)
  }

  // Um arrasto não deve disparar o clique do botão por baixo do cursor.
  function handleClickCapture(event: ReactMouseEvent<HTMLDivElement>) {
    if (dragRef.current.moved > 6) {
      event.stopPropagation()
      event.preventDefault()
      dragRef.current.moved = 0
    }
  }

  function goTo(index: number) {
    const el = trackRef.current
    if (!el) return

    const alvo = el.children[
      Math.max(0, Math.min(index, el.children.length - 1))
    ] as HTMLElement | undefined
    if (!alvo) return

    // Delta exato entre a posição visível do item e a borda visível da faixa
    // (funciona com padding e independentemente do offsetParent).
    const delta =
      alvo.getBoundingClientRect().left - el.getBoundingClientRect().left
    el.scrollTo({ left: el.scrollLeft + delta, behavior: 'smooth' })
  }

  const { index, canPrev, canNext, scrollable } = track
  const classe = className ? `carousel ${className}` : 'carousel'

  return (
    <div
      ref={rootRef}
      className={classe}
      role="region"
      aria-roledescription="carrossel"
      aria-label={label}
    >
      <div className="carousel__viewport">
        <div
          ref={trackRef}
          className="carousel__track"
          onScroll={handleScroll}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClickCapture={handleClickCapture}
        >
          {Children.map(children, (child) => (
            <div className="carousel__item">{child}</div>
          ))}
        </div>

        {scrollable && (
          <>
            <button
              type="button"
              className="carousel__btn carousel__btn--prev"
              onClick={() => goTo(index - 1)}
              disabled={!canPrev}
              aria-label="Item anterior"
            >
              ‹
            </button>
            <button
              type="button"
              className="carousel__btn carousel__btn--next"
              onClick={() => goTo(index + 1)}
              disabled={!canNext}
              aria-label="Próximo item"
            >
              ›
            </button>
          </>
        )}
      </div>

      {scrollable && total > 1 && (
        <div className="carousel__dots">
          {Array.from({ length: total }, (_, i) => (
            <button
              key={i}
              type="button"
              className={`carousel__dot${i === index ? ' is-active' : ''}`}
              onClick={() => goTo(i)}
              aria-label={`Ir para o item ${i + 1}`}
              aria-current={i === index}
            />
          ))}
        </div>
      )}
    </div>
  )
}
