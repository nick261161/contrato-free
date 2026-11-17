import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/Button'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { Input } from '../components/Input'
import { Modal } from '../components/Modal'
import { Sidebar } from '../components/Sidebar'
import { Tilt } from '../components/Tilt'
import { useClients } from '../hooks/useClients'
import { useContracts } from '../hooks/useContracts'
import { useConsultaCnpjCep } from '../hooks/useConsultaCnpjCep'
import { formatarCEP } from '../services/brasil'
import type { Client, SavedClient } from '../types'

const emptyForm: Client = {
  nome: '',
  email: '',
  cpfCnpj: '',
  endereco: '',
}

export function Clientes() {
  const { clients, loading, error, reload, upsert, edit, remove } = useClients()
  const { contracts } = useContracts()

  // useState: formulário da agenda de clientes + estados de modal
  const [form, setForm] = useState<Client>(emptyForm)
  const [editing, setEditing] = useState<SavedClient | null>(null)
  const [deleting, setDeleting] = useState<SavedClient | null>(null)
  const [open, setOpen] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof Client, string>>>({})
  const [saving, setSaving] = useState(false)
  const [removendo, setRemovendo] = useState(false)
  // CEP é auxiliar de preenchimento (não é coluna do cliente): só existe no modal
  const [cep, setCep] = useState('')

  // CNPJ/CEP automáticos pela BrasilAPI — só preenchem campos vazios
  const consulta = useConsultaCnpjCep({
    cpfCnpj: form.cpfCnpj,
    cep,
    onEmpresa: (empresa) => {
      setForm((current) => ({
        ...current,
        nome: current.nome.trim() || empresa.nome,
        endereco: current.endereco.trim() || empresa.endereco,
      }))
      setCep((current) => current || formatarCEP(empresa.cep))
    },
    onEndereco: (endereco, sobrescrever) => {
      setForm((current) =>
        sobrescrever || !current.endereco.trim()
          ? { ...current, endereco }
          : current,
      )
    },
  })

  function update(field: keyof Client, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  function openNew() {
    setEditing(null)
    setForm(emptyForm)
    setCep('')
    setErrors({})
    setOpen(true)
  }

  function openEdit(client: SavedClient) {
    setEditing(client)
    setForm({
      nome: client.nome,
      email: client.email,
      cpfCnpj: client.cpfCnpj,
      endereco: client.endereco,
    })
    setCep('')
    setErrors({})
    setOpen(true)
  }

  async function save() {
    const found: Partial<Record<keyof Client, string>> = {}
    if (!form.nome.trim()) found.nome = 'Informe o nome do cliente.'
    if (!form.email.includes('@')) found.email = 'E-mail inválido.'
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSaving(true)
    try {
      if (editing) {
        await edit(editing.id, form)
      } else {
        await upsert(form)
      }
      setOpen(false)
      setForm(emptyForm)
      setEditing(null)
    } catch {
      setErrors({ nome: 'Não foi possível salvar o cliente.' })
    } finally {
      setSaving(false)
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void save()
  }

  async function handleDelete() {
    if (!deleting) return
    setRemovendo(true)
    try {
      await remove(deleting.id)
      setDeleting(null)
    } catch {
      // mantém o modal aberto em caso de falha
    } finally {
      setRemovendo(false)
    }
  }

  function contractsOf(client: SavedClient): number {
    const email = client.email.trim().toLowerCase()
    return contracts.filter((c) => c.cliente.email.trim().toLowerCase() === email).length
  }

  return (
    <div className="page">
      <Header />

      <div className="container app-layout">
        <Sidebar />

        <main className="app-main">
          <div className="app-main__head">
            <div>
              <span className="app-main__eyebrow">Agenda de clientes</span>
              <h1>Clientes salvos</h1>
            </div>
            <div className="app-main__actions">
              <Link to="/novo-contrato" className="btn btn--ghost">
                + Contrato
              </Link>
              <Button onClick={openNew} type="button">
                + Novo cliente
              </Button>
            </div>
          </div>

          {error && (
            <div className="alert alert--error">
              {error} <button onClick={() => void reload()}>Tentar novamente</button>
            </div>
          )}

          {loading && clients.length === 0 ? (
            <div className="skeleton-list" aria-label="Carregando clientes">
              <span className="skeleton" />
              <span className="skeleton" />
              <span className="skeleton" />
            </div>
          ) : clients.length === 0 ? (
            <div className="empty">
              <p>Nenhum cliente salvo ainda.</p>
              <Button onClick={openNew} type="button">
                Cadastrar primeiro cliente
              </Button>
            </div>
          ) : (
            <div className="clients__grid">
              {clients.map((client) => (
                <Tilt key={client.id} as="article" className="client-card">
                  <div className="client-card__top">
                    <span className="client-card__avatar">
                      {client.nome.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <h3>{client.nome}</h3>
                      <span>{client.email}</span>
                    </div>
                  </div>

                  <dl className="client-card__info">
                    <div>
                      <dt>CPF / CNPJ</dt>
                      <dd>{client.cpfCnpj || '—'}</dd>
                    </div>
                    <div>
                      <dt>Endereço</dt>
                      <dd>{client.endereco || '—'}</dd>
                    </div>
                    <div>
                      <dt>Contratos</dt>
                      <dd>
                        {contractsOf(client)} contrato(s) vinculado(s)
                      </dd>
                    </div>
                  </dl>

                  <div className="client-card__actions">
                    <Button variant="secondary" onClick={() => openEdit(client)} type="button">
                      Editar
                    </Button>
                    <Button variant="danger" onClick={() => setDeleting(client)} type="button">
                      Excluir
                    </Button>
                  </div>
                </Tilt>
              ))}
            </div>
          )}
        </main>
      </div>

      <Modal
        open={open}
        title={editing ? 'Editar cliente' : 'Novo cliente'}
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} type="button" disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={() => void save()} type="button" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar cliente'}
            </Button>
          </>
        }
      >
        <form onSubmit={(event) => void handleSubmit(event)} noValidate>
          <Input
            label="Nome / empresa"
            name="nome"
            placeholder="Ex.: Padaria Estrela"
            value={form.nome}
            onChange={(event) => update('nome', event.target.value)}
            error={errors.nome}
          />
          <Input
            label="E-mail"
            type="email"
            name="email"
            placeholder="contato@empresa.com"
            value={form.email}
            onChange={(event) => update('email', event.target.value)}
            error={errors.email}
            hint="Clientes são identificados pelo e-mail (upsert)."
          />
          <Input
            label="CPF / CNPJ"
            name="cpfCnpj"
            placeholder="00.000.000/0000-00"
            value={form.cpfCnpj}
            onChange={(event) => update('cpfCnpj', event.target.value)}
            hint={
              consulta.dicaCnpj?.texto ??
              'CNPJ preenche nome e endereço automaticamente (BrasilAPI).'
            }
          />
          <div className="field">
            <label className="field__label" htmlFor="cliente-cep">
              CEP (opcional)
            </label>
            <div className="lookup">
              <input
                id="cliente-cep"
                className="field__control"
                placeholder="00000-000"
                inputMode="numeric"
                value={cep}
                onChange={(event) => setCep(event.target.value)}
              />
              <Button
                variant="secondary"
                type="button"
                disabled={consulta.buscandoCep}
                onClick={() => void consulta.consultarCepAgora(cep)}
              >
                {consulta.buscandoCep ? 'Buscando…' : '🔍 Buscar'}
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
            label="Endereço"
            name="endereco"
            placeholder="Rua, número — cidade/UF"
            value={form.endereco}
            onChange={(event) => update('endereco', event.target.value)}
          />
        </form>
      </Modal>

      <Modal
        open={deleting !== null}
        title="Excluir cliente?"
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
              onClick={() => void handleDelete()}
              type="button"
              disabled={removendo}
            >
              {removendo ? 'Excluindo…' : 'Excluir definitivamente'}
            </Button>
          </>
        }
      >
        <p>
          O cliente <strong>{deleting?.nome}</strong> será removido da sua agenda. Os
          contratos já gerados para ele <strong>não</strong> serão excluídos.
        </p>
      </Modal>

      <Footer />
    </div>
  )
}
