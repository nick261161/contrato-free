import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { ContractPreview } from '../components/ContractPreview'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { Input, Select, Textarea } from '../components/Input'
import { Modal } from '../components/Modal'
import { Sidebar } from '../components/Sidebar'
import { useClients } from '../hooks/useClients'
import { useContracts } from '../hooks/useContracts'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { getContracts, getProfile } from '../services/api'
import type { Contract, FreelancerProfile } from '../types'

interface WizardState {
  titulo: string
  clienteNome: string
  clienteEmail: string
  clienteCpf: string
  clienteEndereco: string
  descricao: string
  valor: string
  dataInicio: string
  prazoDias: string
}

const initialForm: WizardState = {
  titulo: '',
  clienteNome: '',
  clienteEmail: '',
  clienteCpf: '',
  clienteEndereco: '',
  descricao: '',
  valor: '',
  dataInicio: '',
  prazoDias: '30',
}

const steps = [
  { n: 1, title: 'Dados do cliente', hint: 'Quem contrata' },
  { n: 2, title: 'Escopo e valores', hint: 'O que será entregue' },
  { n: 3, title: 'Revisão', hint: 'Confirme e gere' },
]

export function NovoContrato() {
  const navigate = useNavigate()
  const { id: routeId } = useParams<{ id: string }>()

  const { addContract, editContract } = useContracts()
  const { clients, reload: reloadClients } = useClients()
  const [profile] = useLocalStorage<FreelancerProfile | null>('contratofree.profile', null)

  // useState: controla o wizard em 3 etapas e todos os campos do formulário
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<WizardState>(initialForm)
  const [errors, setErrors] = useState<Partial<Record<keyof WizardState, string>>>({})
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState<Contract | null>(null)
  const [perfilLocal, setPerfilLocal] = useState<FreelancerProfile | null>(null)

  // useState: contrato sendo editado (null = criando novo)
  const [editing, setEditing] = useState<Contract | null>(null)
  const [naoEncontrado, setNaoEncontrado] = useState(false)

  // useRef: aponta para a div do contrato gerado (usada na impressão/exportação em PDF)
  const previewRef = useRef<HTMLDivElement>(null)

  // useEffect: carrega os termos padrão do freelancer para compor a prévia
  useEffect(() => {
    let ativo = true
    getProfile()
      .then((dados) => {
        if (ativo) setPerfilLocal(dados)
      })
      .catch(() => {
        if (ativo) setPerfilLocal(profile)
      })
    return () => {
      ativo = false
    }
  }, [profile])

  // useEffect: em modo edição, carrega o contrato da URL e preenche o formulário
  useEffect(() => {
    if (!routeId) {
      setEditing(null)
      return
    }

    let ativo = true
    getContracts()
      .then((lista) => {
        if (!ativo) return
        const found = lista.find((c) => c.id === routeId)
        if (!found) {
          setNaoEncontrado(true)
          return
        }
        setEditing(found)
        setForm({
          titulo: found.titulo,
          clienteNome: found.cliente.nome,
          clienteEmail: found.cliente.email,
          clienteCpf: found.cliente.cpfCnpj,
          clienteEndereco: found.cliente.endereco,
          descricao: found.descricao,
          valor: String(found.valor),
          dataInicio: found.dataInicio,
          prazoDias: String(found.prazoDias),
        })
        setErrors({})
      })
      .catch(() => {
        if (ativo) setNaoEncontrado(true)
      })

    return () => {
      ativo = false
    }
  }, [routeId])

  const freelancer: FreelancerProfile = perfilLocal ?? {
    nome: '',
    email: '',
    telefone: '',
    profissao: '',
    pix: '',
    termosPadrao: '',
  }

  const previewContract: Contract = {
    id: editing?.id ?? '',
    titulo: form.titulo,
    cliente: {
      nome: form.clienteNome,
      email: form.clienteEmail,
      cpfCnpj: form.clienteCpf,
      endereco: form.clienteEndereco,
    },
    valor: Number(form.valor.replace(',', '.')) || 0,
    dataInicio: form.dataInicio,
    prazoDias: Number(form.prazoDias) || 0,
    descricao: form.descricao,
    status: editing?.status ?? 'rascunho',
    criadoEm: editing?.criadoEm ?? new Date().toISOString(),
    assinatura: editing?.assinatura,
  }

  function update(field: keyof WizardState, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  /** Preenche os campos do cliente ao escolher um contato já salvo. */
  function handleSelectClient(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value
    if (!value) return

    const found = clients.find((c) => c.id === value)
    if (!found) return

    setForm((current) => ({
      ...current,
      clienteNome: found.nome,
      clienteEmail: found.email,
      clienteCpf: found.cpfCnpj,
      clienteEndereco: found.endereco,
    }))
    setErrors({})
  }

  function validate(currentStep: number): boolean {
    const found: Partial<Record<keyof WizardState, string>> = {}

    if (currentStep === 1) {
      if (!form.titulo.trim()) found.titulo = 'Informe um título para o contrato.'
      if (!form.clienteNome.trim()) found.clienteNome = 'Informe o nome do cliente.'
      if (!form.clienteEmail.includes('@')) found.clienteEmail = 'E-mail inválido.'
    }

    if (currentStep === 2) {
      if (!form.descricao.trim()) found.descricao = 'Descreva o escopo do serviço.'
      if (!form.valor.trim() || Number(form.valor.replace(',', '.')) <= 0)
        found.valor = 'Informe um valor válido.'
      if (!form.dataInicio) found.dataInicio = 'Escolha a data de início.'
      if (!form.prazoDias || Number(form.prazoDias) <= 0)
        found.prazoDias = 'Prazo deve ser maior que zero.'
    }

    setErrors(found)
    return Object.keys(found).length === 0
  }

  function goNext() {
    if (validate(step)) setStep((current) => Math.min(current + 1, 3))
  }

  function goBack() {
    setStep((current) => Math.max(current - 1, 1))
  }

  // useRef: gera o PDF/impressão a partir do elemento do contrato na tela
  function handleExport() {
    const node = previewRef.current
    if (!node) return
    const tituloAnterior = document.title
    document.title = `contrato-${form.titulo || 'sem-titulo'}`
    window.print()
    document.title = tituloAnterior
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!validate(2)) return

    const payload = {
      titulo: form.titulo.trim(),
      cliente: {
        nome: form.clienteNome.trim(),
        email: form.clienteEmail.trim(),
        cpfCnpj: form.clienteCpf.trim(),
        endereco: form.clienteEndereco.trim(),
      },
      valor: Number(form.valor.replace(',', '.')),
      dataInicio: form.dataInicio,
      prazoDias: Number(form.prazoDias),
      descricao: form.descricao.trim(),
      status: editing ? editing.status : 'pendente',
    }

    setSalvando(true)
    try {
      const saved = editing
        ? await editContract(editing.id, payload)
        : await addContract(payload)
      setSucesso(saved)
      void reloadClients()
    } catch {
      setErrors({ titulo: 'Não foi possível salvar o contrato. Tente novamente.' })
    } finally {
      setSalvando(false)
    }
  }

  if (naoEncontrado) {
    return (
      <div className="page">
        <Header />
        <div className="container app-layout">
          <Sidebar />
          <main className="app-main">
            <div className="empty">
              <p>Contrato não encontrado. Ele pode ter sido excluído.</p>
              <Link to="/dashboard" className="btn btn--primary">
                Voltar ao dashboard
              </Link>
            </div>
          </main>
        </div>
        <Footer />
      </div>
    )
  }

  const clientOptions = [
    { value: '', label: '— Preencher manualmente —' },
    ...clients.map((c) => ({ value: c.id, label: `${c.nome} (${c.email})` })),
  ]

  return (
    <div className="page">
      <Header />

      <div className="container app-layout">
        <Sidebar />

        <main className="app-main">
          <div className="app-main__head">
            <div>
              <span className="app-main__eyebrow">
                {editing ? `Editando #${editing.id}` : 'Assistente de contratos'}
              </span>
              <h1>{editing ? 'Editar contrato' : 'Novo contrato'}</h1>
            </div>
            <Link to="/dashboard" className="btn btn--ghost">
              Voltar ao painel
            </Link>
          </div>

          <ol className="wizard-steps">
            {steps.map((item) => (
              <li
                key={item.n}
                className={`wizard-steps__item ${
                  item.n === step ? 'is-active' : item.n < step ? 'is-done' : ''
                }`}
              >
                <span className="wizard-steps__number">{item.n < step ? '✓' : item.n}</span>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.hint}</small>
                </div>
              </li>
            ))}
          </ol>

          <div className="wizard">
            <form className="wizard__form" onSubmit={handleSubmit} noValidate>
              {step === 1 && (
                <section className="panel">
                  <h2>Dados do cliente</h2>

                  <Input
                    label="Título do contrato"
                    name="titulo"
                    placeholder="Ex.: Desenvolvimento de site"
                    value={form.titulo}
                    onChange={(event) => update('titulo', event.target.value)}
                    error={errors.titulo}
                  />

                  <Select
                    label="Usar cliente já salvo"
                    name="clienteSalvo"
                    options={clientOptions}
                    onChange={handleSelectClient}
                    value=""
                    hint={
                      clients.length === 0
                        ? 'Nenhum cliente salvo ainda — um cliente é salvo automaticamente ao gerar contratos.'
                        : 'Escolha um contato para preencher os campos abaixo automaticamente.'
                    }
                  />

                  <Input
                    label="Nome do cliente / empresa"
                    name="clienteNome"
                    placeholder="Ex.: Padaria Estrela"
                    value={form.clienteNome}
                    onChange={(event) => update('clienteNome', event.target.value)}
                    error={errors.clienteNome}
                  />
                  <div className="grid-2">
                    <Input
                      label="E-mail do cliente"
                      type="email"
                      name="clienteEmail"
                      placeholder="contato@empresa.com"
                      value={form.clienteEmail}
                      onChange={(event) => update('clienteEmail', event.target.value)}
                      error={errors.clienteEmail}
                    />
                    <Input
                      label="CPF / CNPJ"
                      name="clienteCpf"
                      placeholder="00.000.000/0000-00"
                      value={form.clienteCpf}
                      onChange={(event) => update('clienteCpf', event.target.value)}
                    />
                  </div>
                  <Input
                    label="Endereço do cliente"
                    name="clienteEndereco"
                    placeholder="Rua, número — cidade/UF"
                    value={form.clienteEndereco}
                    onChange={(event) => update('clienteEndereco', event.target.value)}
                  />
                </section>
              )}

              {step === 2 && (
                <section className="panel">
                  <h2>Escopo e valores</h2>
                  <Textarea
                    label="Descrição do serviço"
                    name="descricao"
                    rows={5}
                    placeholder="Descreva o que será entregue, com detalhes do escopo..."
                    value={form.descricao}
                    onChange={(event) => update('descricao', event.target.value)}
                    error={errors.descricao}
                  />
                  <div className="grid-2">
                    <Input
                      label="Valor (R$)"
                      name="valor"
                      inputMode="decimal"
                      placeholder="3500"
                      value={form.valor}
                      onChange={(event) => update('valor', event.target.value)}
                      error={errors.valor}
                    />
                    <Input
                      label="Prazo (dias)"
                      type="number"
                      name="prazoDias"
                      min={1}
                      value={form.prazoDias}
                      onChange={(event) => update('prazoDias', event.target.value)}
                      error={errors.prazoDias}
                    />
                  </div>
                  <Input
                    label="Data de início"
                    type="date"
                    name="dataInicio"
                    value={form.dataInicio}
                    onChange={(event) => update('dataInicio', event.target.value)}
                    error={errors.dataInicio}
                  />
                </section>
              )}

              {step === 3 && (
                <section className="panel">
                  <h2>{editing ? 'Revisão e salvamento' : 'Revisão e geração'}</h2>
                  <ul className="review">
                    <li>
                      <span>Contrato</span>
                      <strong>{form.titulo || '—'}</strong>
                    </li>
                    <li>
                      <span>Cliente</span>
                      <strong>{form.clienteNome || '—'} · {form.clienteEmail || '—'}</strong>
                    </li>
                    <li>
                      <span>Valor / prazo</span>
                      <strong>R$ {form.valor || '0'} · {form.prazoDias} dias</strong>
                    </li>
                    <li>
                      <span>Início</span>
                      <strong>{form.dataInicio || '—'}</strong>
                    </li>
                  </ul>

                  <p className="panel__note">
                    {editing ? (
                      <>
                        As alterações serão salvas no contrato <strong>#{editing.id}</strong>,
                        mantendo o status atual (<strong>{editing.status}</strong>).
                      </>
                    ) : (
                      <>
                        Ao gerar, o contrato será salvo com status{' '}
                        <strong>Pendente</strong>, o cliente ficará na sua agenda e o
                        contrato aparecerá no dashboard.
                      </>
                    )}
                  </p>

                  <div className="wizard__actions">
                    <Button variant="secondary" onClick={handleExport} type="button">
                      🖨️ Imprimir / Salvar PDF
                    </Button>
                    <Button type="submit" disabled={salvando}>
                      {salvando
                        ? 'Salvando…'
                        : editing
                          ? 'Salvar alterações ✓'
                          : 'Gerar contrato ✓'}
                    </Button>
                  </div>
                </section>
              )}

              {step < 3 && (
                <div className="wizard__actions">
                  <Button variant="ghost" onClick={goBack} type="button" disabled={step === 1}>
                    ← Voltar
                  </Button>
                  <Button onClick={goNext} type="button">
                    Continuar →
                  </Button>
                </div>
              )}
            </form>

            <aside className="wizard__preview">
              <span className="wizard__preview-label">Prévia em tempo real</span>
              <ContractPreview contract={previewContract} profile={freelancer} innerRef={previewRef} />
            </aside>
          </div>
        </main>
      </div>

      <Modal
        open={sucesso !== null}
        title={editing ? 'Contrato atualizado! ✅' : 'Contrato gerado com sucesso! 🎉'}
        onClose={() => setSucesso(null)}
        footer={
          <>
            <Button variant="secondary" onClick={handleExport} type="button">
              Imprimir / PDF
            </Button>
            <Button
              onClick={() => {
                const wasEditing = Boolean(editing)
                setSucesso(null)
                if (!wasEditing) {
                  setForm(initialForm)
                  setStep(1)
                }
                navigate('/dashboard')
              }}
              type="button"
            >
              Ir para o dashboard
            </Button>
          </>
        }
      >
        <p>
          O contrato <strong>{sucesso?.titulo}</strong> ({sucesso?.id}) foi{' '}
          {editing ? 'atualizado' : 'salvo'} para{' '}
          <strong>{sucesso?.cliente.nome}</strong>. Os dados do cliente ficaram salvos na
          sua agenda.
        </p>
      </Modal>

      <Footer />
    </div>
  )
}
