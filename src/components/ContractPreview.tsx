import type { Ref } from 'react'
import type { Contract, FreelancerProfile } from '../types'

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

      <section className="preview__section">
        <h3>1. Objeto do contrato</h3>
        <p>{contract.descricao || '—'}</p>
      </section>

      <section className="preview__section">
        <h3>2. Condições padrão do prestador</h3>
        <p>{profile.termosPadrao || '—'}</p>
      </section>

      <section className="preview__section">
        <h3>3. Assinaturas</h3>
        <div className="preview__signatures">
          <div>
            <div className="preview__line" />
            <span>{profile.nome || 'Prestador'}</span>
          </div>
          <div>
            <div className="preview__line" />
            <span>{contract.cliente.nome || 'Contratante'}</span>
          </div>
        </div>
      </section>

      <p className="preview__footnote">
        Documento gerado automaticamente pela plataforma ContratoFree em{' '}
        {new Date().toLocaleDateString('pt-BR')}.
      </p>
    </div>
  )
}
