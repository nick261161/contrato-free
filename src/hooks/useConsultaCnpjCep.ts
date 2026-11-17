import { useEffect, useRef, useState } from 'react'
import {
  apenasDigitos,
  buscarCEP,
  buscarCNPJ,
  type EmpresaEncontrada,
} from '../services/brasil'

/** Dica exibida abaixo dos campos de consulta. */
export interface Dica {
  tipo: 'ok' | 'erro' | 'info'
  texto: string
}

interface Params {
  /** Valor atual do campo CPF/CNPJ. */
  cpfCnpj: string
  /** Valor atual do campo CEP. */
  cep: string
  /**
   * Recebe os dados da empresa encontrados pela BrasilAPI. O chamador decide
   * o que preencher (recomendado: só campos vazios, via update funcional).
   */
  onEmpresa: (empresa: EmpresaEncontrada) => void
  /**
   * Recebe o endereço montado a partir do CEP. `sobrescrever` é `false` na
   * busca automática (só preenche endereço vazio) e `true` no botão explícito.
   */
  onEndereco: (endereco: string, sobrescrever: boolean) => void
}

const DEBOUNCE_MS = 700

/**
 * Hook de preenchimento automático CNPJ/CEP (BrasilAPI).
 *
 * - CNPJ: dispara sozinho quando o campo fica com 14 dígitos (debounce);
 * - CEP: busca automática aos 8 dígitos e botão "Buscar endereço" explícito.
 *
 * Os callbacks vivem numa ref (atualizada a cada render) e os efeitos só
 * dependem dos valores crus dos campos — assim o debounce não é cancelado a
 * cada re-render e o callback sempre enxerga o estado atual via setState
 * funcional.
 */
export function useConsultaCnpjCep({ cpfCnpj, cep, onEmpresa, onEndereco }: Params) {
  const [dicaCnpj, setDicaCnpj] = useState<Dica | null>(null)
  const [dicaCep, setDicaCep] = useState<Dica | null>(null)
  const [buscandoCep, setBuscandoCep] = useState(false)

  const callbacks = useRef({ onEmpresa, onEndereco })
  useEffect(() => {
    callbacks.current = { onEmpresa, onEndereco }
  })

  // ---- CNPJ: consulta automática com debounce -----------------------------
  const digitosCnpj = apenasDigitos(cpfCnpj)
  useEffect(() => {
    if (digitosCnpj.length !== 14) {
      setDicaCnpj(null)
      return
    }

    let ativo = true
    const timer = window.setTimeout(() => {
      buscarCNPJ(digitosCnpj)
        .then((empresa) => {
          if (!ativo) return
          if (!empresa) {
            setDicaCnpj({
              tipo: 'info',
              texto: 'CNPJ não encontrado na base pública da BrasilAPI.',
            })
            return
          }
          setDicaCnpj({ tipo: 'ok', texto: `✓ BrasilAPI: ${empresa.nome}` })
          callbacks.current.onEmpresa(empresa)
        })
        .catch(() => {
          // falha de rede/timeout: fica silencioso para não alarmar ao digitar
          if (ativo) setDicaCnpj(null)
        })
    }, DEBOUNCE_MS)

    return () => {
      ativo = false
      window.clearTimeout(timer)
    }
  }, [digitosCnpj])

  // ---- CEP: busca automática aos 8 dígitos -------------------------------
  const digitosCep = apenasDigitos(cep)
  useEffect(() => {
    if (digitosCep.length !== 8) {
      setDicaCep(null)
      return
    }

    let ativo = true
    const timer = window.setTimeout(() => {
      buscarCEP(digitosCep)
        .then((endereco) => {
          if (!ativo) return
          if (!endereco) {
            setDicaCep({ tipo: 'erro', texto: 'CEP não encontrado na base pública.' })
            return
          }
          setDicaCep({ tipo: 'ok', texto: `✓ ${endereco.endereco}` })
          callbacks.current.onEndereco(endereco.endereco, false)
        })
        .catch(() => {
          // falha de rede na busca automática: não exibe erro (há botão próprio)
          if (ativo) setDicaCep(null)
        })
    }, DEBOUNCE_MS)

    return () => {
      ativo = false
      window.clearTimeout(timer)
    }
  }, [digitosCep])

  /** Busca o CEP de forma EXPLÍCITA (botão) — sempre substitui o endereço. */
  async function consultarCepAgora(valor: string): Promise<void> {
    const digitos = apenasDigitos(valor)
    if (digitos.length !== 8) {
      setDicaCep({ tipo: 'erro', texto: 'Digite um CEP com 8 dígitos.' })
      return
    }

    setBuscandoCep(true)
    setDicaCep(null)
    try {
      const endereco = await buscarCEP(digitos)
      if (!endereco) {
        setDicaCep({ tipo: 'erro', texto: 'CEP não encontrado na base pública.' })
        return
      }
      setDicaCep({ tipo: 'ok', texto: `✓ ${endereco.endereco}` })
      callbacks.current.onEndereco(endereco.endereco, true)
    } catch {
      setDicaCep({ tipo: 'erro', texto: 'Falha na consulta. Tente novamente.' })
    } finally {
      setBuscandoCep(false)
    }
  }

  return { dicaCnpj, dicaCep, buscandoCep, consultarCepAgora }
}
