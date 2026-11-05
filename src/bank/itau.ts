import { mod10 } from '../algorithm/checksum.js';
import { dvBarraModulo11, fatorVencimento, linhaDigitavelPadrao } from '../algorithm/febraban.js';
import type { BankModule, BoletoRuntime } from '../types.js';
import { BoletoValidationError, digitos } from '../util/validate.js';
import { inserirDv, valorBarras } from './common.js';

/** Carteiras cujo DAC do nosso número usa apenas carteira + nosso número. */
const CARTEIRAS_SIMPLES = new Set(['126', '131', '146', '150', '168']);

/**
 * Carteiras com campo livre diferente (seu número + código do cliente),
 * ainda não implementadas. Gerar com o layout padrão produziria boletos inválidos.
 */
const CARTEIRAS_LAYOUT_ESPECIAL = new Set(['106', '107', '122', '142', '143', '195', '196', '198']);

function campos(boleto: BoletoRuntime) {
  const carteira = digitos(boleto.carteira, 'carteira', 3);
  if (CARTEIRAS_LAYOUT_ESPECIAL.has(carteira)) {
    throw new BoletoValidationError(
      'carteira',
      `a carteira Itaú ${carteira} usa um layout de código de barras especial ainda não suportado.`,
    );
  }
  return {
    carteira,
    agencia: digitos(boleto.agencia, 'agencia', 4),
    conta: digitos(boleto.codigoCedente, 'codigoCedente', 5),
    nossoNumero: digitos(boleto.nossoNumero, 'nossoNumero', 8),
  };
}

function dacNossoNumero(c: ReturnType<typeof campos>): number {
  const base = CARTEIRAS_SIMPLES.has(c.carteira)
    ? c.carteira + c.nossoNumero
    : c.agencia + c.conta + c.carteira + c.nossoNumero;
  return mod10(base);
}

export const itau: BankModule = {
  options: { codigo: '341', nome: 'Itaú Unibanco S.A.' },

  codBarras(boleto: BoletoRuntime): string {
    const c = campos(boleto);
    const fator = fatorVencimento(boleto.dataVencimento);
    const dacAgenciaConta = mod10(c.agencia + c.conta);

    // Campo livre: carteira(3) + NN(8) + DAC(1) + agência(4) + conta(5) + DAC(1) + zeros(3)
    const campoLivre = `${c.carteira}${c.nossoNumero}${dacNossoNumero(c)}${c.agencia}${c.conta}${dacAgenciaConta}000`;
    const barra = `${itau.options.codigo}9${fator}${valorBarras(boleto)}${campoLivre}`;
    return inserirDv(barra, dvBarraModulo11(barra));
  },

  linhaDigitavel(codBarras: string): string {
    return linhaDigitavelPadrao(codBarras);
  },

  nossoNumeroDv(boleto: BoletoRuntime) {
    return dacNossoNumero(campos(boleto));
  },

  nossoNumeroFormatado(boleto: BoletoRuntime): string {
    const c = campos(boleto);
    return `${c.carteira}/${c.nossoNumero}-${dacNossoNumero(c)}`;
  },

  agenciaCodigoBeneficiario(boleto: BoletoRuntime): string {
    const c = campos(boleto);
    return `${c.agencia} / ${c.conta}-${mod10(c.agencia + c.conta)}`;
  },
};
