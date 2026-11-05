import { BANK_IDS, getBank } from './bank/registry.js';
import { Boleto } from './boleto.js';
import { serializeBoleto } from './serializer.js';
import type { BankId, BoletoInput, BoletoJsonOutput, BoletoRuntime } from './types.js';
import { normalizeDate, utcToday } from './util/date.js';
import { randomInt } from './util/random.js';
import { copiaSegura } from './util/sanitize.js';
import { BoletoValidationError } from './util/validate.js';

/** Aceita 'Bradesco', ' itaú ' etc. Retorna undefined se não houver banco. */
function normalizarBanco(banco: unknown): BankId | undefined {
  if (banco == null) {
    return undefined;
  }
  const texto = String(banco).normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
  const id = ALIASES.get(texto.replace(/[\s._-]+/g, '')) ?? texto;
  if (!getBank(id)) {
    throw new Error('Banco inválido.');
  }
  return id as BankId;
}

/** Nomes alternativos aceitos em `banco` (sem acento/espaço, minúsculos). */
const ALIASES = new Map<string, BankId>([
  ['bancodobrasil', 'bb'],
  ['bancobrasil', 'bb'],
  ['001', 'bb'],
  ['237', 'bradesco'],
  ['033', 'santander'],
  ['104', 'caixa'],
  ['caixaeconomicafederal', 'caixa'],
  ['cef', 'caixa'],
  ['341', 'itau'],
  ['itauunibanco', 'itau'],
  ['748', 'sicredi'],
  ['756', 'sicoob'],
  ['bancoob', 'sicoob'],
  ['422', 'safra'],
]);

/** Carteira usada quando o banco tem um padrão e ela não foi informada. */
const CARTEIRA_PADRAO: Partial<Record<BankId, string>> = {
  caixa: '1',
  sicredi: '1',
  sicoob: '1',
  safra: '1',
};

const NOMES_BANCO: Record<BankId, string> = {
  bradesco: 'Bradesco',
  santander: 'Santander',
  caixa: 'Caixa',
  itau: 'Itaú',
  bb: 'do Brasil',
  sicredi: 'Sicredi',
  sicoob: 'Sicoob',
  safra: 'Safra',
};

/**
 * Normaliza o input bruto do usuário para o formato de runtime.
 * Centraliza a definição de valores padrão e textos informativos.
 */
function prepararInput(input: Partial<BoletoInput>): BoletoRuntime {
  const seguro = copiaSegura(input ?? {}) as Partial<BoletoInput>;
  const banco = normalizarBanco(seguro.banco) ?? BANK_IDS[0]!;

  const emissao = seguro.dataEmissao ? normalizeDate(seguro.dataEmissao) : utcToday();
  let vencimento: Date;

  if (seguro.dataVencimento) {
    vencimento = normalizeDate(seguro.dataVencimento);
  } else {
    vencimento = new Date(emissao.getTime());
    vencimento.setUTCDate(vencimento.getUTCDate() + 5);
  }

  const runtime: BoletoRuntime = {
    ...seguro,
    banco,
    dataEmissao: emissao,
    dataVencimento: vencimento,
    valorDocumento: seguro.valorDocumento ?? 0,
    nossoNumero: seguro.nossoNumero ?? 0,
    agencia: seguro.agencia ?? 0,
    codigoCedente: seguro.codigoCedente ?? 0,
    carteira: seguro.carteira ?? CARTEIRA_PADRAO[banco] ?? 0,
    localPagamento:
      seguro.localPagamento || `Até o vencimento, preferencialmente no Banco ${NOMES_BANCO[banco]}`,
    instrucoesPagamento:
      seguro.instrucoesPagamento ||
      'Sr. Caixa, cobrar multa de 2% após o vencimento. Receber até 10 dias após o vencimento.',
  };
  if (seguro.dataProcessamento) {
    runtime.dataProcessamento = normalizeDate(seguro.dataProcessamento);
  }
  return runtime;
}

/** Monta o boleto sem exigir campos (campos ausentes viram zero). Uso interno. */
export function montarBoleto(input: Partial<BoletoInput>): BoletoJsonOutput {
  return serializeBoleto(new Boleto(prepararInput(input)));
}

/** Campos obrigatórios para emissão real, por banco. */
const OBRIGATORIOS: Record<BankId, (keyof BoletoInput)[]> = {
  bradesco: [
    'agencia',
    'codigoCedente',
    'carteira',
    'nossoNumero',
    'valorDocumento',
    'dataVencimento',
  ],
  itau: ['agencia', 'codigoCedente', 'carteira', 'nossoNumero', 'valorDocumento', 'dataVencimento'],
  santander: ['codigoCedente', 'carteira', 'nossoNumero', 'valorDocumento', 'dataVencimento'],
  caixa: ['codigoCedente', 'nossoNumero', 'valorDocumento', 'dataVencimento'],
  // BB: agência/conta são exigidas pelo módulo só para convênios de 4 e 6 posições
  bb: ['convenio', 'carteira', 'nossoNumero', 'valorDocumento', 'dataVencimento'],
  sicredi: ['agencia', 'posto', 'codigoCedente', 'nossoNumero', 'valorDocumento', 'dataVencimento'],
  sicoob: ['agencia', 'codigoCedente', 'nossoNumero', 'valorDocumento', 'dataVencimento'],
  safra: ['agencia', 'codigoCedente', 'nossoNumero', 'valorDocumento', 'dataVencimento'],
};

/**
 * Cria um boleto REAL a partir de dados completos.
 *
 * Diferente de `gerarBoleto`, nunca preenche nada aleatoriamente: se faltar
 * um campo obrigatório (ou algum for inválido), lança `BoletoValidationError`.
 * Use esta função em produção.
 */
export function criarBoleto(input: BoletoInput): BoletoJsonOutput {
  if (input == null || typeof input !== 'object') {
    throw new BoletoValidationError('input', 'deve ser um objeto.');
  }
  const banco = normalizarBanco(input.banco);
  if (!banco) {
    throw new BoletoValidationError('banco', 'é obrigatório.');
  }
  for (const campo of OBRIGATORIOS[banco]) {
    const v = input[campo];
    if (v == null || v === '') {
      throw new BoletoValidationError(String(campo), 'é obrigatório.');
    }
  }
  return montarBoleto({ ...input, banco });
}

/**
 * Configurações de carteiras por banco conforme especificações.
 */
const CARTEIRAS_POR_BANCO: Record<BankId, string[]> = {
  bradesco: ['09', '04', '06', '21', '22', '25', '26', '19'],
  // SIGCB: carteira (1 = registrada, 2 = sem registro) + emissão (4 = beneficiário)
  caixa: ['14', '24'],
  santander: ['101', '102', '201', '104'],
  itau: ['104', '109', '112', '175'],
  bb: ['17', '18'],
  sicredi: ['1'],
  sicoob: ['1'],
  safra: ['1'],
};

/** Quantidade de dígitos de cada campo por banco (para gerar massa válida). */
const DIGITOS: Record<BankId, { nossoNumero: number; codigoCedente: number; agencia: number }> = {
  bradesco: { nossoNumero: 11, codigoCedente: 7, agencia: 4 },
  caixa: { nossoNumero: 15, codigoCedente: 6, agencia: 4 },
  santander: { nossoNumero: 12, codigoCedente: 7, agencia: 4 },
  itau: { nossoNumero: 8, codigoCedente: 5, agencia: 4 },
  bb: { nossoNumero: 10, codigoCedente: 8, agencia: 4 },
  sicredi: { nossoNumero: 8, codigoCedente: 5, agencia: 4 },
  sicoob: { nossoNumero: 7, codigoCedente: 7, agencia: 4 },
  safra: { nossoNumero: 8, codigoCedente: 9, agencia: 5 },
};

function numeroAleatorio(digitos: number): number {
  return randomInt(10 ** (digitos - 1), 10 ** digitos - 1);
}

/** Campos extras que alguns bancos exigem, para gerar massa válida. */
function extrasAleatorios(banco: BankId): Partial<BoletoInput> {
  if (banco === 'bb') {
    return { convenio: numeroAleatorio(7) };
  }
  if (banco === 'sicredi') {
    // ano(2) + byte de geração (2 a 9) + sequencial(5)
    const ano = String(utcToday().getUTCFullYear()).slice(2);
    const sequencial = String(randomInt(1, 99_999)).padStart(5, '0');
    return {
      posto: String(randomInt(1, 99)).padStart(2, '0'),
      nossoNumero: `${ano}${randomInt(2, 9)}${sequencial}`,
    };
  }
  return {};
}

/**
 * Gera um boleto com dados aleatórios para campos não preenchidos.
 * Destinado a massa de testes — para boletos reais use `criarBoleto`.
 */
export function gerarBoletoAleatorio(input?: Partial<BoletoInput>): BoletoJsonOutput {
  const provided = copiaSegura(input ?? {}) as Partial<BoletoInput>;
  const banco =
    normalizarBanco(provided.banco) ?? BANK_IDS[Math.floor(Math.random() * BANK_IDS.length)]!;

  const carteiras = CARTEIRAS_POR_BANCO[banco];
  const defaults: Partial<BoletoInput> = {
    valorDocumento: randomInt(1, 99_999),
    nossoNumero: numeroAleatorio(DIGITOS[banco].nossoNumero),
    agencia: randomInt(1, 10 ** DIGITOS[banco].agencia - 1),
    codigoCedente: numeroAleatorio(DIGITOS[banco].codigoCedente),
    carteira: carteiras[Math.floor(Math.random() * carteiras.length)]!,
    ...extrasAleatorios(banco),
  };

  const merged: Partial<BoletoInput> = { ...defaults };
  for (const [chave, valor] of Object.entries(provided)) {
    if (valor !== undefined) {
      merged[chave] = valor;
    }
  }
  merged.banco = banco;

  return montarBoleto(merged);
}

/**
 * Gera um boleto; campos não informados são preenchidos aleatoriamente.
 */
export function gerarBoleto(input?: Partial<BoletoInput>): BoletoJsonOutput {
  return gerarBoletoAleatorio(input);
}
