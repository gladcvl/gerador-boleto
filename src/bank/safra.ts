import { dvBarraModulo11, fatorVencimento, linhaDigitavelPadrao } from '../algorithm/febraban.js';
import type { BankModule, BoletoRuntime } from '../types.js';
import { digitos } from '../util/validate.js';
import { inserirDv, valorBarras } from './common.js';

/**
 * DV do nosso número Safra: módulo 11, pesos 2 a 9 da direita para a
 * esquerda; resto 0 → 1, resto 1 → 0, demais → 11 - resto.
 *
 * PENDENTE DE HOMOLOGAÇÃO: confirmar com boleto real/manual do convênio.
 */
export function dvNossoNumeroSafra(nossoNumero: string): number {
  let soma = 0;
  let peso = 2;
  for (let i = nossoNumero.length - 1; i >= 0; i--) {
    soma += Number(nossoNumero[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  if (resto === 0) {
    return 1;
  }
  if (resto === 1) {
    return 0;
  }
  return 11 - resto;
}

/**
 * Safra (cobrança registrada): agência com 5 posições e conta com 9
 * posições, ambas INCLUINDO os dígitos verificadores, como informados
 * pelo Safra no cadastro do convênio.
 */
function campos(boleto: BoletoRuntime) {
  const nossoNumero = digitos(boleto.nossoNumero, 'nossoNumero', 8);
  return {
    agencia: digitos(boleto.agencia, 'agencia', 5),
    conta: digitos(boleto.codigoCedente, 'codigoCedente', 9),
    nossoNumero,
    dv: dvNossoNumeroSafra(nossoNumero),
  };
}

export const safra: BankModule = {
  options: { codigo: '422', digito: '7', nome: 'Banco Safra S.A.' },

  codBarras(boleto: BoletoRuntime): string {
    const c = campos(boleto);
    // Campo livre: sistema(7) + agência(5) + conta(9) + NN(8) + DV(1) + tipo de cobrança(2 = registrada)
    const campoLivre = `7${c.agencia}${c.conta}${c.nossoNumero}${c.dv}2`;
    const barra = `${safra.options.codigo}9${fatorVencimento(boleto.dataVencimento)}${valorBarras(boleto)}${campoLivre}`;
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
    return `${nossoNumero}-${dv}`;
  },

  agenciaCodigoBeneficiario(boleto: BoletoRuntime): string {
    const c = campos(boleto);
    return `${c.agencia} / ${c.conta}`;
  },
};
