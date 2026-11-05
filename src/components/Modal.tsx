import { type ReactNode, useEffect } from 'react'
import { Button } from './Button'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  /** Elemento alinhado à esquerda do rodapé (ex.: botão de excluir). */
  footerStart?: ReactNode
}

export function Modal({ open, title, onClose, children, footer, footerStart }: ModalProps) {
  // useEffect: fecha o modal com a tecla ESC
  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal__overlay" onClick={onClose} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal__header">
          <h2>{title}</h2>
          <button className="modal__close" onClick={onClose} aria-label="Fechar modal">
            ✕
          </button>
        </div>

        <div className="modal__body">{children}</div>

        <div
          className={`modal__footer ${footerStart ? 'modal__footer--split' : ''}`}
        >
          {footerStart}
          {footer ?? (
            <Button variant="secondary" onClick={onClose}>
              Fechar
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
