import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { banks, getBank } from '../../../src/bank/registry.js';

describe('Unit › Bank › Registry', () => {
  // ─── Testes Positivos ─────────────────────────────────

  it('deve conter exatamente 8 bancos registrados', () => {
    assert.equal(Object.keys(banks).length, 8);
  });

  it('deve conter bradesco no registro', () => {
    assert.ok(banks.bradesco);
  });

  it('deve conter santander no registro', () => {
    assert.ok(banks.santander);
  });

  it('deve conter caixa no registro', () => {
    assert.ok(banks.caixa);
  });

  it('deve conter itau no registro', () => {
    assert.ok(banks.itau);
  });

  describe('Cada banco deve ter a interface BankModule completa', () => {
    for (const [name, bank] of Object.entries(banks)) {
      it(`${name} deve ter options.codigo como string`, () => {
        assert.equal(typeof bank.options.codigo, 'string');
        assert.ok(bank.options.codigo.length > 0);
      });

      it(`${name} deve ter função codBarras`, () => {
        assert.equal(typeof bank.codBarras, 'function');
      });

      it(`${name} deve ter função linhaDigitavel`, () => {
        assert.equal(typeof bank.linhaDigitavel, 'function');
      });
    }
  });

  describe('Códigos bancários corretos', () => {
    it('Bradesco deve ter código 237', () => {
      assert.equal(banks.bradesco.options.codigo, '237');
    });

    it('Santander deve ter código 033', () => {
      assert.equal(banks.santander.options.codigo, '033');
    });

    it('Caixa deve ter código 104', () => {
      assert.equal(banks.caixa.options.codigo, '104');
    });

    it('Itaú deve ter código 341', () => {
      assert.equal(banks.itau.options.codigo, '341');
    });
  });

  // ─── getBank ──────────────────────────────────────────

  describe('getBank()', () => {
    it('deve retornar módulo para banco válido', () => {
      const result = getBank('bradesco');
      assert.ok(result);
      assert.equal(result.options.codigo, '237');
    });

    it('deve retornar undefined para banco inexistente', () => {
      assert.equal(getBank('nao-existe'), undefined);
    });

    it('deve retornar undefined para string vazia', () => {
      assert.equal(getBank(''), undefined);
    });
  });
});
