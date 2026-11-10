import { STATUS_LABEL, type Contract } from '../types'

interface ContractCardProps {
  contract: Contract
  onView: (contract: Contract) => void
}

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function ContractCard({ contract, onView }: ContractCardProps) {
  const criado = new Date(contract.criadoEm).toLocaleDateString('pt-BR')

  const temPrestador = Boolean(contract.assinaturaPrestador)
  const temCliente = Boolean(contract.assinaturaContratante)
  const ambas = temPrestador && temCliente

  // data da assinatura final (a última das duas partes a assinar)
  const emFinal =
    contract.assinaturaContratante?.em ?? contract.assinaturaPrestador?.em

  return (
    <article className="contract-card">
      <div className="contract-card__top">
        <span className={`badge badge--${contract.status}`}>
          {STATUS_LABEL[contract.status]}
        </span>
        <span className="contract-card__date">{criado}</span>
      </div>

      <h3 className="contract-card__title">{contract.titulo}</h3>
      <p className="contract-card__client">{contract.cliente.nome}</p>

      {ambas && emFinal && (
        <p className="contract-card__signed">
          ✍️ Assinado em{' '}
          {new Date(emFinal).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      )}

      {(temPrestador || temCliente) && !ambas && (
        <p className="contract-card__signed contract-card__signed--pending">
          ✍️ Falta assinatura do {temPrestador ? 'cliente' : 'prestador'}
        </p>
      )}

      <div className="contract-card__meta">
        <div>
          <span>Valor</span>
          <strong>{currency.format(contract.valor)}</strong>
        </div>
        <div>
          <span>Prazo</span>
          <strong>{contract.prazoDias} dias</strong>
        </div>
      </div>

      <button className="contract-card__action" onClick={() => onView(contract)}>
        Ver detalhes →
      </button>
    </article>
  )
}
