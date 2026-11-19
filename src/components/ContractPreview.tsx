import type { CSSProperties, Ref } from 'react'
import type { Contract, FreelancerProfile, Signature } from '../types'
import { contractSections, contractSummary, documentTheme } from '../services/contractDocument'

interface ContractPreviewProps {
  contract: Contract
  profile: FreelancerProfile
  innerRef?: Ref<HTMLDivElement>
}

interface SignatureSlotProps {
  signature?: Signature
  nome: string
  papel: string
}

/**
 * Coluna de assinatura: o desenho/nome digitado fica ALINHADO por cima da
 * linha, com o nome da parte embaixo — como num contrato de papel. Quando a
 * parte ainda não assinou, o espaço fica reservado com o aviso de pendência.
 */
function SignatureSlot({ signature, nome, papel }: SignatureSlotProps) {
  return (
    <div className="preview__sig">
      <div className="preview__sig-area">
        {signature?.imagem ? (
          <img
            className="preview__sig-img"
            src={signature.imagem}
            alt={`Assinatura de ${signature.por}`}
          />
        ) : signature ? (
          <p className="preview__signature-typed">{signature.por}</p>
        ) : (
          <span className="preview__sig-pending">
            {papel} — aguardando assinatura
          </span>
        )}
      </div>

      <div className="preview__line" />
      <span className="preview__sig-name">{nome}</span>

      {signature ? (
        <span className="preview__sig-stamp">
          Assinado por <strong>{signature.por}</strong> em{' '}
          {new Date(signature.em).toLocaleString('pt-BR')}
        </span>
      ) : (
        <span className="preview__sig-hint">Aguardando assinatura</span>
      )}

      {signature?.hash && (
        <span
          className="preview__sig-hash"
          title={`SHA-256 do conteúdo: ${signature.hash}`}
        >
          SHA-256: {signature.hash.slice(0, 24)}…
          {signature.ip ? ` · IP ${signature.ip}` : ''}
        </span>
      )}
    </div>
  )
}

/** Pré-visualização do contrato gerado — também é a área de impressão/exportação em PDF. */
export function ContractPreview({ contract, profile, innerRef }: ContractPreviewProps) {
  const theme = documentTheme(profile)
  const secoes = contractSections(contract, profile)
  const resumo = contractSummary(contract)
  const prestador = [profile.profissao, profile.documento, profile.email, profile.telefone, profile.endereco]
  const contratante = [contract.cliente.cpfCnpj, contract.cliente.email, contract.cliente.endereco]

  return (
    <div className="preview" ref={innerRef} id="contract-print"
      style={{ '--document-accent': theme.color, '--document-tint': theme.tint } as CSSProperties}>
      <div className="preview__head">
        {profile.imagem && <img className="preview__logo" src={profile.imagem} alt="" />}
        <div className="preview__brand">
          <span>Contrato de prestação de serviços</span>
          <strong>{profile.marca || profile.nome || 'ContratoFree'}</strong>
        </div>
      </div>

      <h2 className="preview__title">{contract.titulo || 'Sem título'}</h2>

      <div className="preview__grid">
        <div>
          <span>Prestador</span>
          <strong>{profile.nome || '—'}</strong>
          <p>{prestador.filter(Boolean).join('\n')}</p>
        </div>
        <div>
          <span>Contratante</span>
          <strong>{contract.cliente.nome || '—'}</strong>
          <p>{contratante.filter(Boolean).join('\n')}</p>
        </div>
      </div>

      <div className="preview__row">
        {resumo.map(({ label, value }) => (
          <div key={label}><span>{label}</span><strong>{value}</strong></div>
        ))}
      </div>

      {secoes.map((secao, index) => (
        <section className="preview__section" key={secao.titulo}>
          <h3>
            {index + 1}. {secao.titulo}
          </h3>
          <p>{secao.conteudo}</p>
        </section>
      ))}

      <section className="preview__section">
        <h3>{secoes.length + 1}. Assinaturas</h3>

        <div className="preview__signatures">
          <SignatureSlot
            signature={contract.assinaturaPrestador}
            nome={profile.nome || 'Prestador'}
            papel="Prestador"
          />
          <SignatureSlot
            signature={contract.assinaturaContratante}
            nome={contract.cliente.nome || 'Contratante'}
            papel="Contratante"
          />
        </div>
      </section>

      <p className="preview__footnote">
        ContratoFree · {contract.id || 'Prévia'}
      </p>
    </div>
  )
}
