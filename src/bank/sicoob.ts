import { dvBarraModulo11, fatorVencimento, linhaDigitavelPadrao } from '../algorithm/febraban.js';
import type { BankModule, BoletoRuntime } from '../types.js';
import { digitos } from '../util/validate.js';
import { agenciaFormatada, inserirDv, juntarAgenciaCodigo, valorBarras } from './common.js';

/**
 * DV do nosso número Sicoob: multiplica cooperativa(4) + cliente(10) +
 * nosso número(7) pela constante 3197 repetida; resto 0 ou 1 → 0, senão 11 - resto.
 */
export function dvNossoNumeroSicoob(
  cooperativa: string,
  cliente: string,
  nossoNumero: string,
): number {
  const base = cooperativa + cliente.padStart(10, '0') + nossoNumero;
  const pesos = [3, 1, 9, 7];
  let soma = 0;
  for (let i = 0; i < base.length; i++) {
    soma += Number(base[i]) * pesos[i % 4]!;
  }
  const resto = soma % 11;
  return resto <= 1 ? 0 : 11 - resto;
}

function campos(boleto: BoletoRuntime) {
  const cooperativa = digitos(boleto.agencia, 'agencia', 4);
  const cliente = digitos(boleto.codigoCedente, 'codigoCedente', 7);
  const nossoNumero = digitos(boleto.nossoNumero, 'nossoNumero', 7);
  return {
    carteira: digitos(boleto.carteira ?? '1', 'carteira', 1),
    cooperativa,
    modalidade: digitos(boleto.modalidade ?? '01', 'modalidade', 2),
    cliente,
    nossoNumero,
    dv: dvNossoNumeroSicoob(cooperativa, cliente, nossoNumero),
    parcela: digitos(boleto.parcela ?? '001', 'parcela', 3),
  };
}

export const sicoob: BankModule = {
  options: { codigo: '756', digito: '0', nome: 'Banco Cooperativo Sicoob S.A.' },

  codBarras(boleto: BoletoRuntime): string {
    const c = campos(boleto);
    // Campo livre: carteira(1) + cooperativa(4) + modalidade(2) + cliente(7) + NN(7) + DV(1) + parcela(3)
    const campoLivre = `${c.carteira}${c.cooperativa}${c.modalidade}${c.cliente}${c.nossoNumero}${c.dv}${c.parcela}`;
    const barra = `${sicoob.options.codigo}9${fatorVencimento(boleto.dataVencimento)}${valorBarras(boleto)}${campoLivre}`;
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
    return juntarAgenciaCodigo(agenciaFormatada(boleto), campos(boleto).cliente);
  },
};
