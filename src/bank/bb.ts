import { dvBarraModulo11, fatorVencimento, linhaDigitavelPadrao } from '../algorithm/febraban.js';
import type { BankModule, BoletoRuntime } from '../types.js';
import { BoletoValidationError, digitos } from '../util/validate.js';
import {
  agenciaFormatada,
  contaFormatada,
  inserirDv,
  juntarAgenciaCodigo,
  valorBarras,
} from './common.js';

/**
 * DV do nosso número BB (convênios de 4 e 6 posições): módulo 11 com pesos
 * 9 a 2 da direita para a esquerda; o DV é o próprio resto (10 → 'X').
 */
export function dvNossoNumeroBb(numero: string): number | 'X' {
  let soma = 0;
  let peso = 9;
  for (let i = numero.length - 1; i >= 0; i--) {
    soma += Number(numero[i]) * peso;
    peso = peso === 2 ? 9 : peso - 1;
  }
  const resto = soma % 11;
  return resto === 10 ? 'X' : resto;
}

/** Carteiras que aceitam nosso número livre de 17 posições com convênio de 6 ("formato 21"). */
const CARTEIRAS_FORMATO_21 = new Set(['16', '18']);

type CamposBb =
  | { tipo: 7; convenio: string; nossoNumero: string; carteira: string }
  | {
      tipo: 6 | 4;
      convenio: string;
      sequencial: string;
      agencia: string;
      conta: string;
      carteira: string;
    }
  | { tipo: 21; convenio: string; nossoNumero: string; carteira: string };

function textoDigitos(valor: unknown): string {
  return String(valor ?? '')
    .trim()
    .replace(/^0+(?=\d)/, '');
}

function campos(boleto: BoletoRuntime): CamposBb {
  if (boleto.convenio == null || boleto.convenio === '') {
    throw new BoletoValidationError('convenio', 'é obrigatório para o Banco do Brasil.');
  }
  const convenioBruto = textoDigitos(boleto.convenio);
  const carteira = digitos(boleto.carteira, 'carteira', 2);

  if (convenioBruto.length === 7) {
    return {
      tipo: 7,
      convenio: digitos(boleto.convenio, 'convenio', 7),
      nossoNumero: digitos(boleto.nossoNumero, 'nossoNumero', 10),
      carteira,
    };
  }
  if (convenioBruto.length === 6 || convenioBruto.length === 4) {
    const tamanho = convenioBruto.length as 6 | 4;
    const convenio = digitos(boleto.convenio, 'convenio', tamanho);
    const nnBruto = textoDigitos(boleto.nossoNumero);
    if (tamanho === 6 && nnBruto.length > 5) {
      if (!CARTEIRAS_FORMATO_21.has(carteira)) {
        throw new BoletoValidationError(
          'nossoNumero',
          'com convênio de 6 posições deve ter até 5 dígitos (17 dígitos só nas carteiras 16 e 18).',
        );
      }
      return {
        tipo: 21,
        convenio,
        nossoNumero: digitos(boleto.nossoNumero, 'nossoNumero', 17),
        carteira,
      };
    }
    return {
      tipo: tamanho,
      convenio,
      sequencial: digitos(boleto.nossoNumero, 'nossoNumero', tamanho === 6 ? 5 : 7),
      agencia: digitos(boleto.agencia, 'agencia', 4),
      conta: digitos(boleto.codigoCedente, 'codigoCedente', 8),
      carteira,
    };
  }
  throw new BoletoValidationError(
    'convenio',
    `deve ter 4, 6 ou 7 dígitos (recebido "${String(boleto.convenio)}").`,
  );
}

function campoLivre(c: CamposBb): string {
  switch (c.tipo) {
    case 7:
      return `000000${c.convenio}${c.nossoNumero}${c.carteira}`;
    case 21:
      return `${c.convenio}${c.nossoNumero}21`;
    default:
      return `${c.convenio}${c.sequencial}${c.agencia}${c.conta}${c.carteira}`;
  }
}

/** Nosso número completo (sem DV) e DV, quando houver. */
function nossoNumeroCompleto(c: CamposBb): { numero: string; dv: number | 'X' | '' } {
  if (c.tipo === 7) {
    return { numero: c.convenio + c.nossoNumero, dv: '' };
  }
  if (c.tipo === 21) {
    return { numero: c.nossoNumero, dv: '' };
  }
  const numero = c.convenio + c.sequencial;
  return { numero, dv: dvNossoNumeroBb(numero) };
}

export const bb: BankModule = {
  options: { codigo: '001', digito: '9', nome: 'Banco do Brasil S.A.' },

  codBarras(boleto: BoletoRuntime): string {
    const c = campos(boleto);
    const barra = `${bb.options.codigo}9${fatorVencimento(boleto.dataVencimento)}${valorBarras(boleto)}${campoLivre(c)}`;
    return inserirDv(barra, dvBarraModulo11(barra));
  },

  linhaDigitavel(codBarras: string): string {
    return linhaDigitavelPadrao(codBarras);
  },

  nossoNumeroDv(boleto: BoletoRuntime) {
    return nossoNumeroCompleto(campos(boleto)).dv;
  },

  nossoNumeroFormatado(boleto: BoletoRuntime): string {
    const { numero, dv } = nossoNumeroCompleto(campos(boleto));
    return dv === '' ? numero : `${numero}-${dv}`;
  },

  agenciaCodigoBeneficiario(boleto: BoletoRuntime): string {
    const conta =
      boleto.codigoCedente == null || boleto.codigoCedente === ''
        ? ''
        : contaFormatada(digitos(boleto.codigoCedente, 'codigoCedente', 8), boleto);
    return juntarAgenciaCodigo(agenciaFormatada(boleto), conta);
  },
};
