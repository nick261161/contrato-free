import { useRef, useState } from 'react'
import { Button } from './Button'

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

interface ShareLinkProps {
  contractId: string
  titulo?: string
  /** Valor do contrato — enriquece a mensagem de WhatsApp. */
  valor?: number
  /** Prazo em dias — aparece na mensagem de WhatsApp. */
  prazoDias?: number
  /** Nome do cliente — personaliza a saudação. */
  cliente?: string
}

/**
 * Bloco de compartilhamento: mostra o link público de assinatura do contrato,
 * permite copiar para a área de transferência, abrir um e-mail ou mandar um
 * resumo pronto no WhatsApp (wa.me com mensagem formatada).
 */
export function ShareLink({
  contractId,
  titulo,
  valor,
  prazoDias,
  cliente,
}: ShareLinkProps) {
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

  /** Mensagem pronta para o freelancer enviar junto com o PDF. */
  function sendByWhatsApp() {
    const linhas = [
      cliente
        ? `Olá, ${cliente}! Segue o contrato *${titulo ?? contractId}* para você revisar e assinar pelo ContratoFree:`
        : `Olá! Segue o contrato *${titulo ?? contractId}* para você revisar e assinar pelo ContratoFree:`,
    ]
    if (valor) {
      linhas.push(
        `💰 Valor: ${currency.format(valor)}${
          prazoDias ? ` · ⏱ Prazo: ${prazoDias} dias` : ''
        }`,
      )
    }
    linhas.push('', `✍️ Assinar: ${url}`, '', 'Qualquer dúvida, é só responder por aqui mesmo.')

    const destino = `https://wa.me/?text=${encodeURIComponent(linhas.join('\n'))}`
    window.open(destino, '_blank', 'noopener,noreferrer')
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
        <Button variant="secondary" className="btn--whatsapp" onClick={sendByWhatsApp} type="button">
          💬 WhatsApp
        </Button>
      </div>
      <span className="share__hint">
        O cliente abre o link sem precisar de conta e assina no próprio ContratoFree.
      </span>
    </div>
  )
}
