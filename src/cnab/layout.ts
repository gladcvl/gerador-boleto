/**
 * Motor de layout de arquivos posicionais (CNAB).
 *
 * Um registro é uma lista de campos com posição inicial/final (1-based,
 * inclusivas, como nos manuais dos bancos). Campos numéricos são alinhados
 * à direita com zeros; alfanuméricos à esquerda com brancos, em ASCII
 * maiúsculo sem acentos.
 */
import { ascii } from '../util/format.js';

export const TAMANHO_REGISTRO = 240;

export type TipoCampo = 'num' | 'alfa';

export interface Campo {
  nome: string;
  de: number;
  ate: number;
  tipo: TipoCampo;
  /** Valor constante (ignora os dados) */
  fixo?: string;
}

export type Layout = readonly Campo[];

export class CnabError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'CnabError';
  }
}

export const num = (nome: string, de: number, ate: number, fixo?: string): Campo => ({
  nome,
  de,
  ate,
  tipo: 'num',
  ...(fixo === undefined ? {} : { fixo }),
});

export const alfa = (nome: string, de: number, ate: number, fixo?: string): Campo => ({
  nome,
  de,
  ate,
  tipo: 'alfa',
  ...(fixo === undefined ? {} : { fixo }),
});

export const brancos = (de: number, ate: number): Campo => alfa(`_brancos${de}`, de, ate, '');
export const zeros = (de: number, ate: number): Campo => num(`_zeros${de}`, de, ate, '0');

/**
 * Substitui os campos contidos em [de, ate] pelos `novos`. É assim que cada
 * banco aplica suas particularidades sobre o layout FEBRABAN.
 */
export function substituir(layout: Layout, de: number, ate: number, novos: Campo[]): Campo[] {
  const fora = layout.filter((c) => c.ate < de || c.de > ate);
  const cortados = layout.filter((c) => (c.de < de && c.ate >= de) || (c.de <= ate && c.ate > ate));
  if (cortados.length > 0) {
    throw new CnabError(
      `Substituição ${de}-${ate} corta o campo "${cortados[0]!.nome}" (${cortados[0]!.de}-${cortados[0]!.ate}).`,
    );
  }
  return [...fora, ...novos].sort((a, b) => a.de - b.de);
}

/** Garante que o layout cobre 1..240 sem lacunas nem sobreposições. */
export function validarLayout(layout: Layout, nome: string): void {
  let esperado = 1;
  const vistos = new Set<string>();
  for (const c of [...layout].sort((a, b) => a.de - b.de)) {
    if (c.de !== esperado) {
      throw new CnabError(
        `Layout ${nome}: posição ${esperado} não coberta (campo "${c.nome}" começa em ${c.de}).`,
      );
    }
    if (c.ate < c.de) {
      throw new CnabError(`Layout ${nome}: campo "${c.nome}" com fim antes do início.`);
    }
    if (vistos.has(c.nome)) {
      throw new CnabError(`Layout ${nome}: campo "${c.nome}" duplicado.`);
    }
    vistos.add(c.nome);
    esperado = c.ate + 1;
  }
  if (esperado !== TAMANHO_REGISTRO + 1) {
    throw new CnabError(
      `Layout ${nome}: termina na posição ${esperado - 1}, esperado ${TAMANHO_REGISTRO}.`,
    );
  }
}

export type Dados = Record<string, string | number | undefined | null>;

function formatar(c: Campo, valor: string | number | undefined | null, registro: string): string {
  const tamanho = c.ate - c.de + 1;
  if (c.tipo === 'alfa') {
    return ascii(valor).toUpperCase().slice(0, tamanho).padEnd(tamanho, ' ');
  }
  if (valor === undefined || valor === null || valor === '') {
    return '0'.repeat(tamanho);
  }
  if (typeof valor === 'number' && (!Number.isSafeInteger(valor) || valor < 0)) {
    throw new CnabError(`${registro}.${c.nome}: valor numérico inválido (${valor}).`);
  }
  const texto = String(valor);
  if (!/^\d+$/.test(texto)) {
    throw new CnabError(`${registro}.${c.nome}: deve conter apenas dígitos (recebido "${texto}").`);
  }
  const significativo = texto.replace(/^0+(?=\d)/, '');
  if (significativo.length > tamanho) {
    throw new CnabError(
      `${registro}.${c.nome}: "${texto}" não cabe em ${tamanho} posições (${c.de}-${c.ate}).`,
    );
  }
  return significativo.padStart(tamanho, '0');
}

/** Monta uma linha de 240 posições. */
export function escrever(layout: Layout, dados: Dados, registro: string): string {
  let linha = '';
  for (const c of layout) {
    linha += formatar(c, c.fixo ?? dados[c.nome], registro);
  }
  if (linha.length !== TAMANHO_REGISTRO) {
    throw new CnabError(`${registro}: linha com ${linha.length} posições.`);
  }
  return linha;
}

/** Lê uma linha conforme o layout. Campos alfa vêm sem brancos à direita. */
export function ler(layout: Layout, linha: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of layout) {
    if (c.nome.startsWith('_')) {
      continue;
    }
    const bruto = linha.slice(c.de - 1, c.ate);
    out[c.nome] = c.tipo === 'alfa' ? bruto.trimEnd() : bruto;
  }
  return out;
}
