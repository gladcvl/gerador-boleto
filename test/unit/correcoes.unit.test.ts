/**
 * Testes de regressão dos bugs e vulnerabilidades corrigidos na revisão de
 * código. Cada `describe` corresponde a um problema reproduzido antes da
 * correção.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { bradesco, dvNossoNumeroBradesco } from '../../src/bank/bradesco.js';
import { itau } from '../../src/bank/itau.js';
import { santander } from '../../src/bank/santander.js';
import { criarBoleto, gerarBoleto } from '../../src/index.js';
import type { BoletoRuntime } from '../../src/types.js';
import { normalizeDate } from '../../src/util/date.js';
import { BoletoValidationError, centavos, digitos } from '../../src/util/validate.js';
import { validarConsistenciaBoletoCompleto } from '../helpers/febraban-validator.js';

const BASE = {
  dataEmissao: '2026-05-10',
  dataVencimento: '2026-05-17',
  valorDocumento: 1000,
  agencia: '1234',
};

describe('Correções › Segurança: input não confiável', () => {
  it('banco "toString"/"__proto__"/"constructor" não resolve para Object.prototype', () => {
    for (const banco of ['toString', '__proto__', 'constructor', 'hasOwnProperty']) {
      assert.throws(() => gerarBoleto({ banco } as any), /Banco inválido/, banco);
    }
  });

  it('chave "bank" no input não substitui o módulo do banco', () => {
    const out = gerarBoleto({ ...BASE, banco: 'itau', bank: { options: {} } } as any);
    assert.ok(String(out.codigoBarras).startsWith('341'));
    assert.equal(out.bank, undefined);
  });

  it('JSON com "__proto__" não altera o protótipo nem quebra o cálculo', () => {
    const entrada = JSON.parse(
      '{"banco":"itau","__proto__":{"poluido":true},"x":{"__proto__":{"y":1}}}',
    );
    const out = gerarBoleto(entrada);
    assert.equal(String(out.codigoBarras).length, 44);
    assert.equal(({} as any).poluido, undefined);
    assert.equal(Object.getPrototypeOf(out.x), Object.prototype);
    assert.equal((out.x as any).y, undefined);
  });

  it('"_calculate" e campos calculados vindos do input são ignorados', () => {
    const out = gerarBoleto({
      ...BASE,
      banco: 'bradesco',
      _calculate: 'x',
      codigoBarras: '000',
      linhaDigitavel: 'falsa',
    } as any);
    assert.equal(String(out.codigoBarras).length, 44);
    assert.notEqual(out.linhaDigitavel, 'falsa');
  });

  it('referências circulares e objetos de classe não quebram a serialização', () => {
    const ciclo: Record<string, unknown> = { nome: 'a' };
    ciclo.eu = ciclo;
    const out = gerarBoleto({ banco: 'caixa', meta: ciclo, buffer: Buffer.from('x') } as any);
    assert.doesNotThrow(() => JSON.stringify(out));
    assert.deepEqual(out.meta, { nome: 'a' });
    assert.equal(out.buffer, undefined);
  });
});

describe('Correções › Validação de valor (centavos)', () => {
  it('rejeita decimais e strings formatadas em vez de gerar "NaN" no código de barras', () => {
    assert.throws(
      () => gerarBoleto({ banco: 'bradesco', valorDocumento: 99.9 }),
      BoletoValidationError,
    );
    assert.throws(() => gerarBoleto({ banco: 'itau', valorDocumento: '150,00' }), /centavos/);
    assert.throws(() => gerarBoleto({ banco: 'itau', valorDocumento: -1 }), /centavos/);
    assert.throws(() => gerarBoleto({ banco: 'itau', valorDocumento: 10_000_000_000 }), /centavos/);
  });

  it('aceita inteiro ou string só com dígitos', () => {
    assert.equal(centavos('15000'), 15000);
    assert.equal(centavos(9_999_999_999), 9_999_999_999);
  });
});

describe('Correções › Campos nunca são truncados silenciosamente', () => {
  it('digitos(): aceita zeros à esquerda excedentes, rejeita dígitos significativos excedentes', () => {
    assert.equal(digitos('0000469', 'conta', 5), '00469');
    assert.throws(() => digitos('123456', 'conta', 5), /no máximo 5/);
    assert.throws(() => digitos('1229-1', 'agencia', 4), /apenas dígitos/);
    assert.throws(() => digitos(2 ** 60, 'nn', 20), /use string/);
  });

  it('Itaú: conta com 6 dígitos gera erro (antes virava outra conta)', () => {
    assert.throws(
      () =>
        gerarBoleto({
          ...BASE,
          banco: 'itau',
          carteira: '109',
          nossoNumero: 1,
          codigoCedente: '123456',
        }),
      /codigoCedente: deve ter no máximo 5/,
    );
  });

  it('Santander: nosso número com 13 dígitos gera erro (antes: código de barras com 45)', () => {
    assert.throws(
      () =>
        gerarBoleto({
          ...BASE,
          banco: 'santander',
          carteira: '101',
          codigoCedente: 1,
          nossoNumero: '1234567890123',
        }),
      /nossoNumero: deve ter no máximo 12/,
    );
  });

  it('agência com DV embutido gera erro claro', () => {
    assert.throws(
      () =>
        gerarBoleto({
          ...BASE,
          banco: 'bradesco',
          agencia: '1229-1',
          carteira: '09',
          nossoNumero: 1,
          codigoCedente: 1,
        }),
      /agencia: deve conter apenas dígitos/,
    );
  });

  it('Itaú: carteiras com layout especial são rejeitadas', () => {
    assert.throws(
      () =>
        gerarBoleto({ ...BASE, banco: 'itau', carteira: '198', nossoNumero: 1, codigoCedente: 1 }),
      /layout de código de barras especial/,
    );
  });
});

describe('Correções › Geração aleatória sempre produz dados coerentes', () => {
  for (const banco of [
    'bradesco',
    'caixa',
    'itau',
    'santander',
    'bb',
    'sicredi',
    'sicoob',
    'safra',
  ] as const) {
    it(`${banco}: 500 boletos aleatórios válidos e sem truncamento`, () => {
      for (let i = 0; i < 500; i++) {
        const b = gerarBoleto({ banco });
        const r = validarConsistenciaBoletoCompleto(
          String(b.codigoBarras),
          String(b.linhaDigitavel),
        );
        assert.ok(r.barrasValido && r.linhaValida && r.consistente, JSON.stringify(b));
        assert.ok(Number.isSafeInteger(b.nossoNumero) || /^\d+$/.test(String(b.nossoNumero)));
        // regerar a partir do próprio output tem de dar o mesmo código (nada foi truncado)
        assert.equal(criarBoleto(b as any).codigoBarras, b.codigoBarras);
      }
    });
  }

  it('caixa: constante de carteira no campo livre é sempre 1 ou 2', () => {
    for (let i = 0; i < 500; i++) {
      const cb = String(gerarBoleto({ banco: 'caixa' }).codigoBarras);
      assert.ok(['1', '2'].includes(cb[29]!), cb);
    }
  });
});

describe('Correções › DV do nosso número por banco', () => {
  const rt = (o: Partial<BoletoRuntime>): BoletoRuntime =>
    ({
      dataEmissao: new Date(),
      dataVencimento: new Date('2026-05-17'),
      valorDocumento: 1,
      agencia: '1234',
      ...o,
    }) as BoletoRuntime;

  it('Bradesco: exemplo do manual (carteira 19, NN 00000000002 → DV 8)', () => {
    assert.equal(dvNossoNumeroBradesco('19', '00000000002'), 8);
    assert.equal(
      bradesco.nossoNumeroFormatado(
        rt({ banco: 'bradesco', carteira: '19', nossoNumero: '2', codigoCedente: 1 }),
      ),
      '19/00000000002-8',
    );
  });

  it('Bradesco: resto 1 → DV "P"', () => {
    // procura um NN cujo resto seja 1 e confere a regra
    let achou = false;
    for (let n = 1; n < 200 && !achou; n++) {
      const nn = String(n).padStart(11, '0');
      if (dvNossoNumeroBradesco('09', nn) === 'P') {
        achou = true;
        assert.equal(
          bradesco.nossoNumeroDv(
            rt({ banco: 'bradesco', carteira: '09', nossoNumero: nn, codigoCedente: 1 }),
          ),
          'P',
        );
      }
    }
    assert.ok(achou);
  });

  it('Itaú: DAC do nosso número e da agência/conta', () => {
    const b = rt({
      banco: 'itau',
      carteira: '109',
      nossoNumero: '30672934',
      agencia: '3907',
      codigoCedente: '69608',
    });
    const cb = itau.codBarras(b);
    // DAC do NN fica na posição 31 do código de barras (campo livre: carteira 3 + NN 8 + DAC)
    assert.equal(itau.nossoNumeroFormatado(b), `109/30672934-${cb[30]}`);
    assert.equal(itau.agenciaCodigoBeneficiario(b), `3907 / 69608-${cb[40]}`);
  });

  it('Santander: DV coincide com o 13º dígito do nosso número no código de barras', () => {
    const b = rt({
      banco: 'santander',
      carteira: '101',
      nossoNumero: '1234567',
      codigoCedente: '6404154',
    });
    const cb = santander.codBarras(b);
    assert.equal(santander.nossoNumeroFormatado(b), `000001234567-${cb[39]}`);
  });
});

describe('Correções › Carteira padrão do banco', () => {
  it('Sicredi/Sicoob/Caixa sem carteira usam a carteira 1 (não 0) no código de barras', () => {
    const venc = { dataVencimento: '20/11/2026', valorDocumento: 100 };
    const sicredi = criarBoleto({
      ...venc,
      banco: 'sicredi',
      agencia: '0710',
      posto: '03',
      codigoCedente: '12345',
      nossoNumero: '26200700',
    } as any);
    assert.equal(sicredi.codigoBarras[20], '1', 'Sicredi: posição 21 = carteira');
    assert.equal(sicredi.carteira, '1');
    const sicoob = criarBoleto({
      ...venc,
      banco: 'sicoob',
      agencia: '4321',
      codigoCedente: '1234567',
      nossoNumero: '600',
    } as any);
    assert.equal(sicoob.codigoBarras[19], '1', 'Sicoob: posição 20 = carteira');
    const caixa = criarBoleto({
      ...venc,
      banco: 'caixa',
      codigoCedente: '654321',
      nossoNumero: '1',
    } as any);
    assert.equal(caixa.nossoNumeroFormatado.slice(0, 2), '14');
  });
});

describe('Correções › Datas', () => {
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  it('aceita DD/MM/AAAA (formato documentado)', () => {
    assert.equal(iso(normalizeDate('25/12/2026')), '2026-12-25');
  });

  it('rejeita datas impossíveis em vez de "rolar" o mês', () => {
    assert.throws(() => normalizeDate('31/02/2026'), /Data inválida/);
    assert.throws(() => normalizeDate('05/15/2026'), /Data inválida/); // formato americano
    assert.throws(() => normalizeDate('2026-13-01'), /Data inválida/);
  });

  it('ISO com hora usa a data escrita, independente do fuso', () => {
    assert.equal(iso(normalizeDate('2026-05-15T22:30:00-03:00')), '2026-05-15');
    assert.equal(iso(normalizeDate('2026-05-15T00:00:00.000Z')), '2026-05-15');
  });

  it('Date com hora usa o calendário de Brasília (22h BRT não vira o dia seguinte)', () => {
    // 2026-05-15 22:30 em Brasília = 2026-05-16 01:30 UTC
    assert.equal(iso(normalizeDate(new Date('2026-05-16T01:30:00Z'))), '2026-05-15');
  });

  it('vencimento fora da faixa do fator FEBRABAN gera erro', () => {
    assert.throws(
      () => gerarBoleto({ banco: 'bradesco', dataVencimento: '2000-01-01' }),
      /fora da faixa/,
    );
  });
});
