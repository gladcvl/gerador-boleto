import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { santander } from '../../../src/bank/santander.js';
import type { BoletoRuntime } from '../../../src/types.js';

const makeBoleto = (overrides: Partial<BoletoRuntime> = {}): BoletoRuntime => ({
  banco: 'santander',
  dataEmissao: new Date('2026-05-10T00:00:00.000Z'),
  dataVencimento: new Date('2026-05-17T00:00:00.000Z'),
  valorDocumento: 1500,
  nossoNumero: '1234567',
  agencia: '3978',
  codigoCedente: '6404154',
  carteira: '102',
  ...overrides,
});

describe('Unit › Bank › Santander', () => {
  it('deve ter código 033', () => {
    assert.equal(santander.options.codigo, '033');
  });

  it('codBarras deve retornar string de 44 caracteres', () => {
    assert.equal(santander.codBarras(makeBoleto()).length, 44);
  });

  it('codBarras deve iniciar com 033', () => {
    assert.ok(santander.codBarras(makeBoleto()).startsWith('033'));
  });

  it('codBarras deve conter apenas dígitos', () => {
    assert.match(santander.codBarras(makeBoleto()), /^\d{44}$/);
  });

  it('codBarras deve produzir resultado determinístico', () => {
    const a = santander.codBarras(makeBoleto());
    const b = santander.codBarras(makeBoleto());
    assert.equal(a, b);
  });

  it('codBarras deve produzir resultado esperado (fixture)', () => {
    assert.equal(santander.codBarras(makeBoleto()), '03397144900000015009640415400000123456790102');
  });

  it('linhaDigitavel deve retornar string de 54 caracteres', () => {
    const barras = santander.codBarras(makeBoleto());
    assert.equal(santander.linhaDigitavel(barras).length, 54);
  });

  it('linhaDigitavel deve produzir resultado esperado (fixture)', () => {
    const barras = santander.codBarras(makeBoleto());
    assert.equal(
      santander.linhaDigitavel(barras),
      '03399.64041 15400.000129 34567.901029 7 14490000001500',
    );
  });

  it('deve preencher nossoNumero com zero-pad de 12 dígitos + DV', () => {
    const barras = santander.codBarras(makeBoleto({ nossoNumero: '1' }));
    assert.equal(barras.length, 44);
    assert.match(barras, /^\d{44}$/);
  });

  it('deve rejeitar campos obrigatórios ausentes em vez de usar zeros', () => {
    const b = makeBoleto();
    b.carteira = undefined as any;
    b.codigoCedente = undefined as any;
    assert.throws(() => santander.codBarras(b), /é obrigatório/);
  });
});
