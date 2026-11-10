import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { ContractPreview } from '../components/ContractPreview'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { SignaturePad } from '../components/SignaturePad'
import { STATUS_LABEL, type Contract, type FreelancerProfile } from '../types'
import { getContract, getProfile, signContract } from '../services/api'
import { downloadContractPdf } from '../services/pdf'

/**
 * Página PÚBLICA de assinatura (/assinar/:id).
 * O cliente recebe o link, abre sem login, lê o contrato e assina aqui mesmo.
 */
export function Assinar() {
  const { id } = useParams<{ id: string }>()

  const [contract, setContract] = useState<Contract | null>(null)
  const [profile, setProfile] = useState<FreelancerProfile | null>(null)
  const [naoEncontrado, setNaoEncontrado] = useState(false)
  const [loading, setLoading] = useState(true)

  // useState: dados do formulário de assinatura
  const [assinante, setAssinante] = useState('')
  const [desenho, setDesenho] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [baixando, setBaixando] = useState(false)

  // useEffect: carrega o contrato (pelo link) e o perfil do prestador
  useEffect(() => {
    if (!id) {
      setNaoEncontrado(true)
      setLoading(false)
      return
    }

    let ativo = true
    Promise.all([getContract(id), getProfile()])
      .then(([contrato, perfil]) => {
        if (!ativo) return
        setContract(contrato)
        setProfile(perfil)
        setAssinante(contrato.cliente.nome)
      })
      .catch(() => {
        if (ativo) setNaoEncontrado(true)
      })
      .finally(() => {
        if (ativo) setLoading(false)
      })

    return () => {
      ativo = false
    }
  }, [id])

  async function handleSign() {
    if (!contract) return
    if (!assinante.trim()) {
      setErro('Informe o nome de quem está assinando.')
      return
    }

    setSalvando(true)
    setErro(null)
    try {
      const signed = await signContract(contract.id, {
        por: assinante.trim(),
        imagem: desenho ?? undefined,
        quem: 'contratante',
      })
      setContract(signed)
      setDesenho(null)
    } catch {
      setErro('Não foi possível registrar a assinatura. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  async function handleDownload() {
    if (!contract) return
    setBaixando(true)
    try {
      await downloadContractPdf(contract)
    } finally {
      setBaixando(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <Header />
        <div className="container public">
          <div className="skeleton-list" aria-label="Carregando contrato">
            <span className="skeleton" />
            <span className="skeleton" />
            <span className="skeleton" />
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (naoEncontrado || !contract) {
    return (
      <div className="page">
        <Header />
        <div className="container public">
          <div className="empty">
            <p>Contrato não encontrado — verifique o link recebido.</p>
            <Link to="/" className="btn btn--primary">
              Ir para o início
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const assin = contract.assinaturaContratante
  const assinado = Boolean(assin)
  const faltaPrestador = !contract.assinaturaPrestador
  const freelancer: FreelancerProfile = profile ?? {
    nome: '',
    email: '',
    telefone: '',
    profissao: '',
    pix: '',
    termosPadrao: '',
  }

  return (
    <div className="page">
      <Header />

      <div className="container public">
        <div className="public__head">
          <span className="app-main__eyebrow">Contrato para assinar</span>
          <h1>{contract.titulo}</h1>
          <p>
            Preparado por <strong>{profile?.nome ?? '—'}</strong> para{' '}
            <strong>{contract.cliente.nome}</strong> — status:{' '}
            <span className={`badge badge--${contract.status}`}>
              {STATUS_LABEL[contract.status]}
            </span>
          </p>
        </div>

        <div className="assinar">
          <aside className="assinar__panel">
            {assinado ? (
              <div className="assinar__done">
                <h2>
                  {faltaPrestador
                    ? '✅ Sua assinatura foi registrada'
                    : '✅ Contrato assinado'}
                </h2>
                <p>
                  Assinado por <strong>{assin?.por}</strong> em{' '}
                  <strong>{assin ? new Date(assin.em).toLocaleString('pt-BR') : '—'}</strong>
                  .
                </p>
                <span className="field__hint">
                  {faltaPrestador
                    ? `Ainda falta a assinatura do prestador (${profile?.nome ?? 'prestador'}) — combine com ele para concluir o contrato.`
                    : 'Contrato com as duas assinaturas — guarde o PDF abaixo.'}
                </span>
                <div className="assinar__actions">
                  <Button
                    onClick={() => void handleDownload()}
                    type="button"
                    disabled={baixando}
                  >
                    {baixando
                      ? 'Gerando…'
                      : faltaPrestador
                        ? '⬇️ Baixar PDF'
                        : '⬇️ Baixar PDF assinado'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => window.print()}
                    type="button"
                  >
                    🖨️ Imprimir
                  </Button>
                </div>
              </div>
            ) : (
              <div className="assinar__form">
                <h2>✍️ Assinar contrato</h2>
                <p className="sign-form__hint">
                  Leia o documento ao lado e confirme a assinatura do{' '}
                  <strong>contratante</strong>. O app registra automaticamente{' '}
                  <strong>quem assinou</strong> e a <strong>data/hora</strong> em cima da
                  linha do seu nome.
                </p>

                <label className="field__label" htmlFor="assinante-publico">
                  Nome de quem assina
                </label>
                <input
                  id="assinante-publico"
                  className="field__control"
                  value={assinante}
                  onChange={(event) => {
                    setAssinante(event.target.value)
                    setErro(null)
                  }}
                  placeholder="Seu nome completo"
                />
                {erro && <span className="field__error">{erro}</span>}

                <span className="field__label">Assinatura (desenhe abaixo)</span>
                <SignaturePad onChange={setDesenho} width={360} height={150} />
                <span className="field__hint">
                  Opcional: apenas confirme — o nome digitado já fica registrado.
                </span>

                <Button
                  onClick={() => void handleSign()}
                  type="button"
                  disabled={salvando}
                  className="assinar__submit"
                >
                  {salvando ? 'Registrando…' : 'Confirmar assinatura ✓'}
                </Button>
              </div>
            )}
          </aside>

          <main className="assinar__preview">
            <ContractPreview contract={contract} profile={freelancer} />
          </main>
        </div>
      </div>

      <Footer />
    </div>
  )
}
