import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { bradesco } from '../../../src/bank/bradesco.js';
import type { BoletoRuntime } from '../../../src/types.js';

const makeBoleto = (overrides: Partial<BoletoRuntime> = {}): BoletoRuntime => ({
  banco: 'bradesco',
  dataEmissao: new Date('2026-05-10T00:00:00.000Z'),
  dataVencimento: new Date('2026-05-17T00:00:00.000Z'),
  valorDocumento: 15990,
  nossoNumero: '12345678901',
  agencia: '1229',
  codigoCedente: '0000469',
  carteira: '25',
  ...overrides,
});

describe('Unit › Bank › Bradesco', () => {
  it('deve ter código 237', () => {
    assert.equal(bradesco.options.codigo, '237');
  });

  it('codBarras deve retornar string de 44 caracteres', () => {
    const result = bradesco.codBarras(makeBoleto());
    assert.equal(result.length, 44);
  });

  it('codBarras deve iniciar com 237', () => {
    const result = bradesco.codBarras(makeBoleto());
    assert.ok(result.startsWith('237'));
  });

  it('codBarras deve conter apenas dígitos', () => {
    const result = bradesco.codBarras(makeBoleto());
    assert.match(result, /^\d{44}$/);
  });

  it('codBarras deve produzir resultado determinístico', () => {
    const a = bradesco.codBarras(makeBoleto());
    const b = bradesco.codBarras(makeBoleto());
    assert.equal(a, b);
  });

  it('codBarras deve produzir resultado esperado (fixture)', () => {
    const result = bradesco.codBarras(makeBoleto());
    assert.equal(result, '23797144900000159901229251234567890100004690');
  });

  it('linhaDigitavel deve retornar string de 54 caracteres', () => {
    const barras = bradesco.codBarras(makeBoleto());
    const result = bradesco.linhaDigitavel(barras);
    assert.equal(result.length, 54);
  });

  it('linhaDigitavel deve produzir resultado esperado (fixture)', () => {
    const barras = bradesco.codBarras(makeBoleto());
    const result = bradesco.linhaDigitavel(barras);
    assert.equal(result, '23791.22928 51234.567892 01000.046902 7 14490000015990');
  });

  it('deve processar agência com zero-pad de 4 dígitos', () => {
    const a = bradesco.codBarras(makeBoleto({ agencia: '1' }));
    const b = bradesco.codBarras(makeBoleto({ agencia: '0001' }));
    assert.equal(a, b);
  });

  it('deve rejeitar campos obrigatórios ausentes em vez de usar zeros', () => {
    const b = makeBoleto();
    b.agencia = undefined as any;
    b.carteira = undefined as any;
    b.codigoCedente = undefined as any;
    assert.throws(() => bradesco.codBarras(b), /é obrigatório/);
  });
});
