import type { Boleto } from './boleto.js';
import type { BoletoJsonOutput } from './types.js';
import { chavePerigosa, paraJson } from './util/sanitize.js';

/**
 * Converte a instância de Boleto em objeto JSON-serializável (sem referência
 * ao módulo do banco). Datas viram ISO 8601; objetos e arrays simples
 * (ex.: `pagador`, `instrucoes`) são preservados recursivamente.
 */
export function serializeBoleto(boleto: Boleto): BoletoJsonOutput {
  const out: Record<string, unknown> = {};
  const raw = boleto as unknown as Record<string, unknown>;
  for (const key of Object.keys(raw)) {
    if (key === 'bank' || chavePerigosa(key)) {
      continue;
    }
    const v = paraJson(raw[key]);
    if (v !== undefined) {
      out[key] = v;
    }
  }
  return out as BoletoJsonOutput;
}
