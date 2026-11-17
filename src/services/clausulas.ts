/**
 * Nichos de atuação (cláusulas-base por área) e cláusulas opcionais que o
 * freelancer liga/desliga no wizard. Os textos são modelos informativos — o
 * aviso legal na UI deixa claro que não substituem revisão jurídica.
 */
import type { Clausulas } from '../types'

/** Definição de um nicho: rótulo + parágrafos de cláusulas-base. */
export interface NichoDef {
  value: string
  label: string
  /** Blocos incluídos automaticamente quando o nicho é escolhido. */
  clausulas: string[]
}

/** Nichos disponíveis no seletor do wizard (ordem = ordem de exibição). */
export const NICHOS: NichoDef[] = [
  {
    value: 'design',
    label: 'Design e criatividade',
    clausulas: [
      'Estão inclusas até duas rodadas de alteração por entrega; rodadas adicionais serão orçadas e aprovadas previamente.',
      'Os arquivos-fonte editáveis serão entregues mediante quitação integral do valor contratado.',
      'Aprovada a versão final, alterações de escopo serão tratadas como novo orçamento.',
    ],
  },
  {
    value: 'dev',
    label: 'Desenvolvimento de software',
    clausulas: [
      'O código-fonte e a documentação serão entregues ao final do projeto, mediante quitação do valor contratado.',
      'Os prazos consideram ambientes de homologação e produção definidos em comum acordo.',
      'Correções de defeitos reportados em até 30 (trinta) dias após a entrega estão inclusas.',
    ],
  },
  {
    value: 'social',
    label: 'Social media',
    clausulas: [
      'Estão inclusos a definição de calendário editorial e até duas rodadas de ajustes por ciclo.',
      'A publicação fica condicionada à aprovação do contratante com no mínimo 24 (vinte e quatro) horas de antecedência.',
      'Relatórios de métricas serão enviados por e-mail no encerramento de cada ciclo contratado.',
    ],
  },
  {
    value: 'video',
    label: 'Vídeo e edição',
    clausulas: [
      'Estão inclusas duas rodadas de revisão sobre a primeira versão da edição.',
      'Arquivos brutos (raw) não fazem parte da entrega, salvo acordo em contrário.',
      'A entrega final será feita nos formatos e resolução combinados entre as partes.',
    ],
  },
  {
    value: 'redacao',
    label: 'Redação e conteúdo',
    clausulas: [
      'Estão inclusas duas rodadas de revisão por texto entregue.',
      'O contratante se responsabiliza pela veracidade das informações e materiais fornecidos.',
      'Os direitos patrimoniais de autor são cedidos após a quitação integral do valor contratado.',
    ],
  },
]

/** Cláusulas opcionais (switches): chave no contrato + texto do bloco. */
export interface ClausulaOpcao {
  chave: keyof Clausulas
  titulo: string
  /** Resumo curto exibido ao lado do switch. */
  resumo: string
  /** Bloco jurídico pronto inserido no contrato quando ligada. */
  texto: string
}

export const CLAUSULAS_OPCIONAIS: ClausulaOpcao[] = [
  {
    chave: 'multa',
    titulo: 'Multa por atraso no pagamento',
    resumo: '2% + juros de mora de 1% ao mês',
    texto:
      'Em caso de atraso no pagamento, incidirá multa de 2% (dois por cento) sobre o valor em aberto, ' +
      'acrescida de juros de mora de 1% (um por cento) ao mês, calculados pro rata die, até a data do ' +
      'efetivo pagamento.',
  },
  {
    chave: 'nda',
    titulo: 'Confidencialidade (NDA)',
    resumo: 'Sigilo das informações trocadas',
    texto:
      'As partes comprometem-se a manter sigilo absoluto sobre as informações confidenciais trocadas ' +
      'durante a execução deste contrato, usando-as exclusivamente para os fins aqui previstos, obrigação ' +
      'que sobrevive ao encerramento do vínculo por 5 (cinco) anos.',
  },
  {
    chave: 'portfolio',
    titulo: 'Uso do trabalho em portfólio',
    resumo: 'Poder exibir o projeto no portfólio',
    texto:
      'O prestador poderá exibir o trabalho realizado e mencionar o nome do contratante em seu portfólio, ' +
      'redes sociais e materiais de divulgação, respeitando eventuais restrições de confidencialidade ' +
      'comunicadas por escrito.',
  },
  {
    chave: 'rescisao',
    titulo: 'Rescisão antecipada',
    resumo: 'Aviso prévio de 15 dias',
    texto:
      'Qualquer parte poderá rescindir este contrato mediante aviso prévio escrito de 15 (quinze) dias. ' +
      'Serão devidos os valores correspondentes às etapas já executadas e aprovadas na data da rescisão.',
  },
]

/** Rótulo do nicho escolhido (string vazia quando não há nicho). */
export function nichoLabel(nicho?: string): string {
  if (!nicho) return ''
  return NICHOS.find((item) => item.value === nicho)?.label ?? ''
}
