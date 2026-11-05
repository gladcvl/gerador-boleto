import { mod11 } from '../algorithm/checksum.js';
import { dvBarraModulo11, fatorVencimento, linhaDigitavelPadrao } from '../algorithm/febraban.js';
import type { BankModule, BoletoRuntime } from '../types.js';
import { BoletoValidationError, digitos } from '../util/validate.js';
import { agenciaFormatada, inserirDv, juntarAgenciaCodigo, valorBarras } from './common.js';

/** DV do código do beneficiário (6 posições) — Anexo VI SIGCB */
function dvCodigoBeneficiario(codigo6: string): number {
  return mod11(codigo6, 9, 0);
}

/** DV do campo livre (24 posições sem o DV) — pesos fixos SIGCB */
function dvCampoLivre(campo24: string): number {
  const indices = '987654329876543298765432';
  let soma = 0;
  for (let i = 0; i < 24; i++) {
    soma += Number.parseInt(campo24[i]!, 10) * Number.parseInt(indices[i]!, 10);
  }
  const digito = 11 - (soma % 11);
  return digito > 9 ? 0 : digito;
}

function montarCampoLivre(cedente6: string, dvCedente: number, nossoNumero17: string): string {
  const nn = nossoNumero17;
  const campo =
    cedente6 +
    String(dvCedente) +
    nn.substring(2, 5) + // sequência 1
    nn.substring(0, 1) + // constante 1: tipo de cobrança (carteira)
    nn.substring(5, 8) + // sequência 2
    nn.substring(1, 2) + // constante 2: identificador de emissão
    nn.substring(8, 17); // sequência 3
  return campo + String(dvCampoLivre(campo));
}

const CARTEIRAS_VALIDAS = new Set(['1', '2']);

/**
 * Normaliza carteira e nosso número SIGCB.
 *
 * O nosso número SIGCB tem 17 posições: carteira (1 = registrada, 2 = sem registro)
 * + identificador de emissão (4 = beneficiário) + 15 dígitos livres.
 * Aceita `carteira` '1'/'2' ou '14'/'24' (carteira + emissão), e nosso número
 * com até 15 dígitos ou com os 17 completos (desde que coerentes com a carteira).
 */
function carteiraEmissao(boleto: BoletoRuntime): { carteira: string; emissao: string } {
  const carteiraRaw = digitos(boleto.carteira ?? '1', 'carteira', 2).replace(/^0/, '');
  if (carteiraRaw.length === 1) {
    const emissao = digitos(boleto.identificadorEmissao ?? '4', 'identificadorEmissao', 1);
    return { carteira: carteiraRaw, emissao };
  }

  const emissao = carteiraRaw.charAt(1);
  if (
    boleto.identificadorEmissao != null &&
    digitos(boleto.identificadorEmissao, 'identificadorEmissao', 1) !== emissao
  ) {
    throw new BoletoValidationError(
      'identificadorEmissao',
      `diverge da carteira "${carteiraRaw}" (que já indica emissão ${emissao}).`,
    );
  }
  return { carteira: carteiraRaw.charAt(0), emissao };
}

function nossoNumeroSigcb(
  boleto: BoletoRuntime,
  prefixo: string,
): { prefixo: string; nn15: string } {
  const nnBruto = digitos(boleto.nossoNumero, 'nossoNumero', 17).replace(/^0+(?=\d)/, '');
  if (nnBruto.length <= 15) {
    return { prefixo, nn15: nnBruto.padStart(15, '0') };
  }
  if (nnBruto.length === 16) {
    throw new BoletoValidationError(
      'nossoNumero',
      `deve ter até 15 dígitos (ou 17 incluindo carteira e emissão); recebido "${nnBruto}".`,
    );
  }
  if (boleto.carteira != null && nnBruto.slice(0, 2) !== prefixo) {
    throw new BoletoValidationError(
      'nossoNumero',
      `com 17 dígitos deve começar com carteira+emissão "${prefixo}" (recebido "${nnBruto}"). Informe apenas os 15 dígitos livres.`,
    );
  }
  return { prefixo: nnBruto.slice(0, 2), nn15: nnBruto.slice(2) };
}

function campos(boleto: BoletoRuntime) {
  const informado = carteiraEmissao(boleto);
  const { prefixo, nn15 } = nossoNumeroSigcb(boleto, informado.carteira + informado.emissao);
  const carteira = prefixo.charAt(0);
  const emissao = prefixo.charAt(1);

  if (!CARTEIRAS_VALIDAS.has(carteira)) {
    throw new BoletoValidationError(
      'carteira',
      `Caixa SIGCB aceita carteira 1 (registrada) ou 2 (sem registro), ou "14"/"24"; recebido "${String(boleto.carteira)}".`,
    );
  }

  const codigo = digitos(boleto.codigoCedente ?? boleto.codigo_beneficiario, 'codigoCedente', 6);
  return { carteira, emissao, nn15, nn17: carteira + emissao + nn15, codigo };
}

export const caixa: BankModule = {
  options: { codigo: '104', digito: '0', nome: 'Caixa Econômica Federal' },

  codBarras(boleto: BoletoRuntime): string {
    const c = campos(boleto);
    const fator = fatorVencimento(boleto.dataVencimento);
    const campoLivre25 = montarCampoLivre(c.codigo, dvCodigoBeneficiario(c.codigo), c.nn17);
    const barra = `${caixa.options.codigo}9${fator}${valorBarras(boleto)}${campoLivre25}`;
    return inserirDv(barra, dvBarraModulo11(barra));
  },

  linhaDigitavel(codBarras: string): string {
    return linhaDigitavelPadrao(codBarras);
  },

  nossoNumeroDv(boleto: BoletoRuntime) {
    return mod11(campos(boleto).nn17, 9, 0);
  },

  nossoNumeroFormatado(boleto: BoletoRuntime): string {
    const c = campos(boleto);
    return `${c.carteira}${c.emissao}/${c.nn15}-${mod11(c.nn17, 9, 0)}`;
  },

  agenciaCodigoBeneficiario(boleto: BoletoRuntime): string {
    const c = campos(boleto);
    return juntarAgenciaCodigo(
      agenciaFormatada(boleto),
      `${c.codigo}-${dvCodigoBeneficiario(c.codigo)}`,
    );
  },
};

/** Exposto para testes e para o CNAB. */
export const caixaInterno = { campos, dvCodigoBeneficiario };
