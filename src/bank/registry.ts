import type { BankId, BankModule } from '../types.js';
import { bb } from './bb.js';
import { bradesco } from './bradesco.js';
import { caixa } from './caixa.js';
import { itau } from './itau.js';
import { safra } from './safra.js';
import { santander } from './santander.js';
import { sicoob } from './sicoob.js';
import { sicredi } from './sicredi.js';

export const banks: Record<BankId, BankModule> = {
  bradesco,
  santander,
  caixa,
  itau,
  bb,
  sicredi,
  sicoob,
  safra,
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
