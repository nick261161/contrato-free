import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../components/Button'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { Input, Select, Textarea } from '../components/Input'
import { Modal } from '../components/Modal'
import { Sidebar } from '../components/Sidebar'
import { getProfile, updateProfile } from '../services/api'
import { prepareBrandImage } from '../services/brandImage'
import { CLAUSULAS_OPCIONAIS, NICHOS } from '../services/clausulas'
import { CLAUSULAS_VAZIAS, TEMAS_PDF } from '../services/modelos'
import type { ContractDefaults, FreelancerProfile } from '../types'

const emptyProfile: FreelancerProfile = {
  nome: '',
  email: '',
  telefone: '',
  profissao: '',
  pix: '',
  termosPadrao: '',
}
const defaults: ContractDefaults = {
  nicho: '', prazoDias: 0, valor: 0, pagamento: '', clausulas: CLAUSULAS_VAZIAS,
}

export function Perfil() {
  // useState: dados do formulário de perfil
  const [profile, setProfile] = useState<FreelancerProfile>(emptyProfile)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [processingImage, setProcessingImage] = useState(false)
  const [saved, setSaved] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const padroes = profile.padroes ?? defaults

  // useEffect: carrega o perfil ao montar a página (GET /profile)
  useEffect(() => {
    let ativo = true

    getProfile()
      .then((dados) => {
        if (!ativo) return
        setProfile(dados)
        setLoaded(true)
      })
      .catch(() => {
        if (ativo) setErro('Não foi possível carregar o perfil. Tente novamente.')
      })
      .finally(() => { if (ativo) setLoading(false) })

    return () => {
      ativo = false
    }
  }, [])

  function update<K extends keyof FreelancerProfile>(field: K, value: FreelancerProfile[K]) {
    setProfile((current) => ({ ...current, [field]: value }))
    setErro(null)
    setSaved(false)
  }

  function updateDefaults(values: Partial<ContractDefaults>) {
    update('padroes', { ...padroes, ...values })
  }

  async function uploadImage(file?: File) {
    if (!file) return
    setProcessingImage(true)
    try {
      update('imagem', await prepareBrandImage(file))
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível ler a imagem.')
    } finally {
      setProcessingImage(false)
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!loaded || saving || processingImage) return

    if (!profile.nome.trim() || !profile.email.includes('@')) {
      setErro('Preencha ao menos nome e um e-mail válido.')
      return
    }
    if (padroes.prazoDias && (!Number.isInteger(padroes.prazoDias) || padroes.prazoDias < 1 || padroes.prazoDias > 3650)) {
      setErro('O prazo padrão deve ser de 1 a 3650 dias.')
      return
    }
    if (!Number.isFinite(padroes.valor) || padroes.valor < 0) {
      setErro('Informe um valor padrão maior ou igual a zero.')
      return
    }

    setSaving(true)
    setErro(null)
    try {
      const savedProfile = await updateProfile({ ...profile, padroes })
      setProfile(savedProfile)
      setSaved(true)
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao salvar os dados.')
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
          </div>

          <form className="panel profile-form" onSubmit={handleSubmit} noValidate>
            <fieldset className="profile-fieldset" disabled={!loaded || saving}>
              <h2>Identidade visual</h2>
              <p className="profile-intro">Sua marca aparece na prévia e no PDF dos novos contratos.</p>
              <div className="brand-upload">
                <div className="brand-upload__preview">
                  {profile.imagem
                    ? <img src={profile.imagem} alt="Prévia da foto ou logo" />
                    : <span aria-hidden="true">{(profile.marca || profile.nome || 'CF').slice(0, 2).toUpperCase()}</span>}
                </div>
                <div>
                  <label className="field__label" htmlFor="brand-image">Foto ou logo</label>
                  <input
                    id="brand-image"
                    className="brand-upload__input"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={processingImage}
                    onChange={(event) => {
                      void uploadImage(event.currentTarget.files?.[0])
                      event.currentTarget.value = ''
                    }}
                  />
                  <small>PNG, JPG ou WebP de até 10 MB.</small>
                  {profile.imagem && (
                    <Button variant="ghost" type="button" disabled={processingImage} onClick={() => update('imagem', '')}>
                      Remover imagem
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid-2">
                <Input label="Marca ou nome comercial" name="marca" maxLength={120} value={profile.marca ?? ''} onChange={(event) => update('marca', event.target.value)} />
                <Select label="Estilo do PDF" name="temaPdf" options={[...TEMAS_PDF]} value={profile.temaPdf ?? 'editorial'}
                  onChange={(event) => update('temaPdf', event.target.value === 'botanico' ? 'botanico' : 'editorial')} />
              </div>

              <h2>Dados do prestador</h2>
              <p className="profile-intro">Esses dados ficam visíveis no contrato compartilhado com o cliente.</p>

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
                  hint="Aparece quando o contrato tem condições de pagamento."
                  value={profile.pix}
                  onChange={(event) => update('pix', event.target.value)}
                />
                <Input label="CPF ou CNPJ" name="documento" maxLength={30} value={profile.documento ?? ''} onChange={(event) => update('documento', event.target.value)} />
              </div>
              <Input label="Endereço comercial" name="endereco" maxLength={280} value={profile.endereco ?? ''} onChange={(event) => update('endereco', event.target.value)} />

              <h2>Preferências para novos contratos</h2>
              <p className="profile-intro">Os valores abaixo preenchem automaticamente o formulário. Você pode ajustá-los em cada contrato.</p>
              <Select label="Área de atuação padrão" name="defaultNicho" options={[
                { value: '', label: 'Contrato genérico' }, ...NICHOS.map(({ value, label }) => ({ value, label })),
              ]} value={padroes.nicho} onChange={(event) => updateDefaults({ nicho: event.target.value })} />
              <div className="grid-2">
                <Input label="Prazo padrão (dias)" name="defaultPrazo" type="number" min={1} max={3650} placeholder="Prazo do modelo"
                  value={padroes.prazoDias || ''} onChange={(event) => updateDefaults({ prazoDias: Number(event.target.value) })} />
                <Input label="Valor padrão (R$)" name="defaultValor" type="number" min={0} step="0.01"
                  value={padroes.valor || ''} onChange={(event) => updateDefaults({ valor: Number(event.target.value) })} />
              </div>
              <Textarea label="Condições de pagamento padrão" name="defaultPagamento" rows={3} maxLength={1600}
                placeholder="Ex.: 50% na aprovação e 50% na entrega."
                value={padroes.pagamento} onChange={(event) => updateDefaults({ pagamento: event.target.value })} />
              <div className="profile-clausulas" role="group" aria-label="Cláusulas que entram por padrão">
                {CLAUSULAS_OPCIONAIS.map(({ chave, titulo }) => (
                  <label key={chave}>
                    <input type="checkbox" checked={padroes.clausulas[chave]}
                      onChange={(event) => updateDefaults({ clausulas: { ...padroes.clausulas, [chave]: event.target.checked } })} />
                    {titulo}
                  </label>
                ))}
              </div>
              <Textarea
                label="Outros termos padrão"
                name="termosPadrao"
                rows={5}
                value={profile.termosPadrao}
                onChange={(event) => update('termosPadrao', event.target.value)}
                hint="Ex.: número de revisões inclusas e regras de cancelamento."
              />
              {profile.termosPadrao && (
                <Button variant="ghost" type="button" onClick={() => setConfirmando(true)}>Limpar termos</Button>
              )}
            </fieldset>

            {erro && <p className="alert alert--error" role="alert">{erro}</p>}

            <div className="profile-form__actions">
              <span className="profile-form__status" role="status">
                {loading ? 'Carregando perfil…' : processingImage ? 'Preparando imagem…' : saving ? 'Salvando…' : saved ? 'Alterações salvas' : ''}
              </span>
              <Button type="submit" disabled={!loaded || saving || processingImage}>
                {saving ? 'Salvando…' : 'Salvar alterações'}
              </Button>
            </div>
          </form>
        </main>
      </div>

      <Modal
        open={confirmando}
        title="Limpar os termos padrão?"
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
                setConfirmando(false)
              }}
            >
              Limpar termos
            </Button>
          </>
        }
      >
        <p>
          O campo ficará vazio. Clique em Salvar alterações para aplicar a mudança.
        </p>
      </Modal>

      <Footer />
    </div>
  )
}
