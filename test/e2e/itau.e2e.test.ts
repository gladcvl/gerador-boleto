import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { gerarBoleto } from '../../src/index.js';
import { ITAU_EXAMPLE } from '../fixtures/boleto-fixtures.js';
import {
  validarCodigoBarras,
  validarConsistenciaBoletoCompleto,
  validarLinhaDigitavel,
} from '../helpers/febraban-validator.js';

describe('E2E › Itaú', () => {
  // ─── Testes Positivos ─────────────────────────────────

  describe('Cenários positivos', () => {
    it('deve gerar boleto com dados completos produzindo código de barras de 44 dígitos', () => {
      const out = gerarBoleto(ITAU_EXAMPLE.input);

      assert.equal(String(out.codigoBarras).length, 44);
      assert.equal(String(out.linhaDigitavel).length, 54);
    });

    it('deve retornar código do banco formatado como 341-7', () => {
      const out = gerarBoleto(ITAU_EXAMPLE.input);
      assert.equal(out.codigoBanco, '341-7');
    });

    it('deve iniciar código de barras com código do banco 341', () => {
      const out = gerarBoleto(ITAU_EXAMPLE.input);
      assert.ok(String(out.codigoBarras).startsWith('341'));
    });

    it('deve produzir código de barras matematicamente válido (mod11)', () => {
      const out = gerarBoleto(ITAU_EXAMPLE.input);
      const result = validarCodigoBarras(String(out.codigoBarras));

      assert.ok(
        result.valido,
        `DV inválido: informado=${result.dvInformado}, calculado=${result.dvCalculado}`,
      );
    });

    it('deve produzir linha digitável matematicamente válida (mod10 campos + mod11 geral)', () => {
      const out = gerarBoleto(ITAU_EXAMPLE.input);
      const result = validarLinhaDigitavel(String(out.linhaDigitavel));

      assert.ok(
        result.campo1.valido,
        `Campo 1 inválido: dv=${result.campo1.dv}, calc=${result.campo1.calculado}`,
      );
      assert.ok(
        result.campo2.valido,
        `Campo 2 inválido: dv=${result.campo2.dv}, calc=${result.campo2.calculado}`,
      );
      assert.ok(
        result.campo3.valido,
        `Campo 3 inválido: dv=${result.campo3.dv}, calc=${result.campo3.calculado}`,
      );
      assert.ok(
        result.dvGeral.valido,
        `DV geral inválido: dv=${result.dvGeral.dv}, calc=${result.dvGeral.calculado}`,
      );
    });

    it('deve manter consistência entre código de barras e linha digitável', () => {
      const out = gerarBoleto(ITAU_EXAMPLE.input);
      const result = validarConsistenciaBoletoCompleto(
        String(out.codigoBarras),
        String(out.linhaDigitavel),
      );

      assert.ok(result.barrasValido, 'Código de barras com DV inválido');
      assert.ok(result.linhaValida, 'Linha digitável com DV inválido');
      assert.ok(result.consistente, 'Linha digitável não corresponde ao código de barras');
    });

    it('deve preservar campos customizados no output (cedente, cnpj, etc)', () => {
      const out = gerarBoleto(ITAU_EXAMPLE.input);

      assert.equal(out.cedente, 'Empresa Teste LTDA');
      assert.equal(out.cedenteCnpj, '49755276000179');
      assert.equal(out.numeroDocumento, '987654');
      assert.equal(out.localPagamento, 'Local Teste Itaú');
      assert.equal(out.instrucoesPagamento, 'Instrução Teste');
    });

    it('deve gerar textos padrão quando instrucoesPagamento não é fornecido', () => {
      const { localPagamento, instrucoesPagamento, ...inputSemTextos } = ITAU_EXAMPLE.input;
      const out = gerarBoleto(inputSemTextos);

      assert.equal(out.localPagamento, 'Até o vencimento, preferencialmente no Banco Itaú');
      assert.equal(
        out.instrucoesPagamento,
        'Sr. Caixa, cobrar multa de 2% após o vencimento. Receber até 10 dias após o vencimento.',
      );
    });

    it('deve aceitar nossoNumero como string e como número com mesmo resultado', () => {
      const outString = gerarBoleto({
        ...ITAU_EXAMPLE.input,
        nossoNumero: '30672934',
      });
      const outNumber = gerarBoleto({
        ...ITAU_EXAMPLE.input,
        nossoNumero: 30672934,
      });

      assert.equal(outString.codigoBarras, outNumber.codigoBarras);
      assert.equal(outString.linhaDigitavel, outNumber.linhaDigitavel);
    });

    it('deve serializar datas como ISO string no output', () => {
      const out = gerarBoleto(ITAU_EXAMPLE.input);

      assert.ok(typeof out.dataEmissao === 'string');
      assert.ok(typeof out.dataVencimento === 'string');
      assert.ok(String(out.dataEmissao).startsWith('2026-05-10'));
      assert.ok(String(out.dataVencimento).startsWith('2026-05-17'));
    });

    it('deve gerar boleto válido com carteira 109 (carteira padrão)', () => {
      const out = gerarBoleto({
        ...ITAU_EXAMPLE.input,
        carteira: '109',
      });

      const result = validarConsistenciaBoletoCompleto(
        String(out.codigoBarras),
        String(out.linhaDigitavel),
      );

      assert.ok(result.barrasValido && result.linhaValida && result.consistente);
    });

    it('deve gerar boleto válido com carteira 175', () => {
      const out = gerarBoleto({
        ...ITAU_EXAMPLE.input,
        carteira: '175',
      });

      assert.equal(String(out.codigoBarras).length, 44);
      const result = validarCodigoBarras(String(out.codigoBarras));
      assert.ok(result.valido);
    });

    it('deve gerar boleto válido com carteira 104', () => {
      const out = gerarBoleto({
        ...ITAU_EXAMPLE.input,
        carteira: '104',
      });

      assert.equal(String(out.codigoBarras).length, 44);
      const result = validarCodigoBarras(String(out.codigoBarras));
      assert.ok(result.valido);
    });

    it('deve gerar boleto válido com carteira simples 150 (DAC sem agência/conta)', () => {
      const out = gerarBoleto({
        ...ITAU_EXAMPLE.input,
        carteira: '150',
      });

      assert.equal(String(out.codigoBarras).length, 44);
      const result = validarCodigoBarras(String(out.codigoBarras));
      assert.ok(result.valido);
    });

    it('deve gerar boleto válido com agência 3908 (cenário de debug)', () => {
      const out = gerarBoleto({
        ...ITAU_EXAMPLE.input,
        agencia: '3908',
      });

      assert.equal(String(out.codigoBarras).length, 44);
      const result = validarConsistenciaBoletoCompleto(
        String(out.codigoBarras),
        String(out.linhaDigitavel),
      );
      assert.ok(result.barrasValido && result.linhaValida && result.consistente);
    });
  });

  // ─── Testes Negativos ─────────────────────────────────

  describe('Cenários negativos', () => {
    it('deve gerar boleto válido mesmo com valorDocumento = 0', () => {
      const out = gerarBoleto({
        ...ITAU_EXAMPLE.input,
        valorDocumento: 0,
      });

      assert.equal(String(out.codigoBarras).length, 44);
      const result = validarCodigoBarras(String(out.codigoBarras));
      assert.ok(result.valido, 'DV do código de barras inválido para valor 0');
    });

    it('deve gerar boleto válido com valor muito grande', () => {
      const out = gerarBoleto({
        ...ITAU_EXAMPLE.input,
        valorDocumento: 9999999999,
      });

      assert.equal(String(out.codigoBarras).length, 44);
      const result = validarCodigoBarras(String(out.codigoBarras));
      assert.ok(result.valido, 'DV do código de barras inválido para valor máximo');
    });

    it('deve lançar erro para data inválida', () => {
      assert.throws(
        () =>
          gerarBoleto({
            ...ITAU_EXAMPLE.input,
            dataVencimento: 'not-a-real-date',
          }),
        (err) => {
          assert.ok(err instanceof Error);
          assert.match(err.message, /Data inválida/);
          return true;
        },
      );
    });

    it('deve gerar boleto válido quando agência tem menos de 4 dígitos', () => {
      const out = gerarBoleto({
        ...ITAU_EXAMPLE.input,
        agencia: '12',
      });

      assert.equal(String(out.codigoBarras).length, 44);
      const result = validarCodigoBarras(String(out.codigoBarras));
      assert.ok(result.valido);
    });

    it('deve gerar boleto válido quando nossoNumero tem menos de 8 dígitos', () => {
      const out = gerarBoleto({
        ...ITAU_EXAMPLE.input,
        nossoNumero: '123',
      });

      assert.equal(String(out.codigoBarras).length, 44);
      const result = validarCodigoBarras(String(out.codigoBarras));
      assert.ok(result.valido);
    });
  });
});
