import { useRef, useState } from 'react'
import { Button } from './Button'

interface ShareLinkProps {
  contractId: string
  titulo?: string
}

/**
 * Bloco de compartilhamento: mostra o link público de assinatura do contrato,
 * permite copiar para a área de transferência e abrir um e-mail com o link.
 */
export function ShareLink({ contractId, titulo }: ShareLinkProps) {
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const url = `${window.location.origin}/assinar/${contractId}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // fallback para navegadores sem Clipboard API
      inputRef.current?.select()
      document.execCommand?.('copy')
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  function sendByEmail() {
    const subject = encodeURIComponent(`Contrato para assinar: ${titulo ?? contractId}`)
    const body = encodeURIComponent(
      `Olá!\n\nSegue o link do contrato "${titulo ?? contractId}" para você revisar e assinar direto na plataforma ContratoFree:\n\n${url}\n\nObrigado!`,
    )
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  return (
    <div className="share">
      <span className="share__label">Link de assinatura para o cliente</span>
      <div className="share__row">
        <input
          ref={inputRef}
          className="field__control share__input"
          readOnly
          value={url}
          aria-label="Link de assinatura"
          onFocus={(event) => event.currentTarget.select()}
        />
        <Button variant="secondary" onClick={() => void copy()} type="button">
          {copied ? '✓ Copiado' : 'Copiar link'}
        </Button>
        <Button variant="ghost" onClick={sendByEmail} type="button">
          ✉️ E-mail
        </Button>
      </div>
      <span className="share__hint">
        O cliente abre o link sem precisar de conta e assina no próprio ContratoFree.
      </span>
    </div>
  )
}
