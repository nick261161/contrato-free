import type { Ref } from 'react'
import type { Contract, FreelancerProfile, Signature } from '../types'
import { CLAUSULAS_OPCIONAIS, NICHOS } from '../services/clausulas'

interface ContractPreviewProps {
  contract: Contract
  profile: FreelancerProfile
  innerRef?: Ref<HTMLDivElement>
}

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

function formatDate(iso: string): string {
  if (!iso) return '—'
  return new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR')
}

interface SignatureSlotProps {
  signature?: Signature
  nome: string
  papel: string
}

/**
 * Coluna de assinatura: o desenho/nome digitado fica ALINHADO por cima da
 * linha, com o nome da parte embaixo — como num contrato de papel. Quando a
 * parte ainda não assinou, o espaço fica reservado com o aviso de pendência.
 */
function SignatureSlot({ signature, nome, papel }: SignatureSlotProps) {
  return (
    <div className="preview__sig">
      <div className="preview__sig-area">
        {signature?.imagem ? (
          <img
            className="preview__sig-img"
            src={signature.imagem}
            alt={`Assinatura de ${signature.por}`}
          />
        ) : signature ? (
          <p className="preview__signature-typed">{signature.por}</p>
        ) : (
          <span className="preview__sig-pending">
            {papel} — aguardando assinatura
          </span>
        )}
      </div>

      <div className="preview__line" />
      <span className="preview__sig-name">{nome}</span>

      {signature ? (
        <span className="preview__sig-stamp">
          Assinado por <strong>{signature.por}</strong> em{' '}
          {new Date(signature.em).toLocaleString('pt-BR')}
        </span>
      ) : (
        <span className="preview__sig-hint">Aguardando assinatura</span>
      )}

      {signature?.hash && (
        <span
          className="preview__sig-hash"
          title={`SHA-256 do conteúdo: ${signature.hash}`}
        >
          SHA-256: {signature.hash.slice(0, 24)}…
          {signature.ip ? ` · IP ${signature.ip}` : ''}
        </span>
      )}
    </div>
  )
}

/** Pré-visualização do contrato gerado — também é a área de impressão/exportação em PDF. */
export function ContractPreview({ contract, profile, innerRef }: ContractPreviewProps) {
  const inicio = formatDate(contract.dataInicio)
  const fim = contract.dataInicio
    ? formatDate(
        new Date(
          new Date(`${contract.dataInicio}T00:00:00`).getTime() +
            contract.prazoDias * 86_400_000,
        ).toISOString().slice(0, 10),
      )
    : '—'

  // Seções dinâmicas: objeto + termos padrão sempre; nicho e cláusulas
  // opcionais entram quando escolhidas — a numeração é recalculada.
  const nichoDef = NICHOS.find((item) => item.value === contract.nicho)
  const opcionais = CLAUSULAS_OPCIONAIS.filter(
    (item) => contract.clausulas?.[item.chave],
  )

  const secoes: Array<{ titulo: string; conteudo: string }> = [
    { titulo: 'Objeto do contrato', conteudo: contract.descricao || '—' },
    { titulo: 'Condições padrão do prestador', conteudo: profile.termosPadrao || '—' },
  ]
  if (nichoDef) {
    secoes.push({
      titulo: `Cláusulas-base — ${nichoDef.label}`,
      conteudo: nichoDef.clausulas.join(' '),
    })
  }
  for (const item of opcionais) {
    secoes.push({ titulo: item.titulo, conteudo: item.texto })
  }

  return (
    <div className="preview" ref={innerRef} id="contract-print">
      <div className="preview__head">
        <span className="preview__brand">
          <span className="brand__mark">§</span> ContratoFree
        </span>
        <span className="preview__number">
          {contract.id ? `#${contract.id}` : '#rascunho'}
        </span>
      </div>

      <h2 className="preview__title">{contract.titulo || 'Sem título'}</h2>
      <p className="preview__subtitle">
        Contrato de prestação de serviços entre{' '}
        <strong>{profile.nome || '—'}</strong> e{' '}
        <strong>{contract.cliente.nome || '—'}</strong>.
      </p>

      <div className="preview__grid">
        <div>
          <span>Prestador</span>
          <strong>{profile.nome || '—'}</strong>
          <p>
            {profile.profissao || '—'}
            <br />
            {profile.email || '—'}
            <br />
            {profile.telefone || '—'}
          </p>
        </div>
        <div>
          <span>Contratante</span>
          <strong>{contract.cliente.nome || '—'}</strong>
          <p>
            {contract.cliente.cpfCnpj || '—'}
            <br />
            {contract.cliente.email || '—'}
            <br />
            {contract.cliente.endereco || '—'}
          </p>
        </div>
      </div>

      <div className="preview__row">
        <div>
          <span>Valor total</span>
          <strong>{currency.format(contract.valor || 0)}</strong>
        </div>
        <div>
          <span>Início</span>
          <strong>{inicio}</strong>
        </div>
        <div>
          <span>Entrega prevista</span>
          <strong>{fim}</strong>
        </div>
      </div>

      {secoes.map((secao, index) => (
        <section className="preview__section" key={secao.titulo}>
          <h3>
            {index + 1}. {secao.titulo}
          </h3>
          <p>{secao.conteudo}</p>
        </section>
      ))}

      <section className="preview__section">
        <h3>{secoes.length + 1}. Assinaturas</h3>

        <div className="preview__signatures">
          <SignatureSlot
            signature={contract.assinaturaPrestador}
            nome={profile.nome || 'Prestador'}
            papel="Prestador"
          />
          <SignatureSlot
            signature={contract.assinaturaContratante}
            nome={contract.cliente.nome || 'Contratante'}
            papel="Contratante"
          />
        </div>
      </section>

      <p className="preview__footnote">
        Documento gerado automaticamente pela plataforma ContratoFree em{' '}
        {new Date().toLocaleDateString('pt-BR')}.
      </p>
    </div>
  )
}
