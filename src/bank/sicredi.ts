import { dvBarraModulo11, fatorVencimento, linhaDigitavelPadrao } from '../algorithm/febraban.js';
import type { BankModule, BoletoRuntime } from '../types.js';
import { BoletoValidationError, digitos } from '../util/validate.js';
import { inserirDv, valorBarras } from './common.js';

/** Módulo 11 com pesos 2 a 9 (da direita para a esquerda); retorna a soma % 11. */
function resto11(numero: string): number {
  let soma = 0;
  let peso = 2;
  for (let i = numero.length - 1; i >= 0; i--) {
    soma += Number(numero[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  return soma % 11;
}

/** DV do nosso número Sicredi: 11 - resto; resultado > 9 → 0. */
export function dvNossoNumeroSicredi(base: string): number {
  const dv = 11 - resto11(base);
  return dv > 9 ? 0 : dv;
}

/** DV do campo livre Sicredi: resto 0 ou 1 → 0; demais → 11 - resto. */
function dvCampoLivre(campo24: string): number {
  const resto = resto11(campo24);
  return resto <= 1 ? 0 : 11 - resto;
}

/**
 * Nosso número Sicredi (8 posições sem DV): ano (2) + byte de geração (1,
 * de 2 a 9 quando gerado pelo beneficiário) + sequencial (5).
 */
function campos(boleto: BoletoRuntime) {
  const nossoNumero = digitos(boleto.nossoNumero, 'nossoNumero', 8);
  const byte = Number(nossoNumero[2]);
  if (byte < 2) {
    throw new BoletoValidationError(
      'nossoNumero',
      `Sicredi: 3º dígito (byte de geração) deve ser de 2 a 9 para nosso número gerado pelo beneficiário (recebido "${nossoNumero}"). Formato: AA + byte + sequencial(5).`,
    );
  }
  if (boleto.posto == null || boleto.posto === '') {
    throw new BoletoValidationError(
      'posto',
      'é obrigatório para o Sicredi (posto da cooperativa, 2 dígitos).',
    );
  }
  const agencia = digitos(boleto.agencia, 'agencia', 4);
  const posto = digitos(boleto.posto, 'posto', 2);
  const codigo = digitos(boleto.codigoCedente, 'codigoCedente', 5);
  const carteira = digitos(boleto.carteira ?? '1', 'carteira', 1);
  const dv = dvNossoNumeroSicredi(agencia + posto + codigo + nossoNumero);
  return { nossoNumero, dv, agencia, posto, codigo, carteira };
}

export const sicredi: BankModule = {
  options: { codigo: '748', digito: 'X', nome: 'Banco Cooperativo Sicredi S.A.' },

  codBarras(boleto: BoletoRuntime): string {
    const c = campos(boleto);
    const comValor = Number(boleto.valorDocumento) > 0 ? '1' : '0';
    // 1 = cobrança com registro; carteira (1 = simples)
    const campo24 = `1${c.carteira}${c.nossoNumero}${c.dv}${c.agencia}${c.posto}${c.codigo}${comValor}0`;
    const barra = `${sicredi.options.codigo}9${fatorVencimento(boleto.dataVencimento)}${valorBarras(boleto)}${campo24}${dvCampoLivre(campo24)}`;
    return inserirDv(barra, dvBarraModulo11(barra));
  },

  linhaDigitavel(codBarras: string): string {
    return linhaDigitavelPadrao(codBarras);
  },

  nossoNumeroDv(boleto: BoletoRuntime) {
    return campos(boleto).dv;
  },

  nossoNumeroFormatado(boleto: BoletoRuntime): string {
    const { nossoNumero, dv } = campos(boleto);
    return `${nossoNumero.slice(0, 2)}/${nossoNumero.slice(2)}-${dv}`;
  },

  agenciaCodigoBeneficiario(boleto: BoletoRuntime): string {
    const c = campos(boleto);
    return `${c.agencia}.${c.posto}.${c.codigo}`;
  },
};
