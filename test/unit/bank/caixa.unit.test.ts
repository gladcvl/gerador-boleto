import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { caixa } from '../../../src/bank/caixa.js';
import type { BoletoRuntime } from '../../../src/types.js';

const makeBoleto = (overrides: Partial<BoletoRuntime> = {}): BoletoRuntime => ({
  banco: 'caixa',
  dataEmissao: new Date('2026-05-10T00:00:00.000Z'),
  dataVencimento: new Date('2026-05-17T00:00:00.000Z'),
  valorDocumento: 32112,
  nossoNumero: '222333777777777',
  agencia: '1234',
  codigoCedente: '005507',
  carteira: '1',
  identificadorEmissao: '4',
  ...overrides,
});

describe('Unit › Bank › Caixa', () => {
  it('deve ter código 104', () => {
    assert.equal(caixa.options.codigo, '104');
  });

  it('codBarras deve retornar string de 44 caracteres', () => {
    assert.equal(caixa.codBarras(makeBoleto()).length, 44);
  });

  it('codBarras deve iniciar com 104', () => {
    assert.ok(caixa.codBarras(makeBoleto()).startsWith('104'));
  });

  it('codBarras deve conter apenas dígitos', () => {
    assert.match(caixa.codBarras(makeBoleto()), /^\d{44}$/);
  });

  it('codBarras deve produzir resultado determinístico', () => {
    const a = caixa.codBarras(makeBoleto());
    const b = caixa.codBarras(makeBoleto());
    assert.equal(a, b);
  });

  it('codBarras deve produzir resultado esperado (fixture)', () => {
    assert.equal(caixa.codBarras(makeBoleto()), '10494144900000321120055077222133347777777771');
  });

  it('linhaDigitavel deve retornar string de 54 caracteres', () => {
    const barras = caixa.codBarras(makeBoleto());
    assert.equal(caixa.linhaDigitavel(barras).length, 54);
  });

  it('linhaDigitavel deve produzir resultado esperado (fixture)', () => {
    const barras = caixa.codBarras(makeBoleto());
    assert.equal(
      caixa.linhaDigitavel(barras),
      '10490.05505 77222.133348 77777.777713 4 14490000032112',
    );
  });

  it('deve lidar corretamente com nossoNumero < 15 dígitos usando carteira e identificadorEmissao', () => {
    const barras = caixa.codBarras(
      makeBoleto({ nossoNumero: '123', carteira: '1', identificadorEmissao: '4' }),
    );
    assert.equal(barras.length, 44);
    assert.match(barras, /^\d{44}$/);
  });

  it('deve aceitar nossoNumero de 17 dígitos coerente com carteira/emissão', () => {
    const barras = caixa.codBarras(makeBoleto({ nossoNumero: '14222333777777777' }));
    assert.equal(barras, caixa.codBarras(makeBoleto()));
  });

  it('deve rejeitar nossoNumero de 16 dígitos ou 17 incoerente', () => {
    assert.throws(() => caixa.codBarras(makeBoleto({ nossoNumero: '1234567890123456' })), /até 15/);
    assert.throws(() => caixa.codBarras(makeBoleto({ nossoNumero: '12345678901234567' })), /"14"/);
  });

  it('deve aceitar codigo_beneficiario como fallback para codigoCedente', () => {
    const b1 = makeBoleto();
    b1.codigoCedente = undefined as any;
    b1.codigo_beneficiario = '005507';

    const barras = caixa.codBarras(b1);
    assert.equal(barras.length, 44);
  });

  it('deve usar carteira 1 e emissão 4 por padrão', () => {
    const b = makeBoleto();
    b.carteira = undefined as any;
    b.identificadorEmissao = undefined as any;
    assert.equal(caixa.codBarras(b), caixa.codBarras(makeBoleto()));
  });

  it('deve rejeitar código do beneficiário ausente', () => {
    const b = makeBoleto();
    b.codigoCedente = undefined as any;
    b.codigo_beneficiario = undefined as any;
    assert.throws(() => caixa.codBarras(b), /é obrigatório/);
  });

  it('deve rejeitar carteira/emissão não numéricas em vez de assumir padrão', () => {
    assert.throws(() => caixa.codBarras(makeBoleto({ carteira: 'abc' })), /apenas dígitos/);
    assert.throws(
      () => caixa.codBarras(makeBoleto({ identificadorEmissao: 'xyz' })),
      /apenas dígitos/,
    );
  });
});
