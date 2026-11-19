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
import { ShareLink } from '../components/ShareLink'
import { Sidebar } from '../components/Sidebar'
import { useClients } from '../hooks/useClients'
import { useContracts } from '../hooks/useContracts'
import { useConsultaCnpjCep } from '../hooks/useConsultaCnpjCep'
import { getContract, getContracts, getProfile } from '../services/api'
import { apenasDigitos, formatarCEP } from '../services/brasil'
import { CLAUSULAS_OPCIONAIS, NICHOS, nichoLabel } from '../services/clausulas'
import { CLAUSULAS_VAZIAS, MODELOS } from '../services/modelos'
import { downloadContractPdf } from '../services/pdf'
import type { Clausulas, Contract, FreelancerProfile } from '../types'

interface WizardState {
  titulo: string
  clienteNome: string
  clienteEmail: string
  clienteCpf: string
  clienteCep: string
  clienteEndereco: string
  descricao: string
  entregaveis: string
  pagamento: string
  valor: string
  dataInicio: string
  prazoDias: string
  nicho: string
  clausulas: Clausulas
}

const initialForm: WizardState = {
  titulo: '',
  clienteNome: '',
  clienteEmail: '',
  clienteCpf: '',
  clienteCep: '',
  clienteEndereco: '',
  descricao: '',
  entregaveis: '',
  pagamento: '',
  valor: '',
  dataInicio: '',
  prazoDias: '30',
  nicho: '',
  clausulas: CLAUSULAS_VAZIAS,
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

  // useState: controla o wizard em 3 etapas e todos os campos do formulário
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<WizardState>(initialForm)
  const [errors, setErrors] = useState<Partial<Record<keyof WizardState, string>>>({})
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState<Contract | null>(null)
  const [perfilLocal, setPerfilLocal] = useState<FreelancerProfile | null>(null)
  const [erroPerfil, setErroPerfil] = useState(false)
  const [erroAcao, setErroAcao] = useState('')

  // useState: contrato sendo editado (null = criando novo)
  const [editing, setEditing] = useState<Contract | null>(null)
  const [naoEncontrado, setNaoEncontrado] = useState(false)
  const [baixandoPdf, setBaixandoPdf] = useState(false)
  const [clienteSalvoId, setClienteSalvoId] = useState('')
  const [modeloId, setModeloId] = useState('')

  // useRef: aponta para a div do contrato gerado (usada na impressão/exportação em PDF)
  const previewRef = useRef<HTMLDivElement>(null)

  // useEffect: carrega os termos padrão do freelancer para compor a prévia
  useEffect(() => {
    let ativo = true
    setErroPerfil(false)
    getProfile()
      .then((dados) => {
        if (!ativo) return
        setPerfilLocal(dados)
        const padroes = dados.padroes
        if (!routeId && padroes) {
          setForm((current) => ({
            ...current,
            nicho: current.nicho || padroes.nicho,
            prazoDias: padroes.prazoDias > 0 && current.prazoDias === initialForm.prazoDias
              ? String(padroes.prazoDias) : current.prazoDias,
            valor: current.valor || (padroes.valor > 0 ? String(padroes.valor) : ''),
            pagamento: current.pagamento || padroes.pagamento,
            clausulas: current.clausulas === initialForm.clausulas ? padroes.clausulas : current.clausulas,
          }))
        }
      })
      .catch(() => {
        if (ativo) setErroPerfil(true)
      })
    return () => {
      ativo = false
    }
  }, [routeId])

  // useEffect: em modo edição, carrega o contrato da URL e preenche o formulário
  useEffect(() => {
    setNaoEncontrado(false)
    setStep(1)
    setForm(initialForm)
    setModeloId('')
    setClienteSalvoId('')
    if (!routeId) {
      setEditing(null)
      return
    }

    let ativo = true
    getContracts()
      .then((lista) => {
        if (!lista.some((contract) => contract.id === routeId)) throw new Error('Contrato não encontrado.')
        return getContract(routeId)
      })
      .then((found) => {
        if (!ativo) return
        setEditing(found)
        setForm({
          titulo: found.titulo,
          clienteNome: found.cliente.nome,
          clienteEmail: found.cliente.email,
          clienteCpf: found.cliente.cpfCnpj,
          clienteCep: '',
          clienteEndereco: found.cliente.endereco,
          descricao: found.descricao,
          entregaveis: found.entregaveis ?? '',
          pagamento: found.pagamento ?? '',
          valor: String(found.valor),
          dataInicio: found.dataInicio,
          prazoDias: String(found.prazoDias),
          nicho: found.nicho ?? '',
          clausulas: { ...CLAUSULAS_VAZIAS, ...found.clausulas },
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

  const freelancer: FreelancerProfile = editing?.prestador ?? perfilLocal ?? {
    nome: '',
    email: '',
    telefone: '',
    profissao: '',
    pix: '',
    termosPadrao: '',
  }
  const precisaAssinarNovamente = Boolean(editing?.assinaturaPrestador || editing?.assinaturaContratante)
  const statusNovo = precisaAssinarNovamente ? 'pendente' : editing?.status ?? 'pendente'

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
    entregaveis: form.entregaveis,
    pagamento: form.pagamento,
    status: editing?.status ?? 'rascunho',
    criadoEm: editing?.criadoEm ?? new Date().toISOString(),
    nicho: form.nicho,
    clausulas: form.clausulas,
  }

  function update(field: keyof WizardState, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    // editar manualmente os dados do cliente "desvincula" o cliente salvo escolhido
    if (field.startsWith('cliente')) setClienteSalvoId('')
  }

  function aplicarModelo(value: string) {
    const modelo = MODELOS.find((item) => item.value === value)
    if (!modelo) return
    const anterior = MODELOS.find((item) => item.value === modeloId)
    const usarCampo = (atual: string, antigo: string | undefined, novo: string) =>
      !atual.trim() || atual === antigo ? novo : atual
    setForm((current) => {
      const usarPrazoModelo = !perfilLocal?.padroes?.prazoDias &&
        (current.prazoDias === initialForm.prazoDias || current.prazoDias === String(anterior?.prazoDias))
      return {
        ...current,
        titulo: usarCampo(current.titulo, anterior?.label, modelo.label),
        nicho: modelo.value,
        descricao: usarCampo(current.descricao, anterior?.descricao, modelo.descricao),
        entregaveis: usarCampo(current.entregaveis, anterior?.entregaveis, modelo.entregaveis),
        prazoDias: usarPrazoModelo ? String(modelo.prazoDias) : current.prazoDias,
      }
    })
    setModeloId(value)
    setErrors({})
  }

  // CNPJ/CEP: preenchimento automático pela BrasilAPI — só mexe em campos
  // vazios (via setForm funcional), então nunca sobrescreve o que o usuário
  // digitou; o botão "Buscar endereço" substitui de propósito.
  const consulta = useConsultaCnpjCep({
    cpfCnpj: form.clienteCpf,
    cep: form.clienteCep,
    onEmpresa: (empresa) => {
      setForm((current) => ({
        ...current,
        clienteNome: current.clienteNome.trim() || empresa.nome,
        clienteEndereco: current.clienteEndereco.trim() || empresa.endereco,
        clienteCep: current.clienteCep || formatarCEP(empresa.cep),
      }))
    },
    onEndereco: (endereco, sobrescrever) => {
      setForm((current) =>
        sobrescrever || !current.clienteEndereco.trim()
          ? { ...current, clienteEndereco: endereco }
          : current,
      )
    },
  })

  /** Liga/desliga uma cláusula opcional do contrato. */
  function toggleClausula(chave: keyof Clausulas) {
    setForm((current) => ({
      ...current,
      clausulas: { ...current.clausulas, [chave]: !current.clausulas[chave] },
    }))
  }

  /** Preenche os campos do cliente ao escolher um contato já salvo. */
  function handleSelectClient(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value
    if (!value) return

    const found = clients.find((c) => c.id === value)
    if (!found) return

    setClienteSalvoId(value)
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
      const valor = Number(form.valor.replace(',', '.'))
      if (!Number.isFinite(valor) || valor <= 0)
        found.valor = 'Informe um valor válido.'
      if (!form.dataInicio) found.dataInicio = 'Escolha a data de início.'
      const prazo = Number(form.prazoDias)
      if (!Number.isInteger(prazo) || prazo < 1 || prazo > 3650)
        found.prazoDias = 'Informe um número inteiro entre 1 e 3650 dias.'
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

  /** Baixa o contrato em PDF (arquivo real, com dados preenchidos). */
  async function handleDownloadPdf(contract: Contract) {
    setBaixandoPdf(true)
    setErroAcao('')
    try {
      await downloadContractPdf(contract)
    } catch (error) {
      if (import.meta.env.DEV) console.error('Falha no PDF do contrato', error)
      setErroAcao('Não foi possível baixar o PDF. Tente novamente.')
    } finally {
      setBaixandoPdf(false)
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (step !== 3 || salvando || (!perfilLocal && !editing?.prestador)) return
    setErroAcao('')
    if (!validate(1)) { setStep(1); return }
    if (!validate(2)) { setStep(2); return }

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
      entregaveis: form.entregaveis.trim(),
      pagamento: form.pagamento.trim(),
      status: statusNovo,
      assinaturaPrestador: undefined,
      assinaturaContratante: undefined,
      nicho: form.nicho,
      clausulas: form.clausulas,
    }

    setSalvando(true)
    try {
      const saved = editing
        ? await editContract(editing.id, payload)
        : await addContract(payload)
      setSucesso(saved)
      void reloadClients()
    } catch {
      setErroAcao('Não foi possível salvar o contrato. Tente novamente.')
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

  // Resumo das cláusulas escolhidas para a etapa de revisão
  const clausulasAtivas = CLAUSULAS_OPCIONAIS.filter(
    (item) => form.clausulas[item.chave],
  )
  const resumoClausulas =
    [nichoLabel(form.nicho), ...clausulasAtivas.map((item) => item.titulo)]
      .filter(Boolean)
      .join(' · ') || 'Padrão do contrato'

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
                aria-current={item.n === step ? 'step' : undefined}
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

                  {!routeId && (
                    <div className="wizard-template">
                      <Select label="Começar com um modelo" name="modelo" value={modeloId}
                        options={[{ value: '', label: 'Escolher um serviço' }, ...MODELOS]}
                        onChange={(event) => aplicarModelo(event.target.value)}
                        hint="Sugere título, escopo e entregáveis editáveis e define a área do serviço." />
                    </div>
                  )}

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
                    value={clienteSalvoId}
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
                      hint={
                        consulta.dicaCnpj?.texto ??
                        (apenasDigitos(form.clienteCpf).length === 11
                          ? 'CPF não tem consulta pública — digite o CNPJ para preencher os dados automaticamente.'
                          : undefined)
                      }
                    />
                  </div>
                  <div className="field">
                    <label className="field__label" htmlFor="clienteCep">
                      CEP do cliente
                    </label>
                    <div className="lookup">
                      <input
                        id="clienteCep"
                        className="field__control"
                        placeholder="00000-000"
                        inputMode="numeric"
                        value={form.clienteCep}
                        onChange={(event) => update('clienteCep', event.target.value)}
                      />
                      <Button
                        variant="secondary"
                        type="button"
                        disabled={consulta.buscandoCep}
                        onClick={() => void consulta.consultarCepAgora(form.clienteCep)}
                      >
                        {consulta.buscandoCep ? 'Buscando…' : '🔍 Buscar endereço'}
                      </Button>
                    </div>
                    {consulta.dicaCep &&
                      (consulta.dicaCep.tipo === 'erro' ? (
                        <span className="field__error">{consulta.dicaCep.texto}</span>
                      ) : (
                        <span className="field__hint">{consulta.dicaCep.texto}</span>
                      ))}
                  </div>
                  <Input
                    label="Endereço do cliente"
                    name="clienteEndereco"
                    placeholder="Rua, número — cidade/UF"
                    value={form.clienteEndereco}
                    onChange={(event) => update('clienteEndereco', event.target.value)}
                    hint="Preenchido sozinho pelo CNPJ ou pelo CEP (BrasilAPI)."
                  />
                </section>
              )}

              {step === 2 && (
                <section className="panel">
                  <h2>Escopo, valores e cláusulas</h2>

                  <Select
                    label="Sua área de atuação"
                    name="nicho"
                    options={[
                      { value: '', label: '— Contrato genérico (sem nicho) —' },
                      ...NICHOS.map((item) => ({ value: item.value, label: item.label })),
                    ]}
                    value={form.nicho}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, nicho: event.target.value }))
                    }
                    hint={
                      nichoLabel(form.nicho)
                        ? `✓ Cláusulas-base de ${nichoLabel(form.nicho)} já entram na prévia.`
                        : 'Escolha sua área para carregar cláusulas-base específicas do seu ofício.'
                    }
                  />

                  <Textarea
                    label="Descrição do serviço"
                    name="descricao"
                    rows={5}
                    placeholder="Descreva o que será entregue, com detalhes do escopo..."
                    value={form.descricao}
                    onChange={(event) => update('descricao', event.target.value)}
                    error={errors.descricao}
                  />
                  <Textarea label="Entregáveis" name="entregaveis" rows={3} maxLength={3000}
                    placeholder="Arquivos, formatos e itens incluídos na entrega"
                    value={form.entregaveis} onChange={(event) => update('entregaveis', event.target.value)} />
                  <Textarea label="Condições de pagamento" name="pagamento" rows={3} maxLength={1600}
                    placeholder="Parcelas, vencimentos e forma de pagamento"
                    value={form.pagamento} onChange={(event) => update('pagamento', event.target.value)} />
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
                      max={3650}
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

                  <div className="toggles">
                    <span className="toggles__label">Cláusulas opcionais</span>
                    {CLAUSULAS_OPCIONAIS.map((opcao) => (
                      <label
                        key={opcao.chave}
                        className={`toggle ${form.clausulas[opcao.chave] ? 'is-on' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={form.clausulas[opcao.chave]}
                          onChange={() => toggleClausula(opcao.chave)}
                        />
                        <span className="toggle__track" aria-hidden="true">
                          <span className="toggle__thumb" />
                        </span>
                        <span className="toggle__text">
                          <strong>{opcao.titulo}</strong>
                          <small>{opcao.resumo}</small>
                        </span>
                      </label>
                    ))}
                  </div>
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
                    <li>
                      <span>Cláusulas</span>
                      <strong>{resumoClausulas}</strong>
                    </li>
                  </ul>

                  <p className="panel__note">
                    {editing ? (
                      <>
                        As alterações serão salvas no contrato <strong>#{editing.id}</strong>.
                        {precisaAssinarNovamente && ' Depois de salvar, o contrato precisará ser assinado novamente.'}
                      </>
                    ) : (
                      <>
                        Ao gerar, o contrato será salvo com status{' '}
                        <strong>Pendente</strong>, o cliente ficará na sua agenda e o
                        contrato aparecerá no dashboard.
                      </>
                    )}
                  </p>

                  <p className="disclaimer">
                    ⚠️ Aviso legal: este modelo é educativo e informativo —{' '}
                    <strong>não substitui a revisão de um advogado</strong> para casos
                    complexos. Em caso de dúvida jurídica, consulte um profissional.
                  </p>

                  <div className="wizard__actions">
                    <Button variant="ghost" onClick={goBack} type="button">Voltar</Button>
                    <Button variant="secondary" type="button" disabled={baixandoPdf || (!perfilLocal && !editing?.prestador)}
                      onClick={() => void handleDownloadPdf({ ...previewContract, id: '', prestador: freelancer })}>
                      {baixandoPdf ? 'Gerando…' : 'Baixar prévia PDF'}
                    </Button>
                    <Button type="submit" disabled={salvando || (!perfilLocal && !editing?.prestador)}>
                      {salvando
                        ? 'Salvando…'
                        : editing
                          ? 'Salvar alterações ✓'
                          : 'Gerar contrato ✓'}
                    </Button>
                  </div>
                  {erroPerfil && !editing?.prestador && <p className="alert alert--error" role="alert">Não foi possível carregar o perfil. Recarregue a página para gerar o contrato.</p>}
                  {!sucesso && erroAcao && <p className="alert alert--error" role="alert">{erroAcao}</p>}
                </section>
              )}

              {step < 3 && (
                <div className="wizard__actions">
                  <Button variant="ghost" onClick={goBack} type="button" disabled={step === 1}>
                    Voltar
                  </Button>
                  <Button onClick={goNext} type="button" disabled={Boolean(routeId && editing?.id !== routeId)}>
                    Continuar
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
        onClose={() => { setSucesso(null); setErroAcao('') }}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => { if (sucesso) void handleDownloadPdf(sucesso) }}
              type="button"
              disabled={baixandoPdf}
            >
              {baixandoPdf ? 'Gerando…' : 'Baixar PDF'}
            </Button>
            <Button variant="secondary" onClick={handleExport} type="button">
              Imprimir
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
        {erroAcao && <p className="alert alert--error" role="alert">{erroAcao}</p>}
        <p>
          O contrato <strong>{sucesso?.titulo}</strong> ({sucesso?.id}) foi{' '}
          {editing ? 'atualizado' : 'salvo'} para{' '}
          <strong>{sucesso?.cliente.nome}</strong>. Os dados do cliente ficaram salvos na
          sua agenda.
        </p>
        {sucesso && (
          <ShareLink
            contractId={sucesso.id}
            titulo={sucesso.titulo}
            valor={sucesso.valor}
            prazoDias={sucesso.prazoDias}
            cliente={sucesso.cliente.nome}
          />
        )}
      </Modal>

      <Footer />
    </div>
  )
}
