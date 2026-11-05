import type { BankId, BankModule } from '../types.js';
import { bradesco } from './bradesco.js';
import { caixa } from './caixa.js';
import { itau } from './itau.js';
import { santander } from './santander.js';

export const banks: Record<BankId, BankModule> = {
  bradesco,
  santander,
  caixa,
  itau,
};

export const BANK_IDS = Object.keys(banks) as BankId[];

/**
 * Retorna o módulo do banco. Usa Object.hasOwn para que valores como
 * 'toString' ou '__proto__' não resolvam para membros de Object.prototype.
 */
export function getBank(id: unknown): BankModule | undefined {
  if (typeof id !== 'string' || !Object.hasOwn(banks, id)) {
    return undefined;
  }
  return banks[id as BankId];
}

/** Resolve pelo código de compensação ('237', '104', ...). */
export function getBankIdByCodigo(codigo: string): BankId | undefined {
  return BANK_IDS.find((id) => banks[id].options.codigo === codigo);
}
