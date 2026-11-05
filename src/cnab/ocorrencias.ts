/** Códigos de movimento de REMESSA (FEBRABAN, nota C004). */
export const MOVIMENTOS_REMESSA = {
  entrada: '01',
  baixa: '02',
  concederAbatimento: '04',
  cancelarAbatimento: '05',
  alterarVencimento: '06',
  concederDesconto: '07',
  cancelarDesconto: '08',
  protestar: '09',
  sustarProtestoBaixar: '10',
  sustarProtestoManter: '11',
  alterarOutrosDados: '31',
} as const;

export type MovimentoRemessa = keyof typeof MOVIMENTOS_REMESSA;

/** Códigos de movimento de RETORNO (FEBRABAN, nota C044). */
export const MOVIMENTOS_RETORNO: Record<string, string> = {
  '02': 'Entrada confirmada',
  '03': 'Entrada rejeitada',
  '04': 'Transferência de carteira/entrada',
  '05': 'Transferência de carteira/baixa',
  '06': 'Liquidação',
  '07': 'Confirmação do recebimento da instrução de desconto',
  '08': 'Confirmação do recebimento do cancelamento do desconto',
  '09': 'Baixa',
  '11': 'Títulos em carteira (em ser)',
  '12': 'Confirmação recebimento instrução de abatimento',
  '13': 'Confirmação recebimento instrução de cancelamento de abatimento',
  '14': 'Confirmação recebimento instrução alteração de vencimento',
  '15': 'Franco de pagamento',
  '17': 'Liquidação após baixa ou liquidação de título não registrado',
  '19': 'Confirmação recebimento instrução de protesto',
  '20': 'Confirmação recebimento instrução de sustação/cancelamento de protesto',
  '23': 'Remessa a cartório (aponte em cartório)',
  '24': 'Retirada de cartório e manutenção em carteira',
  '25': 'Protestado e baixado (baixa por ter sido protestado)',
  '26': 'Instrução rejeitada',
  '27': 'Confirmação do pedido de alteração de outros dados',
  '28': 'Débito de tarifas/custas',
  '29': 'Ocorrências do pagador',
  '30': 'Alteração de dados rejeitada',
};

export const MOVIMENTOS_LIQUIDACAO = new Set(['06', '17']);
export const MOVIMENTOS_REJEICAO = new Set(['03', '26', '30']);
