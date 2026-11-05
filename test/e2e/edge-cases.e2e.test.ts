import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { gerarBoleto } from '../../src/index.js';
import type { BankId } from '../../src/types.js';
import {
  BANCOS_DISPONIVEIS,
  BRADESCO_COMPLETO,
  SANTANDER_COMPLETO,
} from '../fixtures/boleto-fixtures.js';
import {
  validarCodigoBarras,
  validarConsistenciaBoletoCompleto,
} from '../helpers/febraban-validator.js';

describe('E2E › Edge Cases & Cenários Transversais', () => {
  // ─── Banco inválido ───────────────────────────────────

  describe('Banco inválido', () => {
    it('deve lançar erro com mensagem "Banco inválido." para banco inexistente', () => {
      assert.throws(
        () =>
          gerarBoleto({
            banco: 'nao-existe' as BankId,
            valorDocumento: 1000,
            nossoNumero: '12345',
          }),
        (err) => {
          assert.ok(err instanceof Error);
          assert.equal(err.message, 'Banco inválido.');
          return true;
        },
      );
    });

    it('deve lançar erro para banco com string vazia', () => {
      assert.throws(
        () =>
          gerarBoleto({
            banco: '' as BankId,
            valorDocumento: 1000,
            nossoNumero: '12345',
          }),
        (err) => {
          assert.ok(err instanceof Error);
          assert.equal(err.message, 'Banco inválido.');
          return true;
        },
      );
    });

    it('deve normalizar maiúsculas/acentos no nome do banco', () => {
      assert.equal(gerarBoleto({ banco: 'Bradesco' as BankId }).banco, 'bradesco');
      assert.equal(gerarBoleto({ banco: ' Itaú ' as BankId }).banco, 'itau');
    });

    it('deve lançar erro para banco com nome similar mas incorreto', () => {
      assert.throws(
        () =>
          gerarBoleto({
            banco: 'Bradescoo' as BankId, // grafia errada
            valorDocumento: 1000,
            nossoNumero: '12345',
          }),
        (err) => {
          assert.ok(err instanceof Error);
          return true;
        },
      );
    });
  });

  // ─── Datas ────────────────────────────────────────────

  describe('Manipulação de datas', () => {
    it('deve aceitar data como objeto Date', () => {
      const out = gerarBoleto({
        ...BRADESCO_COMPLETO.input,
        dataEmissao: new Date('2026-05-10T00:00:00.000Z'),
        dataVencimento: new Date('2026-05-17T00:00:00.000Z'),
      });

      assert.equal(out.codigoBarras, BRADESCO_COMPLETO.expected.codigoBarras);
    });

    it('deve aceitar data como ISO string', () => {
      const out = gerarBoleto({
        ...BRADESCO_COMPLETO.input,
        dataEmissao: '2026-05-10T00:00:00.000Z',
        dataVencimento: '2026-05-17T00:00:00.000Z',
      });

      assert.equal(out.codigoBarras, BRADESCO_COMPLETO.expected.codigoBarras);
    });

    it('deve aceitar data como string curta ISO (YYYY-MM-DD)', () => {
      const out = gerarBoleto({
        ...BRADESCO_COMPLETO.input,
        dataEmissao: '2026-05-10',
        dataVencimento: '2026-05-17',
      });

      assert.equal(out.codigoBarras, BRADESCO_COMPLETO.expected.codigoBarras);
    });

    it('deve lançar erro para data completamente inválida', () => {
      assert.throws(
        () =>
          gerarBoleto({
            banco: 'bradesco',
            dataVencimento: 'xyz-invalid',
            valorDocumento: 1000,
            nossoNumero: '12345678901',
            agencia: '1234',
            codigoCedente: '1234567',
            carteira: '25',
          }),
        (err) => {
          assert.ok(err instanceof Error);
          assert.match(err.message, /Data inválida/);
          return true;
        },
      );
    });

    it('deve gerar vencimento 5 dias após emissão quando não informado', () => {
      const emissao = new Date('2026-06-01T00:00:00.000Z');
      const out = gerarBoleto({
        banco: 'bradesco',
        dataEmissao: emissao,
        valorDocumento: 1000,
        nossoNumero: '12345678901',
        agencia: '1234',
        codigoCedente: '1234567',
        carteira: '25',
      });

      const venc = new Date(String(out.dataVencimento));
      const diffDays = Math.round((venc.getTime() - emissao.getTime()) / 86_400_000);
      assert.equal(diffDays, 5, 'Vencimento padrão deve ser 5 dias após emissão');
    });

    it('deve usar data de hoje como emissão quando não informada', () => {
      const out = gerarBoleto({
        banco: 'santander',
        dataVencimento: '2026-12-31',
        valorDocumento: 1000,
        nossoNumero: '1234567',
        agencia: '1234',
        codigoCedente: '1234567',
        carteira: '101',
      });

      const emissao = new Date(String(out.dataEmissao));
      const today = new Date();
      assert.equal(emissao.getUTCFullYear(), today.getUTCFullYear());
      assert.equal(emissao.getUTCMonth(), today.getUTCMonth());
      assert.equal(emissao.getUTCDate(), today.getUTCDate());
    });
  });

  // ─── Campos customizados (metadados) ──────────────────

  describe('Preservação de campos customizados', () => {
    it('deve preservar campos extras de string no output', () => {
      const out = gerarBoleto({
        banco: 'santander',
        valorDocumento: 1000,
        nossoNumero: '1234567',
        agencia: '1234',
        codigoCedente: '1234567',
        carteira: '101',
        meuIdInterno: 'abc-123',
        infoAdicional: 'Teste de campo extra',
      });

      assert.equal(out.meuIdInterno, 'abc-123');
      assert.equal(out.infoAdicional, 'Teste de campo extra');
    });

    it('deve preservar campos numéricos customizados', () => {
      const out = gerarBoleto({
        banco: 'bradesco',
        valorDocumento: 1000,
        nossoNumero: '12345678901',
        agencia: '1234',
        codigoCedente: '1234567',
        carteira: '25',
        codigoInterno: 42,
        prioridade: 1,
      });

      assert.equal(out.codigoInterno, 42);
      assert.equal(out.prioridade, 1);
    });

    it('deve preservar campos booleanos customizados', () => {
      const out = gerarBoleto({
        banco: 'caixa',
        valorDocumento: 1000,
        nossoNumero: '222333777777777',
        codigoCedente: '005507',
        carteira: '1',
        identificadorEmissao: '4',
        urgente: true,
        processado: false,
      });

      assert.equal(out.urgente, true);
      assert.equal(out.processado, false);
    });

    it('deve sobrescrever localPagamento e instrucoesPagamento customizados', () => {
      const out = gerarBoleto({
        banco: 'bradesco',
        valorDocumento: 500,
        nossoNumero: '12345678901',
        agencia: '1234',
        codigoCedente: '1234567',
        carteira: '25',
        localPagamento: 'Meu local customizado',
        instrucoesPagamento: 'Minhas instruções',
      });

      assert.equal(out.localPagamento, 'Meu local customizado');
      assert.equal(out.instrucoesPagamento, 'Minhas instruções');
    });
  });

  // ─── Serialização ─────────────────────────────────────

  describe('Serialização do output', () => {
    it('deve retornar objeto puro sem propriedade "bank" (módulo interno)', () => {
      const out = gerarBoleto(BRADESCO_COMPLETO.input);
      assert.equal(out.bank, undefined);
    });

    it('deve retornar apenas propriedades serializáveis (sem funções)', () => {
      const out = gerarBoleto(BRADESCO_COMPLETO.input);
      for (const key of Object.keys(out)) {
        assert.notEqual(typeof out[key], 'function', `Propriedade "${key}" é uma função`);
      }
    });

    it('deve converter Date para ISO string na serialização', () => {
      const out = gerarBoleto(BRADESCO_COMPLETO.input);

      assert.equal(typeof out.dataEmissao, 'string');
      assert.equal(typeof out.dataVencimento, 'string');
      // Deve ser uma ISO string válida
      assert.ok(!Number.isNaN(new Date(String(out.dataEmissao)).getTime()));
      assert.ok(!Number.isNaN(new Date(String(out.dataVencimento)).getTime()));
    });

    it('deve ser JSON.stringify-ável sem erros', () => {
      const out = gerarBoleto(SANTANDER_COMPLETO.input);
      assert.doesNotThrow(() => JSON.stringify(out));
    });

    it('deve produzir JSON round-trip idêntico', () => {
      const out = gerarBoleto(SANTANDER_COMPLETO.input);
      const json = JSON.stringify(out);
      const parsed = JSON.parse(json);

      assert.deepEqual(parsed, out);
    });
  });

  // ─── Valores de contorno ──────────────────────────────

  describe('Valores de contorno', () => {
    it('deve gerar boleto válido com valorDocumento = 1 (valor mínimo positivo)', () => {
      const out = gerarBoleto({
        ...BRADESCO_COMPLETO.input,
        valorDocumento: 1,
      });

      assert.equal(String(out.codigoBarras).length, 44);
      const result = validarCodigoBarras(String(out.codigoBarras));
      assert.ok(result.valido);
    });

    it('deve gerar boleto válido com agência de 1 dígito', () => {
      const out = gerarBoleto({
        ...BRADESCO_COMPLETO.input,
        agencia: '1',
      });

      assert.equal(String(out.codigoBarras).length, 44);
      const result = validarCodigoBarras(String(out.codigoBarras));
      assert.ok(result.valido);
    });

    it('deve gerar boleto válido com agência de 4 dígitos', () => {
      const out = gerarBoleto({
        ...BRADESCO_COMPLETO.input,
        agencia: '9999',
      });

      assert.equal(String(out.codigoBarras).length, 44);
      const result = validarCodigoBarras(String(out.codigoBarras));
      assert.ok(result.valido);
    });

    it('deve gerar boleto válido com codigoCedente de 1 dígito', () => {
      const out = gerarBoleto({
        ...SANTANDER_COMPLETO.input,
        codigoCedente: '1',
      });

      assert.equal(String(out.codigoBarras).length, 44);
      const result = validarCodigoBarras(String(out.codigoBarras));
      assert.ok(result.valido);
    });
  });

  // ─── Determinismo ─────────────────────────────────────

  describe('Determinismo com mesmos inputs', () => {
    for (const banco of BANCOS_DISPONIVEIS) {
      it(`deve produzir outputs idênticos para mesmos inputs — ${banco}`, () => {
        const input =
          banco === 'bradesco'
            ? BRADESCO_COMPLETO.input
            : banco === 'santander'
              ? SANTANDER_COMPLETO.input
              : {
                  banco: banco as BankId,
                  dataEmissao: '2026-05-10T00:00:00.000Z',
                  dataVencimento: '2026-05-17T00:00:00.000Z',
                  valorDocumento: 10000,
                  nossoNumero: '12345678',
                  agencia: '1234',
                  codigoCedente: banco === 'caixa' ? '123456' : '12345',
                  carteira: banco === 'caixa' ? '1' : '109',
                };

        const out1 = gerarBoleto(input);
        const out2 = gerarBoleto(input);

        assert.equal(out1.codigoBarras, out2.codigoBarras);
        assert.equal(out1.linhaDigitavel, out2.linhaDigitavel);
        assert.equal(out1.codigoBanco, out2.codigoBanco);
      });
    }
  });

  // ─── Cross-banco: estrutura FEBRABAN ──────────────────

  describe('Estrutura FEBRABAN comum a todos os bancos', () => {
    for (const banco of BANCOS_DISPONIVEIS) {
      describe(`${banco}`, () => {
        it('código de barras posição 4 (moeda) deve ser "9" (Real)', () => {
          const out = gerarBoleto({ banco: banco as BankId });
          assert.equal(String(out.codigoBarras)[3], '9');
        });

        it('linha digitável deve conter exatamente 4 espaços (5 campos)', () => {
          const out = gerarBoleto({ banco: banco as BankId });
          const spaces = String(out.linhaDigitavel).split(' ').length - 1;
          assert.equal(spaces, 4, `Esperado 4 espaços, obtido ${spaces}`);
        });

        it('linha digitável deve conter exatamente 3 pontos (separadores de campo)', () => {
          const out = gerarBoleto({ banco: banco as BankId });
          const dots = (String(out.linhaDigitavel).match(/\./g) || []).length;
          assert.equal(dots, 3, `Esperado 3 pontos, obtido ${dots}`);
        });

        it('código de barras deve conter apenas dígitos', () => {
          const out = gerarBoleto({ banco: banco as BankId });
          assert.match(String(out.codigoBarras), /^\d{44}$/);
        });

        it('linha digitável (sem formatação) deve conter apenas dígitos e ter 47 dígitos', () => {
          const out = gerarBoleto({ banco: banco as BankId });
          const digits = String(out.linhaDigitavel).replace(/\D/g, '');
          assert.equal(digits.length, 47);
          assert.match(digits, /^\d{47}$/);
        });
      });
    }
  });
});
