/**
 * Validações de campos numéricos de boleto.
 *
 * Princípio: nunca truncar nem "corrigir" silenciosamente um dado bancário.
 * Um código de barras com agência/conta erradas é pior do que um erro claro.
 */

export class BoletoValidationError extends Error {
  readonly campo: string;

  constructor(campo: string, mensagem: string) {
    super(`${campo}: ${mensagem}`);
    this.name = 'BoletoValidationError';
    this.campo = campo;
  }
}

/**
 * Converte um campo numérico (number ou string só com dígitos) para string
 * com exatamente `tamanho` dígitos, completando com zeros à esquerda.
 *
 * Zeros à esquerda excedentes são aceitos ('0000469' cabe em 5 posições);
 * dígitos significativos excedentes geram erro.
 */
export function digitos(valor: unknown, campo: string, tamanho: number): string {
  let texto: string;
  if (typeof valor === 'number') {
    if (!Number.isSafeInteger(valor) || valor < 0) {
      throw new BoletoValidationError(
        campo,
        `deve ser um inteiro não negativo (recebido ${valor}). Para números com mais de 15 dígitos, use string.`,
      );
    }
    texto = String(valor);
  } else if (typeof valor === 'string') {
    texto = valor.trim();
    if (!/^\d+$/.test(texto)) {
      throw new BoletoValidationError(
        campo,
        `deve conter apenas dígitos, sem pontos, traços ou DV (recebido "${valor}").`,
      );
    }
  } else {
    throw new BoletoValidationError(campo, 'é obrigatório.');
  }

  const significativo = texto.replace(/^0+(?=\d)/, '');
  if (significativo.length > tamanho) {
    throw new BoletoValidationError(
      campo,
      `deve ter no máximo ${tamanho} dígitos (recebido "${texto}").`,
    );
  }
  return significativo.padStart(tamanho, '0');
}

/** Valor máximo representável no código de barras: 10 dígitos em centavos. */
export const VALOR_MAXIMO_CENTAVOS = 9_999_999_999;

/**
 * Valida o valor do documento, que é sempre em CENTAVOS (inteiro).
 * Ex.: R$ 150,00 → 15000.
 */
export function centavos(valor: unknown, campo = 'valorDocumento'): number {
  let n: number;
  if (typeof valor === 'number') {
    n = valor;
  } else if (typeof valor === 'string' && /^\d+$/.test(valor.trim())) {
    n = Number(valor.trim());
  } else {
    throw new BoletoValidationError(
      campo,
      `deve ser um inteiro em centavos, ex.: 15000 para R$ 150,00 (recebido ${JSON.stringify(valor)}).`,
    );
  }
  if (!Number.isSafeInteger(n) || n < 0 || n > VALOR_MAXIMO_CENTAVOS) {
    throw new BoletoValidationError(
      campo,
      `deve ser um inteiro em centavos entre 0 e ${VALOR_MAXIMO_CENTAVOS}, ex.: 15000 para R$ 150,00 (recebido ${valor}).`,
    );
  }
  return n;
}
