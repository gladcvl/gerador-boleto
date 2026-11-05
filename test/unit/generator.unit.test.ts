import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  criarBoleto,
  gerarBoleto,
  gerarBoletoAleatorio,
  montarBoleto,
} from '../../src/generator.js';

describe('Unit › Generator', () => {
  describe('gerarBoleto (alias para gerarBoletoAleatorio)', () => {
    it('deve retornar um output JSON-serializável', () => {
      const output = gerarBoleto();
      assert.doesNotThrow(() => JSON.stringify(output));
    });

    it('deve aplicar valores default para textos de instrução e local quando não fornecidos', () => {
      const output = gerarBoleto({ banco: 'bradesco' });
      assert.equal(output.localPagamento, 'Até o vencimento, preferencialmente no Banco Bradesco');
      assert.ok(String(output.instrucoesPagamento).includes('Sr. Caixa'));
    });

    it('deve escolher uma carteira válida se não for fornecida', () => {
      const output = gerarBoleto({ banco: 'bradesco', carteira: undefined });
      assert.ok(output.carteira !== undefined);
      assert.ok(['09', '04', '06', '21', '22', '25', '26', '19'].includes(String(output.carteira)));
    });

    it('deve escolher um banco aleatório válido se não for fornecido', () => {
      const output = gerarBoleto();
      assert.ok(['bradesco', 'santander', 'caixa', 'itau'].includes(String(output.banco)));
    });

    it('deve gerar datas válidas quando omitidas', () => {
      const output = gerarBoleto();
      assert.ok(!Number.isNaN(new Date(String(output.dataEmissao)).getTime()));
      assert.ok(!Number.isNaN(new Date(String(output.dataVencimento)).getTime()));
    });
  });

  describe('criarBoleto', () => {
    it('deve converter input parcial no formato runtime e serializar (Bradesco)', () => {
      const input = {
        banco: 'bradesco' as const,
        valorDocumento: 500,
        nossoNumero: '12345678901',
        agencia: '1234',
        codigoCedente: '1234567',
        carteira: '25',
        dataVencimento: '2026-05-17',
      };
      const output = criarBoleto(input);
      assert.equal(output.banco, 'bradesco');
      assert.equal(output.valorDocumento, 500);
      assert.ok(output.codigoBarras);
    });

    it('deve converter strings de data para objetos Date no runtime', () => {
      const input = {
        banco: 'bradesco' as const,
        dataVencimento: '2026-05-17',
        valorDocumento: 500,
        nossoNumero: '12345678901',
        agencia: '1234',
        codigoCedente: '1234567',
        carteira: '25',
      };
      const output = criarBoleto(input);
      // Serializer vai converter de volta para ISO
      assert.ok(typeof output.dataVencimento === 'string');
      assert.ok(String(output.dataVencimento).startsWith('2026-05-17'));
    });
  });

  describe('branch coverages extras', () => {
    it('deve usar {} se input for nulo/undefined', () => {
      const output = gerarBoletoAleatorio(undefined);
      assert.ok(output);
    });

    it('deve lançar erro se banco for inválido', () => {
      assert.throws(() => gerarBoletoAleatorio({ banco: 'invalido' as any }), /Banco inválido/);
    });
  });

  describe('criarBoleto (modo estrito)', () => {
    it('deve exigir banco e campos obrigatórios em vez de preencher', () => {
      assert.throws(() => criarBoleto({} as any), /banco: é obrigatório/);
      assert.throws(() => criarBoleto(null as any), /input: deve ser um objeto/);
      assert.throws(
        () => criarBoleto({ banco: 'itau', valorDocumento: 100 } as any),
        /agencia: é obrigatório/,
      );
    });
  });

  describe('montarBoleto branch coverage', () => {
    it('deve usar fallbacks de prepararInput quando chamado diretamente com objeto vazio', () => {
      // Isso testa as branches `?? 0` e fallbacks não alcançados quando vem do gerarBoleto
      const output = montarBoleto({} as any);
      assert.equal(output.banco, 'bradesco');
      assert.equal(output.valorDocumento, 0);
      assert.equal(output.nossoNumero, 0);
      assert.equal(output.agencia, 0);
      assert.equal(output.codigoCedente, 0);
      assert.equal(output.carteira, 0);
    });

    it('deve formatar instrucoesPagamento/localPagamento quando input estiver vazio', () => {
      const output = montarBoleto({ banco: 'santander' } as any);
      assert.ok(String(output.instrucoesPagamento).includes('Sr. Caixa'));
      assert.ok(String(output.localPagamento).includes('Santander'));
    });
  });
});
