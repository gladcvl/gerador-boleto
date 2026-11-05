import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { gerarBoleto } from '../../src/index.js';
import {
  CAIXA_COMPLETO,
  CAIXA_EXAMPLE,
  CAIXA_MASSA_ESPECIFICA,
} from '../fixtures/boleto-fixtures.js';
import {
  validarCodigoBarras,
  validarConsistenciaBoletoCompleto,
  validarLinhaDigitavel,
} from '../helpers/febraban-validator.js';

describe('E2E › Caixa', () => {
  // ─── Testes Positivos ─────────────────────────────────

  describe('Cenários positivos', () => {
    it('deve gerar boleto com dados completos e output determinístico (Golden Master)', () => {
      const out = gerarBoleto(CAIXA_COMPLETO.input);

      assert.equal(out.codigoBanco, CAIXA_COMPLETO.expected.codigoBanco);
      assert.equal(out.codigoBarras, CAIXA_COMPLETO.expected.codigoBarras);
      assert.equal(out.linhaDigitavel, CAIXA_COMPLETO.expected.linhaDigitavel);
    });

    it('deve gerar boleto com massa de dados específica e validar todos os campos', () => {
      const out = gerarBoleto(CAIXA_MASSA_ESPECIFICA.input);

      assert.equal(out.codigoBanco, CAIXA_MASSA_ESPECIFICA.expected.codigoBanco);
      assert.equal(out.codigoBarras, CAIXA_MASSA_ESPECIFICA.expected.codigoBarras);
      assert.equal(out.linhaDigitavel, CAIXA_MASSA_ESPECIFICA.expected.linhaDigitavel);
      assert.equal(out.nossoNumero, CAIXA_MASSA_ESPECIFICA.input.nossoNumero);
      assert.equal(out.nossoNumeroDv, CAIXA_MASSA_ESPECIFICA.expected.nossoNumeroDv);
    });

    it('deve produzir código de barras matematicamente válido (mod11)', () => {
      const out = gerarBoleto(CAIXA_COMPLETO.input);
      const result = validarCodigoBarras(String(out.codigoBarras));

      assert.ok(
        result.valido,
        `DV inválido: informado=${result.dvInformado}, calculado=${result.dvCalculado}`,
      );
    });

    it('deve produzir linha digitável matematicamente válida (mod10 campos + mod11 geral)', () => {
      const out = gerarBoleto(CAIXA_COMPLETO.input);
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
      const out = gerarBoleto(CAIXA_COMPLETO.input);
      const result = validarConsistenciaBoletoCompleto(
        String(out.codigoBarras),
        String(out.linhaDigitavel),
      );

      assert.ok(result.barrasValido, 'Código de barras com DV inválido');
      assert.ok(result.linhaValida, 'Linha digitável com DV inválido');
      assert.ok(result.consistente, 'Linha digitável não corresponde ao código de barras');
    });

    it('deve preservar campos customizados no output (cedente, cnpj, etc)', () => {
      const out = gerarBoleto(CAIXA_EXAMPLE.input);

      assert.equal(out.cedente, 'Empresa Teste LTDA');
      assert.equal(out.cedenteCnpj, '54811186000198');
      assert.equal(out.numeroDocumento, 'CX-001');
      assert.equal(out.localPagamento, 'Local Teste');
      assert.equal(out.instrucoesPagamento, 'Instrução Teste');
    });

    it('deve gerar código de barras com exatamente 44 caracteres', () => {
      const out = gerarBoleto(CAIXA_COMPLETO.input);
      assert.equal(String(out.codigoBarras).length, 44);
    });

    it('deve gerar linha digitável com exatamente 54 caracteres (com formatação)', () => {
      const out = gerarBoleto(CAIXA_COMPLETO.input);
      assert.equal(String(out.linhaDigitavel).length, 54);
    });

    it('deve iniciar código de barras com código do banco 104', () => {
      const out = gerarBoleto(CAIXA_COMPLETO.input);
      assert.ok(String(out.codigoBarras).startsWith('104'));
    });

    it('deve retornar código do banco formatado como 104-0', () => {
      const out = gerarBoleto(CAIXA_COMPLETO.input);
      assert.equal(out.codigoBanco, '104-0');
    });

    it('deve aceitar identificadorEmissao e usá-lo na composição do nossoNumero', () => {
      const out = gerarBoleto(CAIXA_COMPLETO.input);

      // O nossoNumero de 15 dígitos com carteira 1 e identificadorEmissao 4
      // deve produzir output válido
      assert.equal(String(out.codigoBarras).length, 44);
      const result = validarCodigoBarras(String(out.codigoBarras));
      assert.ok(result.valido);
    });

    it('deve gerar textos padrão quando instrucoesPagamento não é fornecido', () => {
      const out = gerarBoleto(CAIXA_COMPLETO.input);

      assert.equal(out.localPagamento, 'Até o vencimento, preferencialmente no Banco Caixa');
      assert.equal(
        out.instrucoesPagamento,
        'Sr. Caixa, cobrar multa de 2% após o vencimento. Receber até 10 dias após o vencimento.',
      );
    });

    it('deve serializar datas como ISO string no output', () => {
      const out = gerarBoleto(CAIXA_COMPLETO.input);

      assert.ok(typeof out.dataEmissao === 'string');
      assert.ok(typeof out.dataVencimento === 'string');
    });

    it('deve aceitar nossoNumero com 17 dígitos completo (carteira + emissão + 15)', () => {
      const out = gerarBoleto({
        ...CAIXA_EXAMPLE.input,
        nossoNumero: '14345678987654321', // 17 dígitos coerentes com a carteira 14
      });
      const curto = gerarBoleto(CAIXA_EXAMPLE.input); // mesmos 15 dígitos livres

      assert.equal(out.codigoBarras, curto.codigoBarras);
      const result = validarCodigoBarras(String(out.codigoBarras));
      assert.ok(result.valido);
    });

    it('deve rejeitar nossoNumero de 17 dígitos incoerente com a carteira', () => {
      assert.throws(
        () => gerarBoleto({ ...CAIXA_EXAMPLE.input, nossoNumero: '12345678987654321' }),
        /carteira\+emissão "14"/,
      );
    });

    it('deve tratar carteira "02" como carteira 2 (zero à esquerda)', () => {
      assert.equal(
        gerarBoleto({ ...CAIXA_COMPLETO.input, carteira: '02' }).codigoBarras,
        gerarBoleto({ ...CAIXA_COMPLETO.input, carteira: '2' }).codigoBarras,
      );
    });

    it('deve rejeitar carteira fora do SIGCB (ex.: 0, 3, 82, 188)', () => {
      for (const carteira of ['0', '3', '82', '188']) {
        assert.throws(() => gerarBoleto({ ...CAIXA_COMPLETO.input, carteira }), /carteira/);
      }
    });

    it('deve produzir boleto válido com massa de dados do segundo fixture', () => {
      const out = gerarBoleto(CAIXA_MASSA_ESPECIFICA.input);
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
        ...CAIXA_COMPLETO.input,
        valorDocumento: 0,
      });

      assert.equal(String(out.codigoBarras).length, 44);
      const result = validarCodigoBarras(String(out.codigoBarras));
      assert.ok(result.valido, 'DV do código de barras inválido para valor 0');
    });

    it('deve gerar boleto válido com valor muito grande', () => {
      const out = gerarBoleto({
        ...CAIXA_COMPLETO.input,
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
            ...CAIXA_COMPLETO.input,
            dataVencimento: 'abc-invalid',
          }),
        (err) => {
          assert.ok(err instanceof Error);
          assert.match(err.message, /Data inválida/);
          return true;
        },
      );
    });

    it('deve gerar boleto válido quando codigoCedente é passado como número', () => {
      const out = gerarBoleto({
        ...CAIXA_COMPLETO.input,
        codigoCedente: 5507,
      });

      assert.equal(String(out.codigoBarras).length, 44);
      const result = validarCodigoBarras(String(out.codigoBarras));
      assert.ok(result.valido);
    });
  });
});
