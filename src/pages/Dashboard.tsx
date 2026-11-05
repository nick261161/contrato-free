import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ContractCard } from '../components/ContractCard'
import { Button } from '../components/Button'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { Metric } from '../components/Metric'
import { Modal } from '../components/Modal'
import { Sidebar } from '../components/Sidebar'
import { SignaturePad } from '../components/SignaturePad'
import { useContracts } from '../hooks/useContracts'
import type { Contract } from '../types'
import { STATUS_LABEL } from '../types'

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function Dashboard() {
  const navigate = useNavigate()
  const { contracts, loading, error, reload, removeContract, signContract } = useContracts()
  const [selected, setSelected] = useState<Contract | null>(null)
  const [deleting, setDeleting] = useState<Contract | null>(null)
  const [removendo, setRemovendo] = useState(false)

  // useState: fluxo de assinatura (quem assina + desenho no canvas)
  const [assinando, setAssinando] = useState<Contract | null>(null)
  const [assinante, setAssinante] = useState('')
  const [desenho, setDesenho] = useState<string | null>(null)
  const [assinandoSalvando, setAssinandoSalvando] = useState(false)
  const [erroAssinatura, setErroAssinatura] = useState<string | null>(null)

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

  async function handleConfirmDelete() {
    if (!deleting) return
    setRemovendo(true)
    try {
      await removeContract(deleting.id)
      setSelected(null)
      setDeleting(null)
    } catch {
      setRemovendo(false)
      return
    }
    setRemovendo(false)
  }

  /** Abre o modal de assinatura com o nome do cliente já sugerido. */
  function openSign(contract: Contract) {
    setAssinando(contract)
    setAssinante(contract.cliente.nome)
    setDesenho(null)
    setErroAssinatura(null)
  }

  /** Assina: grava quem assinou + data/hora automática e muda o status. */
  async function handleSign() {
    if (!assinando) return
    if (!assinante.trim()) {
      setErroAssinatura('Informe o nome de quem está assinando.')
      return
    }

    setAssinandoSalvando(true)
    setErroAssinatura(null)
    try {
      const signed = await signContract(assinando.id, {
        por: assinante.trim(),
        imagem: desenho ?? undefined,
      })
      setSelected(signed)
      setAssinando(null)
      setDesenho(null)
    } catch {
      setErroAssinatura('Não foi possível registrar a assinatura. Tente novamente.')
    } finally {
      setAssinandoSalvando(false)
    }
  }

  function formatStamp(iso: string): string {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

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

      <Modal
        open={selected !== null}
        title="Detalhes do contrato"
        onClose={() => setSelected(null)}
        footerStart={
          <Button
            variant="danger"
            onClick={() => setDeleting(selected)}
            type="button"
          >
            Excluir
          </Button>
        }
        footer={
          <>
            {selected &&
              (selected.status === 'rascunho' || selected.status === 'pendente') && (
                <Button
                  variant="primary"
                  onClick={() => openSign(selected)}
                  type="button"
                >
                  ✍️ Assinar contrato
                </Button>
              )}
            <Button
              variant="secondary"
              onClick={() => selected && navigate(`/novo-contrato/${selected.id}`)}
              type="button"
            >
              Editar
            </Button>
            <Button onClick={() => setSelected(null)} type="button">
              Fechar
            </Button>
          </>
        }
      >
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

            <div className="contract-detail__block contract-detail__block--signature">
              <span>Assinatura</span>
              {selected.assinatura ? (
                <div className="contract-detail__signed">
                  {selected.assinatura.imagem && (
                    <img
                      src={selected.assinatura.imagem}
                      alt={`Assinatura de ${selected.assinatura.por}`}
                      className="contract-detail__signature-img"
                    />
                  )}
                  <p>
                    Assinado por <strong>{selected.assinatura.por}</strong> em{' '}
                    <strong>{formatStamp(selected.assinatura.em)}</strong> — data/hora
                    registrada automaticamente pelo app.
                  </p>
                </div>
              ) : (
                <p className="contract-detail__unsigned">
                  Aguardando assinatura — use o botão “Assinar contrato” para registrar.
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={deleting !== null}
        title="Excluir contrato?"
        onClose={() => !removendo && setDeleting(null)}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setDeleting(null)}
              type="button"
              disabled={removendo}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => void handleConfirmDelete()}
              type="button"
              disabled={removendo}
            >
              {removendo ? 'Excluindo…' : 'Excluir definitivamente'}
            </Button>
          </>
        }
      >
        <p>
          O contrato <strong>{deleting?.titulo}</strong> de{' '}
          <strong>{deleting?.cliente.nome}</strong> será excluído permanentemente.
          Esta ação não pode ser desfeita.
        </p>
      </Modal>

      <Modal
        open={assinando !== null}
        title="Assinar contrato ✍️"
        onClose={() => !assinandoSalvando && setAssinando(null)}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setAssinando(null)}
              type="button"
              disabled={assinandoSalvando}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => void handleSign()}
              type="button"
              disabled={assinandoSalvando}
            >
              {assinandoSalvando
                ? 'Registrando…'
                : 'Confirmar assinatura ✓'}
            </Button>
          </>
        }
      >
        <div className="sign-form">
          <p className="sign-form__hint">
            Contrato <strong>{assinando?.titulo}</strong> — ao confirmar, o app grava
            automaticamente <strong>quem assinou</strong> e a <strong>data/hora</strong>{' '}
            da assinatura, e o status muda para <strong>Assinado</strong>.
          </p>

          <label className="field__label" htmlFor="assinante">
            Nome de quem assina
          </label>
          <input
            id="assinante"
            className="field__control"
            value={assinante}
            onChange={(event) => {
              setAssinante(event.target.value)
              setErroAssinatura(null)
            }}
            placeholder="Ex.: Padaria Estrela"
          />
          {erroAssinatura && <span className="field__error">{erroAssinatura}</span>}

          <span className="field__label">Assinatura (desenhe abaixo)</span>
          <SignaturePad onChange={setDesenho} />
          <span className="field__hint">
            Opcional: se preferir, apenas confirme — o nome digitado já fica registrado.
          </span>
        </div>
      </Modal>

      <Footer />
    </div>
  )
}
