import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ContractCard } from '../components/ContractCard'
import { Button } from '../components/Button'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { Metric } from '../components/Metric'
import { Modal } from '../components/Modal'
import { ShareLink } from '../components/ShareLink'
import { Sidebar } from '../components/Sidebar'
import { SignaturePad } from '../components/SignaturePad'
import { useContracts } from '../hooks/useContracts'
import { getProfile } from '../services/api'
import { downloadContractPdf } from '../services/pdf'
import type { Contract, SignRole } from '../types'
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
  const [quem, setQuem] = useState<SignRole>('prestador')
  const [nomePrestador, setNomePrestador] = useState('')
  const [assinante, setAssinante] = useState('')
  const [desenho, setDesenho] = useState<string | null>(null)
  const [assinandoSalvando, setAssinandoSalvando] = useState(false)
  const [erroAssinatura, setErroAssinatura] = useState<string | null>(null)
  const [baixandoPdf, setBaixandoPdf] = useState(false)

  // useEffect: carrega o nome do prestador (para sugerir na assinatura)
  useEffect(() => {
    getProfile()
      .then((perfil) => setNomePrestador(perfil.nome))
      .catch(() => undefined)
  }, [])

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

  /** Abre o modal de assinatura — por padrão, como prestador (você). */
  function openSign(contract: Contract) {
    setAssinando(contract)
    setQuem('prestador')
    setAssinante(nomePrestador)
    setDesenho(null)
    setErroAssinatura(null)

    // perfil ainda não carregado: busca agora para sugerir o nome certo
    if (!nomePrestador) {
      getProfile()
        .then((perfil) => {
          setNomePrestador(perfil.nome)
          setAssinante(perfil.nome)
        })
        .catch(() => undefined)
    }
  }

  /** Troca a parte que está assinando e sugere o nome dela. */
  function handleRoleChange(event: ChangeEvent<HTMLSelectElement>) {
    const novo = event.target.value as SignRole
    setQuem(novo)
    setAssinante(novo === 'prestador' ? nomePrestador : assinando?.cliente.nome ?? '')
    setDesenho(null)
    setErroAssinatura(null)
  }

  /** Assina: grava quem assinou + data/hora automática na coluna da parte. */
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
        quem,
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

  /** Baixa o PDF do contrato (com assinatura e carimbo, quando houver). */
  async function handleDownloadPdf() {
    if (!selected) return
    setBaixandoPdf(true)
    try {
      await downloadContractPdf(selected)
    } finally {
      setBaixandoPdf(false)
    }
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
              !(selected.assinaturaPrestador && selected.assinaturaContratante) && (
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
              <span>Assinaturas (prestador + contratante)</span>
              <div className="contract-detail__sigs">
                <div className="contract-detail__sig">
                  <strong>Prestador — você</strong>
                  {selected.assinaturaPrestador ? (
                    <div className="contract-detail__signed">
                      {selected.assinaturaPrestador.imagem && (
                        <img
                          src={selected.assinaturaPrestador.imagem}
                          alt={`Assinatura de ${selected.assinaturaPrestador.por}`}
                          className="contract-detail__signature-img"
                        />
                      )}
                      <p>
                        Assinado por <strong>{selected.assinaturaPrestador.por}</strong>{' '}
                        em <strong>{formatStamp(selected.assinaturaPrestador.em)}</strong>
                      </p>
                    </div>
                  ) : (
                    <p className="contract-detail__unsigned">
                      Aguardando você assinar — use o botão “Assinar contrato”.
                    </p>
                  )}
                </div>

                <div className="contract-detail__sig">
                  <strong>Contratante — {selected.cliente.nome}</strong>
                  {selected.assinaturaContratante ? (
                    <div className="contract-detail__signed">
                      {selected.assinaturaContratante.imagem && (
                        <img
                          src={selected.assinaturaContratante.imagem}
                          alt={`Assinatura de ${selected.assinaturaContratante.por}`}
                          className="contract-detail__signature-img"
                        />
                      )}
                      <p>
                        Assinado por{' '}
                        <strong>{selected.assinaturaContratante.por}</strong> em{' '}
                        <strong>{formatStamp(selected.assinaturaContratante.em)}</strong>
                      </p>
                    </div>
                  ) : (
                    <p className="contract-detail__unsigned">
                      Aguardando o cliente — envie o link abaixo ou assine presencialmente
                      pelo botão “Assinar contrato”.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="contract-detail__actions">
              <Button
                variant="secondary"
                onClick={() => void handleDownloadPdf()}
                type="button"
                disabled={baixandoPdf}
              >
                {baixandoPdf ? 'Gerando PDF…' : '⬇️ Baixar PDF'}
              </Button>
            </div>

            <ShareLink contractId={selected.id} titulo={selected.titulo} />
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
            Contrato <strong>{assinando?.titulo}</strong> — escolha quem está assinando.
            O app grava automaticamente <strong>quem assinou</strong> e a{' '}
            <strong>data/hora</strong> no espaço da parte; o contrato fica{' '}
            <strong>Assinado</strong> quando as duas assinaturas estiverem registradas.
          </p>

          <label className="field__label" htmlFor="quem-assina">
            Assinar como
          </label>
          <select
            id="quem-assina"
            className="field__control"
            value={quem}
            onChange={handleRoleChange}
          >
            <option value="prestador">Prestador — você (freelancer)</option>
            <option value="contratante">
              Contratante — {assinando?.cliente.nome ?? 'cliente'}
            </option>
          </select>

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
