import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Boleto } from '../../src/boleto.js';
import type { BoletoRuntime } from '../../src/types.js';

describe('Unit › Boleto', () => {
  it('deve inicializar com dados corretos e calcular atributos (Bradesco)', () => {
    const input: BoletoRuntime = {
      banco: 'bradesco',
      dataEmissao: new Date('2026-05-10T00:00:00.000Z'),
      dataVencimento: new Date('2026-05-17T00:00:00.000Z'),
      valorDocumento: 15990,
      nossoNumero: '12345678901',
      agencia: '1229',
      codigoCedente: '0000469',
      carteira: '25',
    };

    const boleto = new Boleto(input);

    assert.equal(boleto.banco, 'bradesco');
    assert.equal(boleto.codigoBanco, '237-2');
    assert.ok(boleto.bank); // referência ao módulo do banco
    assert.equal(boleto.codigoBarras.length, 44);
    assert.equal(boleto.linhaDigitavel.length, 54);
    // Regra Bradesco: mod11 pesos 2-7 sobre carteira(25) + NN → resto 9 → DV 2
    assert.equal(boleto.nossoNumeroDv, 2);
    assert.equal(boleto.nossoNumeroFormatado, '25/12345678901-2');
    assert.equal(boleto.agenciaCodigoBeneficiario, '1229 / 0000469');
  });

  it('deve preservar propriedades customizadas no objeto resultante', () => {
    const input: BoletoRuntime = {
      banco: 'santander',
      dataEmissao: new Date('2026-05-10T00:00:00.000Z'),
      dataVencimento: new Date('2026-05-17T00:00:00.000Z'),
      valorDocumento: 1000,
      nossoNumero: '1234567',
      agencia: '1234',
      codigoCedente: '1234567',
      carteira: '101',
      meuCampoCustomizado: 'valor customizado',
    } as any;

    const boleto = new Boleto(input);

    assert.equal(boleto.meuCampoCustomizado, 'valor customizado');
  });

  it('deve lançar erro se o banco fornecido for inválido', () => {
    const input = {
      banco: 'banco-ficticio',
      dataEmissao: new Date(),
      dataVencimento: new Date(),
    } as any;

    assert.throws(
      () => new Boleto(input),
      (err) => {
        assert.ok(err instanceof Error);
        assert.equal(err.message, 'Banco inválido.');
        return true;
      },
    );
  });
});
