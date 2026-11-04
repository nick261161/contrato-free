import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ContractCard } from '../components/ContractCard'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { Metric } from '../components/Metric'
import { Modal } from '../components/Modal'
import { Sidebar } from '../components/Sidebar'
import { useContracts } from '../hooks/useContracts'
import type { Contract } from '../types'
import { STATUS_LABEL } from '../types'

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function Dashboard() {
  const { contracts, loading, error, reload } = useContracts()
  const [selected, setSelected] = useState<Contract | null>(null)

  const metrics = useMemo(() => {
    const total = contracts.length
    const valorTotal = contracts.reduce((sum, c) => sum + c.valor, 0)
    const pendentes = contracts.filter((c) => c.status === 'pendente').length
    const assinados = contracts.filter(
      (c) => c.status === 'assinado' || c.status === 'concluido',
    ).length

    return [
      { label: 'Contratos', value: String(total), hint: 'no seu histórico' },
      { label: 'Valor total', value: currency.format(valorTotal), hint: 'soma dos contratos' },
      { label: 'Pendentes', value: String(pendentes), hint: 'aguardando assinatura' },
      { label: 'Assinados', value: String(assinados), hint: 'fechados com sucesso' },
    ]
  }, [contracts])

  return (
    <div className="page">
      <Header />

      <div className="container app-layout">
        <Sidebar />

        <main className="app-main">
          <div className="app-main__head">
            <div>
              <span className="app-main__eyebrow">Visão geral</span>
              <h1>Seus contratos recentes</h1>
            </div>
            <div className="app-main__actions">
              <button className="btn btn--ghost" onClick={() => void reload()} disabled={loading}>
                {loading ? 'Atualizando…' : 'Atualizar'}
              </button>
              <Link to="/novo-contrato" className="btn btn--primary">
                + Novo contrato
              </Link>
            </div>
          </div>

          <section className="metrics">
            {metrics.map((metric) => (
              <Metric key={metric.label} {...metric} />
            ))}
          </section>

          <section className="contracts">
            <header className="contracts__head">
              <h2>Contratos</h2>
              <span>{contracts.length} registro(s)</span>
            </header>

            {error && (
              <div className="alert alert--error">
                {error} <button onClick={() => void reload()}>Tentar novamente</button>
              </div>
            )}

            {loading && contracts.length === 0 ? (
              <div className="skeleton-list" aria-label="Carregando contratos">
                <span className="skeleton" />
                <span className="skeleton" />
                <span className="skeleton" />
              </div>
            ) : (
              <div className="contracts__grid">
                {contracts.map((contract) => (
                  <ContractCard key={contract.id} contract={contract} onView={setSelected} />
                ))}
              </div>
            )}

            {!loading && !error && contracts.length === 0 && (
              <div className="empty">
                <p>Nenhum contrato encontrado ainda.</p>
                <Link to="/novo-contrato" className="btn btn--primary">
                  Criar primeiro contrato
                </Link>
              </div>
            )}
          </section>
        </main>
      </div>

      <Modal open={selected !== null} title="Detalhes do contrato" onClose={() => setSelected(null)}>
        {selected && (
          <div className="contract-detail">
            <div className="contract-detail__row">
              <span>Status</span>
              <strong>{STATUS_LABEL[selected.status]}</strong>
            </div>
            <div className="contract-detail__row">
              <span>Cliente</span>
              <strong>{selected.cliente.nome}</strong>
            </div>
            <div className="contract-detail__row">
              <span>Contato</span>
              <strong>{selected.cliente.email}</strong>
            </div>
            <div className="contract-detail__row">
              <span>Documento</span>
              <strong>{selected.cliente.cpfCnpj}</strong>
            </div>
            <div className="contract-detail__row">
              <span>Valor</span>
              <strong>{currency.format(selected.valor)}</strong>
            </div>
            <div className="contract-detail__row">
              <span>Prazo</span>
              <strong>{selected.prazoDias} dias a partir de {selected.dataInicio}</strong>
            </div>
            <div className="contract-detail__block">
              <span>Escopo</span>
              <p>{selected.descricao}</p>
            </div>
          </div>
        )}
      </Modal>

      <Footer />
    </div>
  )
}
