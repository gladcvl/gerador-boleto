import { mod11 } from '../algorithm/checksum.js';
import { dvBarraModulo11, fatorVencimento, linhaDigitavelPadrao } from '../algorithm/febraban.js';
import type { BankModule, BoletoRuntime } from '../types.js';
import { digitos } from '../util/validate.js';
import {
  agenciaFormatada,
  contaFormatada,
  inserirDv,
  juntarAgenciaCodigo,
  valorBarras,
} from './common.js';

function campos(boleto: BoletoRuntime) {
  return {
    agencia: digitos(boleto.agencia, 'agencia', 4),
    carteira: digitos(boleto.carteira, 'carteira', 2),
    nossoNumero: digitos(boleto.nossoNumero, 'nossoNumero', 11),
    conta: digitos(boleto.codigoCedente, 'codigoCedente', 7),
  };
}

/**
 * DV do nosso número Bradesco: módulo 11, pesos 2 a 7, sobre carteira (2) +
 * nosso número (11). Resto 0 → '0'; resto 1 → 'P'; demais → 11 - resto.
 */
export function dvNossoNumeroBradesco(carteira: string, nossoNumero: string): number | 'P' {
  const resto = mod11(carteira + nossoNumero, 7, 1);
  if (resto === 0) {
    return 0;
  }
  if (resto === 1) {
    return 'P';
  }
  return 11 - resto;
}

export const bradesco: BankModule = {
  options: { codigo: '237', nome: 'Banco Bradesco S.A.' },

  codBarras(boleto: BoletoRuntime): string {
    const { agencia, carteira, nossoNumero, conta } = campos(boleto);
    const fator = fatorVencimento(boleto.dataVencimento);

    // Campo livre: agência(4) + carteira(2) + nosso número(11) + conta(7) + zero(1)
    const barra = `${bradesco.options.codigo}9${fator}${valorBarras(boleto)}${agencia}${carteira}${nossoNumero}${conta}0`;
    return inserirDv(barra, dvBarraModulo11(barra));
  },

  linhaDigitavel(codBarras: string): string {
    return linhaDigitavelPadrao(codBarras);
  },

  nossoNumeroDv(boleto: BoletoRuntime) {
    const { carteira, nossoNumero } = campos(boleto);
    return dvNossoNumeroBradesco(carteira, nossoNumero);
  },

  nossoNumeroFormatado(boleto: BoletoRuntime): string {
    const { carteira, nossoNumero } = campos(boleto);
    return `${carteira}/${nossoNumero}-${dvNossoNumeroBradesco(carteira, nossoNumero)}`;
  },

  agenciaCodigoBeneficiario(boleto: BoletoRuntime): string {
    const { conta } = campos(boleto);
    return juntarAgenciaCodigo(agenciaFormatada(boleto), contaFormatada(conta, boleto));
  },
};
