/**
 * Layout FEBRABAN CNAB 240 — Cobrança (base comum).
 *
 * Referência: "Layout Padrão de Arquivos CNAB 240 — FEBRABAN", serviço 01
 * (cobrança). Cada banco sobrescreve as faixas em que diverge (ver ./bancos).
 */
import { alfa, brancos, type Campo, num } from './layout.js';

export interface Layout240 {
  headerArquivo: Campo[];
  headerLote: Campo[];
  segmentoP: Campo[];
  segmentoQ: Campo[];
  segmentoR: Campo[];
  trailerLote: Campo[];
  trailerArquivo: Campo[];
  segmentoT: Campo[];
  segmentoU: Campo[];
}

const controle = (registro: string, lote?: string): Campo[] => [
  num('banco', 1, 3),
  lote === undefined ? num('lote', 4, 7) : num('lote', 4, 7, lote),
  num('registro', 8, 8, registro),
];

const detalhe = (segmento: string): Campo[] => [
  ...controle('3'),
  num('sequencial', 9, 13),
  alfa('segmento', 14, 14, segmento),
  brancos(15, 15),
  num('movimento', 16, 17),
];

export const FEBRABAN_240: Layout240 = {
  headerArquivo: [
    ...controle('0', '0000'),
    brancos(9, 17),
    num('tipoInscricao', 18, 18),
    num('inscricao', 19, 32),
    alfa('convenio', 33, 52),
    num('agencia', 53, 57),
    alfa('agenciaDv', 58, 58),
    num('conta', 59, 70),
    alfa('contaDv', 71, 71),
    alfa('agenciaContaDv', 72, 72),
    alfa('nomeEmpresa', 73, 102),
    alfa('nomeBanco', 103, 132),
    brancos(133, 142),
    num('codigoRemessa', 143, 143),
    num('dataGeracao', 144, 151),
    num('horaGeracao', 152, 157),
    num('nsa', 158, 163),
    num('versaoLayout', 164, 166),
    num('densidade', 167, 171),
    alfa('reservadoBanco', 172, 191),
    alfa('reservadoEmpresa', 192, 211),
    brancos(212, 240),
  ],

  headerLote: [
    ...controle('1'),
    alfa('operacao', 9, 9),
    num('servico', 10, 11, '01'),
    brancos(12, 13),
    num('versaoLote', 14, 16),
    brancos(17, 17),
    num('tipoInscricao', 18, 18),
    num('inscricao', 19, 33),
    alfa('convenio', 34, 53),
    num('agencia', 54, 58),
    alfa('agenciaDv', 59, 59),
    num('conta', 60, 71),
    alfa('contaDv', 72, 72),
    alfa('agenciaContaDv', 73, 73),
    alfa('nomeEmpresa', 74, 103),
    alfa('mensagem1', 104, 143),
    alfa('mensagem2', 144, 183),
    num('numeroRemessa', 184, 191),
    num('dataGravacao', 192, 199),
    num('dataCredito', 200, 207),
    brancos(208, 240),
  ],

  segmentoP: [
    ...detalhe('P'),
    num('agencia', 18, 22),
    alfa('agenciaDv', 23, 23),
    num('conta', 24, 35),
    alfa('contaDv', 36, 36),
    alfa('agenciaContaDv', 37, 37),
    alfa('nossoNumero', 38, 57),
    num('carteira', 58, 58),
    num('formaCadastramento', 59, 59),
    num('tipoDocumento', 60, 60),
    num('emissao', 61, 61),
    num('distribuicao', 62, 62),
    alfa('numeroDocumento', 63, 77),
    num('vencimento', 78, 85),
    num('valor', 86, 100),
    num('agenciaCobradora', 101, 105),
    alfa('agenciaCobradoraDv', 106, 106),
    num('especie', 107, 108),
    alfa('aceite', 109, 109),
    num('dataEmissao', 110, 117),
    num('codigoJuros', 118, 118),
    num('dataJuros', 119, 126),
    num('juros', 127, 141),
    num('codigoDesconto', 142, 142),
    num('dataDesconto', 143, 150),
    num('desconto', 151, 165),
    num('iof', 166, 180),
    num('abatimento', 181, 195),
    alfa('usoEmpresa', 196, 220),
    num('codigoProtesto', 221, 221),
    num('prazoProtesto', 222, 223),
    num('codigoBaixa', 224, 224),
    num('prazoBaixa', 225, 227),
    num('moeda', 228, 229, '09'),
    num('contrato', 230, 239),
    brancos(240, 240),
  ],

  segmentoQ: [
    ...detalhe('Q'),
    num('tipoInscricao', 18, 18),
    num('inscricao', 19, 33),
    alfa('nome', 34, 73),
    alfa('endereco', 74, 113),
    alfa('bairro', 114, 128),
    num('cep', 129, 136),
    alfa('cidade', 137, 151),
    alfa('uf', 152, 153),
    num('sacadorTipoInscricao', 154, 154),
    num('sacadorInscricao', 155, 169),
    alfa('sacadorNome', 170, 209),
    num('bancoCorrespondente', 210, 212),
    alfa('nossoNumeroCorrespondente', 213, 232),
    brancos(233, 240),
  ],

  segmentoR: [
    ...detalhe('R'),
    num('codigoDesconto2', 18, 18),
    num('dataDesconto2', 19, 26),
    num('desconto2', 27, 41),
    num('codigoDesconto3', 42, 42),
    num('dataDesconto3', 43, 50),
    num('desconto3', 51, 65),
    num('codigoMulta', 66, 66),
    num('dataMulta', 67, 74),
    num('multa', 75, 89),
    alfa('informacaoPagador', 90, 99),
    alfa('mensagem3', 100, 139),
    alfa('mensagem4', 140, 179),
    brancos(180, 199),
    num('ocorrenciaPagador', 200, 207),
    num('bancoDebito', 208, 210),
    num('agenciaDebito', 211, 215),
    alfa('agenciaDebitoDv', 216, 216),
    num('contaDebito', 217, 228),
    alfa('contaDebitoDv', 229, 229),
    alfa('agenciaContaDebitoDv', 230, 230),
    num('avisoDebito', 231, 231),
    brancos(232, 240),
  ],

  trailerLote: [
    ...controle('5'),
    brancos(9, 17),
    num('quantidadeRegistros', 18, 23),
    brancos(24, 240),
  ],

  trailerArquivo: [
    ...controle('9', '9999'),
    brancos(9, 17),
    num('quantidadeLotes', 18, 23),
    num('quantidadeRegistros', 24, 29),
    brancos(30, 240),
  ],

  segmentoT: [
    ...detalhe('T'),
    num('agencia', 18, 22),
    alfa('agenciaDv', 23, 23),
    num('conta', 24, 35),
    alfa('contaDv', 36, 36),
    alfa('agenciaContaDv', 37, 37),
    alfa('nossoNumero', 38, 57),
    num('carteira', 58, 58),
    alfa('numeroDocumento', 59, 73),
    num('vencimento', 74, 81),
    num('valor', 82, 96),
    num('bancoCobrador', 97, 99),
    num('agenciaCobradora', 100, 104),
    alfa('agenciaCobradoraDv', 105, 105),
    alfa('usoEmpresa', 106, 130),
    num('moeda', 131, 132),
    num('pagadorTipoInscricao', 133, 133),
    num('pagadorInscricao', 134, 148),
    alfa('pagadorNome', 149, 188),
    alfa('contrato', 189, 198),
    num('tarifa', 199, 213),
    alfa('motivos', 214, 223),
    brancos(224, 240),
  ],

  segmentoU: [
    ...detalhe('U'),
    num('jurosMultaEncargos', 18, 32),
    num('desconto', 33, 47),
    num('abatimento', 48, 62),
    num('iof', 63, 77),
    num('valorPago', 78, 92),
    num('valorLiquido', 93, 107),
    num('outrasDespesas', 108, 122),
    num('outrosCreditos', 123, 137),
    num('dataOcorrencia', 138, 145),
    num('dataCredito', 146, 153),
    alfa('ocorrenciaPagador', 154, 157),
    num('dataOcorrenciaPagador', 158, 165),
    num('valorOcorrenciaPagador', 166, 180),
    alfa('complementoOcorrencia', 181, 210),
    num('bancoCorrespondente', 211, 213),
    alfa('nossoNumeroCorrespondente', 214, 233),
    brancos(234, 240),
  ],
};

/**
 * Espécies de título FEBRABAN (nota C015). Bancos com tabela própria
 * (ex.: Itaú) sobrescrevem em seus módulos.
 */
export const ESPECIES_FEBRABAN: Record<string, string> = Object.fromEntries(
  (
    'CH:01 DM:02 DMI:03 DS:04 DSI:05 DR:06 LC:07 NCC:08 NCE:09 NCI:10 NCR:11 NP:12 NPR:13 ' +
    'TM:14 TS:15 NS:16 RC:17 FAT:18 ND:19 AP:20 ME:21 PC:22 NF:23 DD:24 CPR:25 CC:31 BDP:32 OUTROS:99'
  )
    .split(' ')
    .map((par) => par.split(':')),
);
