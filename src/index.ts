import { criarBoleto as internalCriar, gerarBoleto as internalGerar } from './generator.js';

/**
 * Gera um boleto bancário de forma flexível — ideal para massa de testes.
 *
 * Campos não informados são preenchidos ALEATORIAMENTE (banco, agência,
 * nosso número...). Para boletos reais use {@link criarBoleto}, que exige
 * todos os dados e nunca inventa valores.
 *
 * @example
 * // 1. Geração totalmente aleatória (útil para testes rápidos de UI)
 * const boletoVazio = gerarBoleto();
 *
 * @example
 * // 2. Geração com campos essenciais
 * const boletoComDados = gerarBoleto({
 *   banco: 'bradesco',
 *   dataEmissao: '15/05/2026',
 *   dataVencimento: '25/05/2026',
 *   valorDocumento: 99900, // centavos → R$ 999,00
 *   nossoNumero: '12345678901',
 *   agencia: '1229',
 *   codigoCedente: '0000469',
 *   carteira: '25',
 * });
 */
export const gerarBoleto = internalGerar;

/**
 * Cria um boleto real a partir de dados completos. Lança
 * {@link BoletoValidationError} se faltar campo obrigatório ou se algum
 * campo for inválido (nunca trunca nem preenche aleatoriamente).
 *
 * @example
 * const boleto = criarBoleto({
 *   banco: 'itau',
 *   dataVencimento: '25/05/2026',
 *   valorDocumento: 15000,
 *   nossoNumero: '12345678',
 *   agencia: '1234',
 *   codigoCedente: '12345',
 *   carteira: '109',
 *   numeroDocumento: 'NF-1020',
 *   beneficiario: { nome: 'Empresa LTDA', documento: '12.345.678/0001-95' },
 *   pagador: { nome: 'Fulano de Tal', documento: '123.456.789-09' },
 * });
 */
export const criarBoleto = internalCriar;

// Exporta tipos essenciais para o usuário final
export type {
  BankId,
  BoletoInput,
  BoletoJsonOutput,
  Endereco,
  JsonValue,
  Pessoa,
} from './types.js';
export { formatarDataBr, normalizeDate } from './util/date.js';
export { BoletoValidationError } from './util/validate.js';
