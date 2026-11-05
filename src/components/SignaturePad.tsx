import { useEffect, useRef, type PointerEvent } from 'react'

interface SignaturePadProps {
  /** Devolve a assinatura em dataURL (ou null quando o traço é apagado). */
  onChange: (dataUrl: string | null) => void
  width?: number
  height?: number
}

/**
 * Área de desenho da assinatura (canvas).
 * Usa useRef para acessar o canvas e eventos de ponteiro para desenhar.
 */
export function SignaturePad({ onChange, width = 440, height = 170 }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const hasInk = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.lineWidth = 2.4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#1c2033'
  }, [])

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  function handleStart(event: PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    drawing.current = true
    const p = point(event)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handleMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const p = point(event)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    if (!hasInk.current) {
      hasInk.current = true
      onChange(canvasRef.current?.toDataURL('image/png') ?? null)
    }
  }

  function handleEnd() {
    if (!drawing.current) return
    drawing.current = false
    if (hasInk.current) {
      onChange(canvasRef.current?.toDataURL('image/png') ?? null)
    }
  }

  function clear() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    hasInk.current = false
    onChange(null)
  }

  return (
    <div className="signature">
      <canvas
        ref={canvasRef}
        className="signature__canvas"
        width={width}
        height={height}
        style={{ width, height }}
        onPointerDown={handleStart}
        onPointerMove={handleMove}
        onPointerUp={handleEnd}
        onPointerLeave={handleEnd}
        aria-label="Área para desenhar a assinatura"
      />
      <div className="signature__bar">
        <span>Assinale acima com o mouse ou dedo</span>
        <button type="button" className="signature__clear" onClick={clear}>
          Limpar
        </button>
      </div>
    </div>
  )
}
