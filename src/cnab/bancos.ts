/**
 * Particularidades de CNAB 240 por banco, aplicadas sobre o layout FEBRABAN.
 *
 * IMPORTANTE: cada banco publica seu próprio manual de CNAB 240 e todos
 * exigem homologação (envio de arquivo-teste) antes de aceitar remessas em
 * produção. As posições abaixo seguem o FEBRABAN e as divergências
 * conhecidas de cada banco; confira com o manual do seu convênio. Como o
 * layout é declarativo, ajustar uma posição é uma alteração de uma linha.
 */
import { caixaInterno } from '../bank/caixa.js';
import type { BankId, BoletoJsonOutput, BoletoRuntime } from '../types.js';
import { digitos } from '../util/validate.js';
import { ESPECIES_FEBRABAN, FEBRABAN_240, type Layout240 } from './febraban240.js';
import { alfa, brancos, CnabError, type Dados, num, substituir, zeros } from './layout.js';

/** Dados da conta de cobrança do beneficiário (empresa que emite os boletos). */
export interface BeneficiarioCnab {
  nome: string;
  /** CPF ou CNPJ */
  documento: string;
  /** Agência sem DV */
  agencia: string;
  agenciaDv?: string;
  /** Conta corrente sem DV (Bradesco, Itaú, Santander) */
  conta?: string;
  contaDv?: string;
  /**
   * Bradesco: código do convênio/empresa no banco (até 20 dígitos).
   * Santander: código de transmissão (até 15 dígitos).
   */
  convenio?: string;
  /**
   * Caixa: código do beneficiário (6 dígitos).
   * Santander: código do beneficiário / conta cobrança (até 9 dígitos).
   */
  codigoBeneficiario?: string;
  /** Santander: DV da conta cobrança */
  codigoBeneficiarioDv?: string;
  /** Banco do Brasil: carteira (2) e variação da carteira (3) do convênio */
  carteira?: string;
  variacaoCarteira?: string;
}

export interface Banco240 {
  id: BankId;
  codigo: string;
  nomeArquivo: string;
  layout: Layout240;
  versaoArquivo: string;
  versaoLote: string;
  densidade: string;
  especies: Record<string, string>;
  /** Valores padrão dos códigos do segmento P */
  padroesP: Dados;
  /** Campos da conta usados em header de arquivo e de lote */
  dadosConta(b: BeneficiarioCnab): Dados;
  /** Campos do título (nosso número, conta) no segmento P */
  dadosTitulo(boleto: BoletoJsonOutput, b: BeneficiarioCnab): Dados;
  /** Garante que o boleto pertence à conta do beneficiário da remessa */
  validarTitulo(boleto: BoletoJsonOutput, b: BeneficiarioCnab): void;
  /** Nosso número (sem DV) lido do segmento T */
  nossoNumeroRetorno(t: Record<string, string>): string;
}

function exigir(valor: string | undefined, campo: string, banco: string): string {
  if (!valor) {
    throw new CnabError(`beneficiario.${campo} é obrigatório para ${banco}.`);
  }
  return valor;
}

function conferir(a: string, b: string, campo: string): void {
  if (a !== b) {
    throw new CnabError(
      `Boleto não pertence ao beneficiário da remessa: ${campo} do boleto é ${a}, do beneficiário é ${b}.`,
    );
  }
}

const rt = (b: BoletoJsonOutput) => b as unknown as BoletoRuntime;

// ─── Bradesco ──────────────────────────────────────────────────────────────

const bradescoLayout: Layout240 = {
  ...FEBRABAN_240,
  headerArquivo: substituir(FEBRABAN_240.headerArquivo, 33, 52, [num('convenio', 33, 52)]),
  headerLote: substituir(FEBRABAN_240.headerLote, 34, 53, [num('convenio', 34, 53)]),
  // Identificação do título: carteira(3) + zeros(5) + nosso número(11) + DV(1)
  segmentoP: substituir(FEBRABAN_240.segmentoP, 38, 57, [
    num('nnCarteira', 38, 40),
    zeros(41, 45),
    num('nossoNumero', 46, 56),
    alfa('nossoNumeroDv', 57, 57),
  ]),
  segmentoT: substituir(FEBRABAN_240.segmentoT, 38, 57, [
    num('nnCarteira', 38, 40),
    zeros(41, 45),
    num('nossoNumero', 46, 56),
    alfa('nossoNumeroDv', 57, 57),
  ]),
};

const bradesco: Banco240 = {
  id: 'bradesco',
  codigo: '237',
  nomeArquivo: 'BRADESCO',
  layout: bradescoLayout,
  versaoArquivo: '084',
  versaoLote: '042',
  densidade: '06250',
  especies: ESPECIES_FEBRABAN,
  padroesP: {
    carteira: '1',
    formaCadastramento: '1',
    tipoDocumento: '1',
    emissao: '2',
    distribuicao: '2',
  },
  dadosConta(b) {
    return {
      convenio: exigir(b.convenio, 'convenio', 'Bradesco'),
      agencia: b.agencia,
      agenciaDv: b.agenciaDv,
      conta: exigir(b.conta, 'conta', 'Bradesco'),
      contaDv: b.contaDv,
    };
  },
  dadosTitulo(boleto, b) {
    return {
      ...this.dadosConta(b),
      nnCarteira: digitos(boleto.carteira, 'carteira', 2),
      nossoNumero: digitos(boleto.nossoNumero, 'nossoNumero', 11),
      nossoNumeroDv: String(boleto.nossoNumeroDv),
    };
  },
  validarTitulo(boleto, b) {
    conferir(digitos(boleto.agencia, 'agencia', 4), digitos(b.agencia, 'agencia', 4), 'agência');
    conferir(
      digitos(boleto.codigoCedente, 'codigoCedente', 7),
      digitos(exigir(b.conta, 'conta', 'Bradesco'), 'conta', 7),
      'conta',
    );
  },
  nossoNumeroRetorno: (t) => t.nossoNumero!,
};

// ─── Itaú ──────────────────────────────────────────────────────────────────

/** Bloco de conta no padrão Itaú: 0 + agência(4) + branco + zeros(7) + conta(5) + branco + DAC */
function contaItau(de: number, prefixo = ''): ReturnType<typeof num>[] {
  return [
    zeros(de, de),
    num(`${prefixo}agencia`, de + 1, de + 4),
    brancos(de + 5, de + 5),
    zeros(de + 6, de + 12),
    num(`${prefixo}conta`, de + 13, de + 17),
    brancos(de + 18, de + 18),
    alfa(`${prefixo}contaDv`, de + 19, de + 19),
  ];
}

const itauLayout: Layout240 = {
  ...FEBRABAN_240,
  headerArquivo: substituir(
    substituir(FEBRABAN_240.headerArquivo, 9, 72, [
      brancos(9, 14),
      num('versaoLayout', 15, 17),
      num('tipoInscricao', 18, 18),
      num('inscricao', 19, 32),
      brancos(33, 52),
      ...contaItau(53),
    ]),
    158,
    240,
    [num('nsa', 158, 163), zeros(164, 168), brancos(169, 240)],
  ),
  headerLote: substituir(FEBRABAN_240.headerLote, 12, 240, [
    zeros(12, 13),
    num('versaoLote', 14, 16),
    brancos(17, 17),
    num('tipoInscricao', 18, 18),
    num('inscricao', 19, 33),
    brancos(34, 53),
    ...contaItau(54),
    alfa('nomeEmpresa', 74, 103),
    brancos(104, 183),
    num('numeroRemessa', 184, 191),
    num('dataGravacao', 192, 199),
    zeros(200, 207),
    brancos(208, 240),
  ]),
  segmentoP: substituir(
    substituir(FEBRABAN_240.segmentoP, 18, 77, [
      ...contaItau(18),
      num('nnCarteira', 38, 40),
      num('nossoNumero', 41, 48),
      num('nossoNumeroDv', 49, 49),
      brancos(50, 57),
      zeros(58, 62),
      alfa('numeroDocumento', 63, 72),
      brancos(73, 77),
    ]),
    224,
    240,
    [num('codigoBaixa', 224, 224), num('prazoBaixa', 225, 226), zeros(227, 240)],
  ),
  segmentoQ: substituir(
    substituir(FEBRABAN_240.segmentoQ, 34, 73, [alfa('nome', 34, 63), brancos(64, 73)]),
    170,
    240,
    [alfa('sacadorNome', 170, 199), brancos(200, 209), zeros(210, 212), brancos(213, 240)],
  ),
  segmentoT: substituir(FEBRABAN_240.segmentoT, 18, 73, [
    ...contaItau(18),
    num('nnCarteira', 38, 40),
    num('nossoNumero', 41, 48),
    num('nossoNumeroDv', 49, 49),
    brancos(50, 57),
    zeros(58, 58),
    alfa('numeroDocumento', 59, 68),
    brancos(69, 73),
  ]),
};

const itau: Banco240 = {
  id: 'itau',
  codigo: '341',
  nomeArquivo: 'BANCO ITAU SA',
  layout: itauLayout,
  versaoArquivo: '040',
  versaoLote: '030',
  densidade: '00000',
  // Itaú usa tabela própria de espécies
  especies: Object.fromEntries(
    'DM:01 NP:02 NS:03 ME:04 RC:05 CT:06 DS:08 LC:09 ND:13 DD:15 OUTROS:99'
      .split(' ')
      .map((par) => par.split(':')),
  ),
  padroesP: {},
  dadosConta(b) {
    return { agencia: b.agencia, conta: exigir(b.conta, 'conta', 'Itaú'), contaDv: b.contaDv };
  },
  dadosTitulo(boleto, b) {
    return {
      ...this.dadosConta(b),
      nnCarteira: digitos(boleto.carteira, 'carteira', 3),
      nossoNumero: digitos(boleto.nossoNumero, 'nossoNumero', 8),
      nossoNumeroDv: String(boleto.nossoNumeroDv),
    };
  },
  validarTitulo(boleto, b) {
    conferir(digitos(boleto.agencia, 'agencia', 4), digitos(b.agencia, 'agencia', 4), 'agência');
    conferir(
      digitos(boleto.codigoCedente, 'codigoCedente', 5),
      digitos(exigir(b.conta, 'conta', 'Itaú'), 'conta', 5),
      'conta',
    );
  },
  nossoNumeroRetorno: (t) => t.nossoNumero!,
};

// ─── Santander ─────────────────────────────────────────────────────────────

const santanderLayout: Layout240 = {
  ...FEBRABAN_240,
  headerArquivo: substituir(
    substituir(FEBRABAN_240.headerArquivo, 9, 72, [
      brancos(9, 16),
      num('tipoInscricao', 17, 17),
      num('inscricao', 18, 32),
      num('convenio', 33, 47),
      brancos(48, 72),
    ]),
    152,
    240,
    [brancos(152, 157), num('nsa', 158, 163), num('versaoLayout', 164, 166), brancos(167, 240)],
  ),
  headerLote: substituir(FEBRABAN_240.headerLote, 12, 240, [
    brancos(12, 13),
    num('versaoLote', 14, 16),
    brancos(17, 17),
    num('tipoInscricao', 18, 18),
    num('inscricao', 19, 33),
    brancos(34, 53),
    num('convenio', 54, 68),
    brancos(69, 73),
    alfa('nomeEmpresa', 74, 103),
    alfa('mensagem1', 104, 143),
    alfa('mensagem2', 144, 183),
    num('numeroRemessa', 184, 191),
    num('dataGravacao', 192, 199),
    brancos(200, 240),
  ]),
  segmentoP: substituir(
    substituir(FEBRABAN_240.segmentoP, 18, 62, [
      num('agencia', 18, 21),
      alfa('agenciaDv', 22, 22),
      num('conta', 23, 31),
      alfa('contaDv', 32, 32),
      num('contaCobranca', 33, 41),
      alfa('contaCobrancaDv', 42, 42),
      brancos(43, 44),
      num('nossoNumero', 45, 57),
      num('carteira', 58, 58),
      num('formaCadastramento', 59, 59),
      num('tipoDocumento', 60, 60),
      brancos(61, 62),
    ]),
    228,
    240,
    [num('moeda', 228, 229, '00'), brancos(230, 240)],
  ),
  segmentoT: substituir(FEBRABAN_240.segmentoT, 18, 240, [
    num('agencia', 18, 21),
    alfa('agenciaDv', 22, 22),
    num('conta', 23, 31),
    alfa('contaDv', 32, 32),
    brancos(33, 40),
    num('nossoNumero', 41, 53),
    num('carteira', 54, 54),
    alfa('numeroDocumento', 55, 69),
    num('vencimento', 70, 77),
    num('valor', 78, 92),
    num('bancoCobrador', 93, 95),
    num('agenciaCobradora', 96, 99),
    alfa('agenciaCobradoraDv', 100, 100),
    alfa('usoEmpresa', 101, 125),
    num('moeda', 126, 127),
    num('pagadorTipoInscricao', 128, 128),
    num('pagadorInscricao', 129, 143),
    alfa('pagadorNome', 144, 183),
    alfa('contaCobranca', 184, 193),
    num('tarifa', 194, 208),
    alfa('motivos', 209, 218),
    brancos(219, 240),
  ]),
};

const santander: Banco240 = {
  id: 'santander',
  codigo: '033',
  nomeArquivo: 'BANCO SANTANDER',
  layout: santanderLayout,
  versaoArquivo: '040',
  versaoLote: '030',
  densidade: '00000',
  especies: ESPECIES_FEBRABAN,
  padroesP: { carteira: '1', formaCadastramento: '1', tipoDocumento: '1' },
  dadosConta(b) {
    return {
      convenio: exigir(b.convenio, 'convenio (código de transmissão)', 'Santander'),
      agencia: b.agencia,
      agenciaDv: b.agenciaDv,
      conta: exigir(b.conta, 'conta', 'Santander'),
      contaDv: b.contaDv,
    };
  },
  dadosTitulo(boleto, b) {
    return {
      ...this.dadosConta(b),
      contaCobranca: exigir(b.codigoBeneficiario, 'codigoBeneficiario', 'Santander'),
      contaCobrancaDv: b.codigoBeneficiarioDv,
      // 12 dígitos + DV
      nossoNumero: digitos(boleto.nossoNumero, 'nossoNumero', 12) + String(boleto.nossoNumeroDv),
    };
  },
  validarTitulo(boleto, b) {
    conferir(
      digitos(boleto.codigoCedente, 'codigoCedente', 9),
      digitos(
        exigir(b.codigoBeneficiario, 'codigoBeneficiario', 'Santander'),
        'codigoBeneficiario',
        9,
      ),
      'código do beneficiário',
    );
  },
  nossoNumeroRetorno: (t) => t.nossoNumero!.slice(0, 12),
};

// ─── Caixa (SIGCB) ─────────────────────────────────────────────────────────

const caixaLayout: Layout240 = {
  ...FEBRABAN_240,
  headerArquivo: substituir(FEBRABAN_240.headerArquivo, 33, 72, [
    zeros(33, 52),
    num('agencia', 53, 57),
    alfa('agenciaDv', 58, 58),
    num('codigoBeneficiario', 59, 64),
    zeros(65, 72),
  ]),
  headerLote: substituir(FEBRABAN_240.headerLote, 12, 73, [
    zeros(12, 13),
    num('versaoLote', 14, 16),
    brancos(17, 17),
    num('tipoInscricao', 18, 18),
    num('inscricao', 19, 33),
    num('codigoBeneficiario', 34, 39),
    zeros(40, 53),
    num('agencia', 54, 58),
    alfa('agenciaDv', 59, 59),
    num('codigoBeneficiario2', 60, 65),
    zeros(66, 73),
  ]),
  segmentoP: substituir(FEBRABAN_240.segmentoP, 18, 77, [
    num('agencia', 18, 22),
    alfa('agenciaDv', 23, 23),
    num('codigoBeneficiario', 24, 29),
    zeros(30, 40),
    num('modalidade', 41, 42),
    num('nossoNumero', 43, 57),
    num('carteira', 58, 58),
    num('formaCadastramento', 59, 59),
    num('tipoDocumento', 60, 60),
    num('emissao', 61, 61),
    num('distribuicao', 62, 62),
    alfa('numeroDocumento', 63, 73),
    brancos(74, 77),
  ]),
  segmentoT: substituir(FEBRABAN_240.segmentoT, 18, 73, [
    num('agencia', 18, 22),
    alfa('agenciaDv', 23, 23),
    num('codigoBeneficiario', 24, 29),
    zeros(30, 40),
    num('modalidade', 41, 42),
    num('nossoNumero', 43, 57),
    num('carteira', 58, 58),
    alfa('numeroDocumento', 59, 69),
    brancos(70, 73),
  ]),
};

const caixa: Banco240 = {
  id: 'caixa',
  codigo: '104',
  nomeArquivo: 'CAIXA ECONOMICA FEDERAL',
  layout: caixaLayout,
  versaoArquivo: '107',
  versaoLote: '067',
  densidade: '00000',
  especies: ESPECIES_FEBRABAN,
  padroesP: {
    carteira: '1',
    formaCadastramento: '1',
    tipoDocumento: '2',
    emissao: '2',
    distribuicao: '0',
  },
  dadosConta(b) {
    const codigo = exigir(b.codigoBeneficiario, 'codigoBeneficiario', 'Caixa');
    return {
      agencia: b.agencia,
      agenciaDv: b.agenciaDv,
      codigoBeneficiario: codigo,
      codigoBeneficiario2: codigo,
    };
  },
  dadosTitulo(boleto, b) {
    const c = caixaInterno.campos(rt(boleto));
    return {
      ...this.dadosConta(b),
      modalidade: c.carteira + c.emissao,
      nossoNumero: c.nn15,
    };
  },
  validarTitulo(boleto, b) {
    conferir(
      caixaInterno.campos(rt(boleto)).codigo,
      digitos(exigir(b.codigoBeneficiario, 'codigoBeneficiario', 'Caixa'), 'codigoBeneficiario', 6),
      'código do beneficiário',
    );
  },
  nossoNumeroRetorno: (t) => t.nossoNumero!,
};

// ─── Banco do Brasil ───────────────────────────────────────────────────────

/** Convênio BB no header: convênio(9) + '0014' + carteira(2) + variação(3) + brancos(2) */
function convenioBb(de: number): ReturnType<typeof num>[] {
  return [
    num('convenio', de, de + 8),
    num('produtoCobranca', de + 9, de + 12, '0014'),
    num('bbCarteira', de + 13, de + 14),
    num('bbVariacao', de + 15, de + 17),
    brancos(de + 18, de + 19),
  ];
}

const bbLayout: Layout240 = {
  ...FEBRABAN_240,
  headerArquivo: substituir(FEBRABAN_240.headerArquivo, 33, 52, convenioBb(33)),
  headerLote: substituir(FEBRABAN_240.headerLote, 34, 53, convenioBb(34)),
};

const bb: Banco240 = {
  id: 'bb',
  codigo: '001',
  nomeArquivo: 'BANCO DO BRASIL S.A.',
  layout: bbLayout,
  versaoArquivo: '083',
  versaoLote: '042',
  densidade: '00000',
  especies: ESPECIES_FEBRABAN,
  padroesP: {
    carteira: '1',
    formaCadastramento: '1',
    tipoDocumento: '1',
    emissao: '2',
    distribuicao: '2',
  },
  dadosConta(b) {
    return {
      convenio: exigir(b.convenio, 'convenio', 'Banco do Brasil'),
      bbCarteira: exigir(b.carteira, 'carteira', 'Banco do Brasil'),
      bbVariacao: exigir(b.variacaoCarteira, 'variacaoCarteira', 'Banco do Brasil'),
      agencia: b.agencia,
      agenciaDv: b.agenciaDv,
      conta: exigir(b.conta, 'conta', 'Banco do Brasil'),
      contaDv: b.contaDv,
    };
  },
  dadosTitulo(boleto, b) {
    // Nosso número como impresso, sem traço (convênio 7: 17 dígitos sem DV)
    return { ...this.dadosConta(b), nossoNumero: boleto.nossoNumeroFormatado.replace('-', '') };
  },
  validarTitulo(boleto, b) {
    conferir(
      digitos(boleto.convenio, 'convenio', 9),
      digitos(exigir(b.convenio, 'convenio', 'Banco do Brasil'), 'convenio', 9),
      'convênio',
    );
  },
  nossoNumeroRetorno: (t) => t.nossoNumero!.trim(),
};

// ─── Sicoob ────────────────────────────────────────────────────────────────

/** Identificação do título Sicoob: NN com DV (10) + parcela(2) + modalidade(2) + formulário(1) + brancos(5) */
const nossoNumeroSicoob = [
  num('nossoNumero', 38, 47),
  num('parcela', 48, 49),
  num('modalidade', 50, 51),
  num('tipoFormulario', 52, 52, '4'),
  brancos(53, 57),
];

const sicoobLayout: Layout240 = {
  ...FEBRABAN_240,
  headerArquivo: substituir(FEBRABAN_240.headerArquivo, 33, 52, [brancos(33, 52)]),
  headerLote: substituir(FEBRABAN_240.headerLote, 34, 53, [brancos(34, 53)]),
  segmentoP: substituir(FEBRABAN_240.segmentoP, 38, 57, nossoNumeroSicoob),
  segmentoT: substituir(FEBRABAN_240.segmentoT, 38, 57, [
    num('nossoNumero', 38, 47),
    alfa('identificacaoTitulo', 48, 57),
  ]),
};

const sicoob: Banco240 = {
  id: 'sicoob',
  codigo: '756',
  nomeArquivo: 'SICOOB',
  layout: sicoobLayout,
  versaoArquivo: '081',
  versaoLote: '040',
  densidade: '00000',
  especies: ESPECIES_FEBRABAN,
  padroesP: {
    carteira: '1',
    formaCadastramento: '0',
    tipoDocumento: '0',
    emissao: '2',
    distribuicao: '2',
  },
  dadosConta(b) {
    return {
      agencia: b.agencia,
      agenciaDv: b.agenciaDv,
      conta: exigir(b.conta, 'conta', 'Sicoob'),
      contaDv: b.contaDv,
    };
  },
  dadosTitulo(boleto, b) {
    return {
      ...this.dadosConta(b),
      nossoNumero: digitos(boleto.nossoNumero, 'nossoNumero', 7) + String(boleto.nossoNumeroDv),
      parcela: String(Number(boleto.parcela ?? '1')).padStart(2, '0'),
      modalidade: String(boleto.modalidade ?? '01'),
    };
  },
  validarTitulo(boleto, b) {
    conferir(
      digitos(boleto.agencia, 'agencia', 4),
      digitos(b.agencia, 'agencia', 4),
      'cooperativa',
    );
    conferir(
      digitos(boleto.codigoCedente, 'codigoCedente', 7),
      digitos(
        exigir(b.codigoBeneficiario, 'codigoBeneficiario', 'Sicoob'),
        'codigoBeneficiario',
        7,
      ),
      'código do cliente',
    );
  },
  // 10 posições = NN(7) + DV, alinhado à direita
  nossoNumeroRetorno: (t) => t.nossoNumero!.slice(-8, -1),
};

// ─── Sicredi ───────────────────────────────────────────────────────────────

const sicrediLayout: Layout240 = {
  ...FEBRABAN_240,
  headerArquivo: substituir(FEBRABAN_240.headerArquivo, 33, 52, [
    num('convenio', 33, 37),
    brancos(38, 52),
  ]),
  headerLote: substituir(FEBRABAN_240.headerLote, 34, 53, [
    num('convenio', 34, 38),
    brancos(39, 53),
  ]),
  segmentoP: substituir(FEBRABAN_240.segmentoP, 38, 57, [
    num('nossoNumero', 38, 46),
    brancos(47, 57),
  ]),
  segmentoT: substituir(FEBRABAN_240.segmentoT, 38, 57, [
    num('nossoNumero', 38, 46),
    brancos(47, 57),
  ]),
};

const sicredi: Banco240 = {
  id: 'sicredi',
  codigo: '748',
  nomeArquivo: 'SICREDI',
  layout: sicrediLayout,
  versaoArquivo: '081',
  versaoLote: '040',
  densidade: '01600',
  especies: ESPECIES_FEBRABAN,
  padroesP: {
    carteira: '1',
    formaCadastramento: '1',
    tipoDocumento: '1',
    emissao: '2',
    distribuicao: '2',
  },
  dadosConta(b) {
    return {
      convenio: exigir(b.codigoBeneficiario, 'codigoBeneficiario', 'Sicredi'),
      agencia: b.agencia,
      conta: exigir(b.conta, 'conta', 'Sicredi'),
      contaDv: b.contaDv,
    };
  },
  dadosTitulo(boleto, b) {
    return {
      ...this.dadosConta(b),
      nossoNumero: digitos(boleto.nossoNumero, 'nossoNumero', 8) + String(boleto.nossoNumeroDv),
    };
  },
  validarTitulo(boleto, b) {
    conferir(
      digitos(boleto.agencia, 'agencia', 4),
      digitos(b.agencia, 'agencia', 4),
      'cooperativa',
    );
    conferir(
      digitos(boleto.codigoCedente, 'codigoCedente', 5),
      digitos(
        exigir(b.codigoBeneficiario, 'codigoBeneficiario', 'Sicredi'),
        'codigoBeneficiario',
        5,
      ),
      'código do beneficiário',
    );
  },
  nossoNumeroRetorno: (t) => t.nossoNumero!.slice(0, 8),
};

/** Bancos sem layout CNAB 240 implementado, com o motivo. */
const SEM_CNAB_240: Partial<Record<BankId, string>> = {
  safra:
    'layout CNAB 240 do Safra não implementado (a cobrança Safra costuma usar CNAB 400). Envie o manual do seu convênio para incluirmos.',
};

export const BANCOS_240: Partial<Record<BankId, Banco240>> = {
  bradesco,
  itau,
  santander,
  caixa,
  bb,
  sicoob,
  sicredi,
};

export function banco240(id: unknown): Banco240 {
  if (typeof id === 'string' && Object.hasOwn(SEM_CNAB_240, id)) {
    throw new CnabError(`${id}: ${SEM_CNAB_240[id as BankId]}`);
  }
  if (typeof id !== 'string' || !Object.hasOwn(BANCOS_240, id)) {
    throw new CnabError(`Banco sem layout CNAB 240: ${String(id)}.`);
  }
  return BANCOS_240[id as BankId]!;
}

export function banco240PorCodigo(codigo: string): Banco240 {
  const banco = Object.values(BANCOS_240).find((b) => b.codigo === codigo);
  if (!banco) {
    throw new CnabError(`Arquivo de banco não suportado (código ${codigo}).`);
  }
  return banco;
}
