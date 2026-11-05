import { mod11 } from '../algorithm/checksum.js';
import { dvBarraModulo11, fatorVencimento, linhaDigitavelPadrao } from '../algorithm/febraban.js';
import type { BankModule, BoletoRuntime } from '../types.js';
import { digitos } from '../util/validate.js';
import { agenciaFormatada, inserirDv, juntarAgenciaCodigo, valorBarras } from './common.js';

function campos(boleto: BoletoRuntime) {
  return {
    carteira: digitos(boleto.carteira, 'carteira', 3),
    codigoBeneficiario: digitos(boleto.codigoCedente, 'codigoCedente', 7),
    nossoNumero: digitos(boleto.nossoNumero, 'nossoNumero', 12),
  };
}

export const santander: BankModule = {
  options: { codigo: '033', digito: '7', nome: 'Banco Santander (Brasil) S.A.' },

  codBarras(boleto: BoletoRuntime): string {
    const c = campos(boleto);
    const fator = fatorVencimento(boleto.dataVencimento);
    const nossoNumero = c.nossoNumero + mod11(c.nossoNumero);
    const ios = '0';

    // Campo livre: 9 + código beneficiário(7) + NN com DV(13) + IOS(1) + carteira(3)
    const barra = `${santander.options.codigo}9${fator}${valorBarras(boleto)}9${c.codigoBeneficiario}${nossoNumero}${ios}${c.carteira}`;
    return inserirDv(barra, dvBarraModulo11(barra));
  },

  linhaDigitavel(codBarras: string): string {
    return linhaDigitavelPadrao(codBarras);
  },

  nossoNumeroDv(boleto: BoletoRuntime) {
    return mod11(campos(boleto).nossoNumero);
  },

  nossoNumeroFormatado(boleto: BoletoRuntime): string {
    const { nossoNumero } = campos(boleto);
    return `${nossoNumero}-${mod11(nossoNumero)}`;
  },

  agenciaCodigoBeneficiario(boleto: BoletoRuntime): string {
    const { codigoBeneficiario } = campos(boleto);
    return juntarAgenciaCodigo(agenciaFormatada(boleto), codigoBeneficiario);
  },
};
