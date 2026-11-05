/**
 * Proteção contra prototype pollution / sobrescrita de membros internos
 * quando o input vem de fontes não confiáveis (ex.: JSON.parse de uma API).
 */

import type { JsonValue } from '../types.js';

const CHAVES_PERIGOSAS = new Set(['__proto__', 'prototype', 'constructor']);

export function chavePerigosa(chave: string): boolean {
  return CHAVES_PERIGOSAS.has(chave);
}

/**
 * Copia as propriedades próprias e enumeráveis de `origem`, descartando
 * chaves perigosas e as listadas em `ignorar`. O resultado é um objeto comum.
 */
export function copiaSegura(
  origem: object,
  ignorar: ReadonlySet<string> = new Set(),
): Record<string, unknown> {
  const destino: Record<string, unknown> = {};
  for (const chave of Object.keys(origem)) {
    if (chavePerigosa(chave) || ignorar.has(chave)) {
      continue;
    }
    // defineProperty evita qualquer setter, inclusive o de __proto__
    Object.defineProperty(destino, chave, {
      value: (origem as Record<string, unknown>)[chave],
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return destino;
}

const PROFUNDIDADE_MAXIMA = 10;

function primitivoJson(valor: unknown): JsonValue | undefined {
  if (valor === null || typeof valor === 'string' || typeof valor === 'boolean') {
    return valor;
  }
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : undefined;
  }
  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? undefined : valor.toISOString();
  }
  return undefined;
}

function objetoJson(
  obj: object,
  profundidade: number,
  vistos: WeakSet<object>,
): JsonValue | undefined {
  if (Array.isArray(obj)) {
    return obj.map((item) => paraJson(item, profundidade + 1, vistos) ?? null);
  }
  const proto = Object.getPrototypeOf(obj);
  if (proto !== Object.prototype && proto !== null) {
    // Instâncias de classes (Buffer, Map, módulos...) não são dados do boleto
    return undefined;
  }
  const out: { [k: string]: JsonValue } = {};
  for (const chave of Object.keys(obj)) {
    const v = chavePerigosa(chave)
      ? undefined
      : paraJson((obj as Record<string, unknown>)[chave], profundidade + 1, vistos);
    if (v !== undefined) {
      Object.defineProperty(out, chave, {
        value: v,
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
  }
  return out;
}

/**
 * Converte um valor qualquer em JSON seguro: Date → ISO, remove funções,
 * símbolos, undefined, chaves perigosas e referências circulares.
 */
export function paraJson(
  valor: unknown,
  profundidade = 0,
  vistos = new WeakSet<object>(),
): JsonValue | undefined {
  if (typeof valor !== 'object' || valor === null || valor instanceof Date) {
    return primitivoJson(valor);
  }
  if (profundidade >= PROFUNDIDADE_MAXIMA || vistos.has(valor)) {
    return undefined;
  }
  vistos.add(valor);
  const resultado = objetoJson(valor, profundidade, vistos);
  vistos.delete(valor);
  return resultado;
}
