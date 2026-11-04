import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../components/Button'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { Input, Textarea } from '../components/Input'
import { Modal } from '../components/Modal'
import { Sidebar } from '../components/Sidebar'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { getProfile, updateProfile } from '../services/api'
import type { FreelancerProfile } from '../types'

const emptyProfile: FreelancerProfile = {
  nome: '',
  email: '',
  telefone: '',
  profissao: '',
  pix: '',
  termosPadrao: '',
}

export function Perfil() {
  // useState: dados do formulário de perfil
  const [profile, setProfile] = useState<FreelancerProfile>(emptyProfile)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [termosSalvos, setTermosSalvos] = useLocalStorage<string>('contratofree.termos', '')

  // useEffect: carrega o perfil ao montar a página (GET /profile)
  useEffect(() => {
    let ativo = true

    getProfile()
      .then((dados) => {
        if (!ativo) return
        setProfile(dados)
        if (termosSalvos) setProfile({ ...dados, termosPadrao: termosSalvos })
      })
      .catch(() => {
        if (ativo) setErro('Não foi possível carregar o perfil. Tente novamente.')
      })

    return () => {
      ativo = false
    }
  }, [termosSalvos])

  function update<K extends keyof FreelancerProfile>(field: K, value: FreelancerProfile[K]) {
    setProfile((current) => ({ ...current, [field]: value }))
    setErro(null)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (!profile.nome.trim() || !profile.email.includes('@')) {
      setErro('Preencha ao menos nome e um e-mail válido.')
      return
    }

    setSaving(true)
    try {
      const savedProfile = await updateProfile(profile)
      setProfile(savedProfile)
      setTermosSalvos(savedProfile.termosPadrao)
      setSaved(true)
    } catch {
      setErro('Falha ao salvar os dados. Verifique sua conexão.')
    } finally {
      setSaving(false)
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
              <span className="app-main__eyebrow">Configurações</span>
              <h1>Perfil do freelancer</h1>
            </div>
            <Button variant="secondary" onClick={() => setConfirmando(true)} type="button">
              Restaurar termos padrão
            </Button>
          </div>

          <form className="panel profile-form" onSubmit={handleSubmit} noValidate>
            <h2>Dados pessoais</h2>

            <div className="grid-2">
              <Input
                label="Nome completo"
                name="nome"
                placeholder="Seu nome"
                value={profile.nome}
                onChange={(event) => update('nome', event.target.value)}
              />
              <Input
                label="E-mail"
                type="email"
                name="email"
                placeholder="voce@email.com"
                value={profile.email}
                onChange={(event) => update('email', event.target.value)}
              />
              <Input
                label="Telefone"
                name="telefone"
                placeholder="(00) 00000-0000"
                value={profile.telefone}
                onChange={(event) => update('telefone', event.target.value)}
              />
              <Input
                label="Profissão / especialidade"
                name="profissao"
                placeholder="Ex.: Designer Gráfico"
                value={profile.profissao}
                onChange={(event) => update('profissao', event.target.value)}
              />
              <Input
                label="Chave PIX"
                name="pix"
                placeholder="Seu e-mail ou chave PIX"
                value={profile.pix}
                onChange={(event) => update('pix', event.target.value)}
              />
            </div>

            <h2>Termos padrão dos contratos</h2>
            <Textarea
              label="Condições que entram automaticamente em cada contrato"
              name="termosPadrao"
              rows={5}
              value={profile.termosPadrao}
              onChange={(event) => update('termosPadrao', event.target.value)}
              hint="Ex.: prazo de pagamento, número de revisões inclusas, regras de cancelamento."
            />

            {erro && <p className="alert alert--error">{erro}</p>}

            <div className="profile-form__actions">
              <span className="profile-form__status">
                {saving ? 'Salvando…' : saved ? 'Alterações salvas ✓' : 'Nenhuma alteração pendente'}
              </span>
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando…' : 'Salvar alterações'}
              </Button>
            </div>
          </form>
        </main>
      </div>

      <Modal
        open={confirmando}
        title="Restaurar termos padrão?"
        onClose={() => setConfirmando(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmando(false)} type="button">
              Cancelar
            </Button>
            <Button
              variant="danger"
              type="button"
              onClick={() => {
                update('termosPadrao', emptyProfile.termosPadrao)
                setTermosSalvos('')
                setConfirmando(false)
              }}
            >
              Restaurar
            </Button>
          </>
        }
      >
        <p>
          Os termos padrão atuais serão substituídos pelo texto original da plataforma. Esta ação
          não afeta contratos já gerados.
        </p>
      </Modal>

      <Footer />
    </div>
  )
}
