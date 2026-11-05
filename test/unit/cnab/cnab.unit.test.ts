import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  BANCOS_240,
  type BeneficiarioCnab,
  CnabError,
  gerarRemessaCnab240,
  lerRetornoCnab240,
  type TituloRemessa,
  validarLayout,
} from '../../../src/cnab/index.js';
import { substituir } from '../../../src/cnab/layout.js';
import { type BankId, type BoletoInput, criarBoleto } from '../../../src/index.js';

/** Trecho 1-based inclusivo, como nos manuais. */
const pos = (linha: string, de: number, ate: number) => linha.slice(de - 1, ate);

const PAGADOR = {
  nome: 'João da Silva Sauro',
  documento: '529.982.247-25',
  endereco: {
    logradouro: 'Rua das Flores',
    numero: '25',
    bairro: 'Centro',
    cidade: 'Campinas',
    uf: 'SP',
    cep: '13010-000',
  },
};
const EMPRESA = { nome: 'Empresa Exemplo LTDA', documento: '11.222.333/0001-81' };

type BancoCnab = Exclude<BankId, 'safra'>;

const CONTAS: Record<BancoCnab, { beneficiario: BeneficiarioCnab; boleto: Partial<BoletoInput> }> =
  {
    bradesco: {
      beneficiario: {
        ...EMPRESA,
        agencia: '1229',
        agenciaDv: '1',
        conta: '469',
        contaDv: '6',
        convenio: '1234567',
      },
      boleto: { agencia: '1229', codigoCedente: '0000469', carteira: '09', nossoNumero: '100' },
    },
    itau: {
      beneficiario: { ...EMPRESA, agencia: '3907', conta: '69608', contaDv: '6' },
      boleto: { agencia: '3907', codigoCedente: '69608', carteira: '109', nossoNumero: '200' },
    },
    santander: {
      beneficiario: {
        ...EMPRESA,
        agencia: '3978',
        conta: '13000123',
        contaDv: '4',
        convenio: '397800006404154',
        codigoBeneficiario: '6404154',
      },
      boleto: { agencia: '3978', codigoCedente: '6404154', carteira: '101', nossoNumero: '300' },
    },
    caixa: {
      beneficiario: { ...EMPRESA, agencia: '1234', agenciaDv: '5', codigoBeneficiario: '654321' },
      boleto: { agencia: '1234', codigoCedente: '654321', carteira: '14', nossoNumero: '400' },
    },
    bb: {
      beneficiario: {
        ...EMPRESA,
        agencia: '1234',
        agenciaDv: '3',
        conta: '12345',
        contaDv: '6',
        convenio: '1234567',
        carteira: '17',
        variacaoCarteira: '019',
      },
      boleto: {
        agencia: '1234',
        codigoCedente: '12345',
        convenio: '1234567',
        carteira: '17',
        nossoNumero: '500',
      },
    },
    sicoob: {
      beneficiario: {
        ...EMPRESA,
        agencia: '4321',
        agenciaDv: '0',
        conta: '98765',
        contaDv: '1',
        codigoBeneficiario: '1234567',
      },
      boleto: { agencia: '4321', codigoCedente: '1234567', nossoNumero: '600' },
    },
    sicredi: {
      beneficiario: {
        ...EMPRESA,
        agencia: '0710',
        conta: '12345',
        contaDv: '0',
        codigoBeneficiario: '12345',
      },
      boleto: { agencia: '0710', posto: '03', codigoCedente: '12345', nossoNumero: '26200700' },
    },
  };

function boleto(banco: BancoCnab, extra: Partial<BoletoInput> = {}) {
  return criarBoleto({
    ...CONTAS[banco].boleto,
    banco,
    dataEmissao: '05/11/2026',
    dataVencimento: '20/11/2026',
    valorDocumento: 15_000,
    numeroDocumento: 'NF-1000',
    pagador: PAGADOR,
    ...extra,
  } as BoletoInput);
}

function remessa(banco: BancoCnab, titulos?: TituloRemessa[], extra = {}) {
  return gerarRemessaCnab240({
    banco,
    sequencial: 7,
    beneficiario: CONTAS[banco].beneficiario,
    titulos: titulos ?? [
      { boleto: boleto(banco), multa: { percentual: 2 }, juros: { taxaMensal: 1 } },
    ],
    dataGeracao: new Date('2026-11-05T12:34:56-03:00'),
    ...extra,
  });
}

const BANCOS: BancoCnab[] = ['bradesco', 'itau', 'santander', 'caixa', 'bb', 'sicoob', 'sicredi'];
const layoutDe = (banco: BancoCnab) => BANCOS_240[banco]!;

describe('CNAB › Motor de layout', () => {
  for (const banco of BANCOS) {
    it(`${banco}: todos os registros cobrem 1..240 sem lacunas/sobreposição`, () => {
      for (const [nome, layout] of Object.entries(layoutDe(banco).layout)) {
        assert.doesNotThrow(() => validarLayout(layout, `${banco}.${nome}`));
      }
    });
  }

  it('detecta lacuna, sobreposição e substituição que corta campo', () => {
    const base = layoutDe('bradesco').layout.trailerArquivo;
    assert.throws(() => validarLayout(base.slice(1), 'x'), /posição 1 não coberta/);
    assert.throws(() => validarLayout(base.slice(0, -1), 'x'), /termina na posição 29/);
    assert.throws(() => substituir(base, 20, 25, []), /corta o campo/);
  });
});

describe('CNAB › Remessa (estrutura comum)', () => {
  for (const banco of BANCOS) {
    it(`${banco}: registros de 240 posições, CRLF, sequência 0-1-P-Q-R-5-9 e totais`, () => {
      const arq = remessa(banco);
      assert.ok(arq.endsWith('\r\n'));
      const linhas = arq.split('\r\n').slice(0, -1);
      for (const l of linhas) {
        assert.equal(l.length, 240);
        assert.match(l, /^[\x20-\x7E]+$/, 'somente ASCII imprimível');
        assert.equal(pos(l, 1, 3), layoutDe(banco).codigo);
      }
      assert.deepEqual(
        linhas.map((l) => pos(l, 8, 8) + (pos(l, 8, 8) === '3' ? pos(l, 14, 14) : '')),
        ['0', '1', '3P', '3Q', '3R', '5', '9'],
      );
      assert.equal(pos(linhas[0]!, 143, 143), '1', 'código remessa');
      assert.equal(pos(linhas[1]!, 9, 9), 'R', 'operação');
      assert.equal(pos(linhas[1]!, 10, 11), '01', 'serviço cobrança');
      assert.deepEqual(
        linhas.slice(2, 5).map((l) => pos(l, 9, 13)),
        ['00001', '00002', '00003'],
      );
      assert.equal(
        pos(linhas[5]!, 18, 23),
        '000005',
        'trailer lote: header + 3 detalhes + trailer',
      );
      assert.equal(pos(linhas[6]!, 18, 23), '000001', 'trailer arquivo: 1 lote');
      assert.equal(pos(linhas[6]!, 24, 29), '000007', 'trailer arquivo: 7 registros');

      const p = linhas[2]!;
      assert.equal(pos(p, 16, 17), '01', 'movimento entrada');
      assert.equal(pos(p, 78, 85), '20112026', 'vencimento');
      assert.equal(pos(p, 86, 100), '000000000015000', 'valor R$ 150,00');
      assert.equal(pos(p, 110, 117), '05112026', 'emissão');
      assert.equal(pos(p, 118, 118), '2', 'juros: taxa mensal');
      assert.equal(pos(p, 127, 141), '000000000000100', 'juros 1,00%');

      const q = linhas[3]!;
      assert.equal(pos(q, 18, 18), '1', 'pagador CPF');
      assert.equal(pos(q, 19, 33), '000052998224725');
      assert.equal(pos(q, 34, 52), 'JOAO DA SILVA SAURO', 'nome sem acento, maiúsculo');
      assert.equal(pos(q, 129, 136), '13010000', 'CEP');
      assert.equal(pos(q, 152, 153), 'SP');

      const r = linhas[4]!;
      assert.equal(pos(r, 66, 66), '2', 'multa percentual');
      assert.equal(pos(r, 67, 74), '21112026', 'multa a partir do dia seguinte ao vencimento');
      assert.equal(pos(r, 75, 89), '000000000000200', 'multa 2,00%');
    });
  }

  it('sem multa não gera segmento R', () => {
    const linhas = remessa('itau', [{ boleto: boleto('itau') }]).split('\r\n');
    assert.deepEqual(
      linhas.slice(2, 4).map((l) => pos(l, 14, 14)),
      ['P', 'Q'],
    );
    assert.equal(pos(linhas[2]!, 118, 118), '3', 'juros isento por padrão');
  });
});

describe('CNAB › Remessa (posições específicas de cada banco)', () => {
  it('Bradesco: convênio, carteira/NN/DV em 38-57', () => {
    const [h, , p] = remessa('bradesco').split('\r\n') as [string, string, string];
    assert.equal(pos(h, 33, 52), '00000000000001234567');
    assert.equal(pos(h, 53, 58), '012291');
    assert.equal(pos(h, 59, 71), '0000000004696');
    assert.equal(pos(h, 103, 110), 'BRADESCO');
    assert.equal(pos(h, 144, 157), '05112026123456', 'data/hora de Brasília');
    assert.equal(pos(h, 158, 163), '000007', 'NSA');
    assert.equal(pos(p, 38, 40), '009');
    assert.equal(pos(p, 41, 45), '00000');
    assert.equal(pos(p, 46, 56), '00000000100');
    assert.equal(pos(p, 57, 57), String(boleto('bradesco').nossoNumeroDv));
  });

  it('Itaú: bloco de conta, carteira/NN/DAC e espécie própria (DM = 01)', () => {
    const [h, , p, q] = remessa('itau').split('\r\n') as [string, string, string, string];
    assert.equal(pos(h, 53, 72), '03907 000000069608 6');
    assert.equal(pos(p, 18, 37), '03907 000000069608 6');
    assert.equal(pos(p, 38, 40), '109');
    assert.equal(pos(p, 41, 48), '00000200');
    assert.equal(pos(p, 49, 49), String(boleto('itau').nossoNumeroDv));
    assert.equal(pos(p, 63, 72), 'NF-1000   ');
    assert.equal(pos(p, 107, 108), '01');
    assert.equal(pos(q, 34, 63).trimEnd(), 'JOAO DA SILVA SAURO', 'nome com 30 posições');
  });

  it('Santander: código de transmissão, conta cobrança e NN com DV em 45-57', () => {
    const [h, l, p] = remessa('santander').split('\r\n') as [string, string, string];
    assert.equal(pos(h, 17, 17), '2');
    assert.equal(pos(h, 18, 32), '011222333000181');
    assert.equal(pos(h, 33, 47), '397800006404154');
    assert.equal(pos(l, 54, 68), '397800006404154');
    assert.equal(pos(p, 18, 21), '3978');
    assert.equal(pos(p, 23, 32), '0130001234');
    assert.equal(pos(p, 33, 41), '006404154');
    assert.equal(pos(p, 45, 57), `000000000300${boleto('santander').nossoNumeroDv}`);
    assert.equal(pos(p, 228, 229), '00');
  });

  it('Caixa: código do beneficiário, modalidade 14, NN 15 e marcação de teste', () => {
    const [h, l, p] = remessa('caixa', undefined, { teste: true }).split('\r\n') as [
      string,
      string,
      string,
    ];
    assert.equal(pos(h, 53, 64), '012345654321');
    assert.equal(pos(h, 192, 204), 'REMESSA-TESTE');
    assert.equal(pos(l, 34, 39), '654321');
    assert.equal(pos(p, 18, 29), '012345654321');
    assert.equal(pos(p, 41, 42), '14');
    assert.equal(pos(p, 43, 57), '000000000000400');
    assert.equal(pos(p, 60, 62), '220', 'escritural, emissão e entrega pelo beneficiário');
    assert.ok(pos(remessa('caixa').split('\r\n')[0]!, 192, 211).startsWith('REMESSA-PRODUCAO'));
  });
});

describe('CNAB › Remessa (instruções de cobrança)', () => {
  const linhasDe = (t: Partial<TituloRemessa>, extra: Partial<BoletoInput> = {}) =>
    remessa('bradesco', [{ boleto: boleto('bradesco', extra), ...t }]).split('\r\n');

  it('juros por valor/dia, desconto por valor e multa em valor com data', () => {
    const [, , p, , r] = linhasDe({
      juros: { valorDia: 50 },
      desconto: { valor: 1_000, ate: '15/11/2026' },
      multa: { valor: 300, data: '25/11/2026' },
    });
    assert.equal(pos(p!, 118, 141), `121112026${'50'.padStart(15, '0')}`);
    assert.equal(pos(p!, 142, 165), `115112026${'1000'.padStart(15, '0')}`);
    assert.equal(pos(r!, 66, 89), `125112026${'300'.padStart(15, '0')}`);
  });

  it('desconto percentual, juros isento explícito, protesto e baixa', () => {
    const [, , p] = linhasDe({
      juros: { isento: true },
      desconto: { percentual: 5.5, ate: '2026-11-10' },
      protestoDias: 5,
      baixaDias: 30,
    });
    assert.equal(pos(p!, 118, 118), '3');
    assert.equal(pos(p!, 142, 165), `210112026${'550'.padStart(15, '0')}`);
    assert.equal(pos(p!, 221, 227), '1051030');
  });

  it('espécie por sigla, por código numérico e desconhecida', () => {
    assert.equal(pos(linhasDe({}, { especieDocumento: 'DS' })[2]!, 107, 108), '04');
    assert.equal(pos(linhasDe({}, { especieDocumento: '23' })[2]!, 107, 108), '23');
    assert.throws(() => linhasDe({}, { especieDocumento: 'XYZ' }), /Espécie "XYZ"/);
  });

  it('sacador/avalista e aceite', () => {
    const [, , p, q] = linhasDe(
      {},
      { aceite: 'S', sacadorAvalista: { nome: 'Garantidora S/A', documento: '45723174000110' } },
    );
    assert.equal(pos(p!, 109, 109), 'A');
    assert.equal(pos(q!, 154, 169), '2045723174000110');
    assert.equal(pos(q!, 170, 184), 'GARANTIDORA S/A');
  });

  it('documento do pagador inválido', () => {
    assert.throws(
      () => linhasDe({}, { pagador: { ...PAGADOR, documento: '123' } }),
      /CPF\/CNPJ inválido/,
    );
  });
});

describe('CNAB › Bancos novos (BB, Sicoob, Sicredi) e Safra', () => {
  it('BB: convênio/carteira/variação no header e nosso número de 17 posições', () => {
    const [h, l, p] = remessa('bb').split('\r\n') as [string, string, string];
    assert.equal(pos(h, 33, 52), '001234567001417019  ');
    assert.equal(pos(l, 34, 53), '001234567001417019  ');
    assert.equal(pos(p, 38, 57), '12345670000000500   ');
  });

  it('Sicoob: nosso número com DV, parcela, modalidade e formulário', () => {
    const [, , p] = remessa('sicoob').split('\r\n') as [string, string, string];
    const b = boleto('sicoob');
    assert.equal(pos(p, 38, 52), `000000600${b.nossoNumeroDv}01014`);
    assert.equal(pos(p, 53, 57), '     ');
  });

  it('Sicredi: código do beneficiário no header e nosso número 8+DV', () => {
    const [h, , p] = remessa('sicredi').split('\r\n') as [string, string, string];
    assert.equal(pos(h, 33, 37), '12345');
    assert.equal(pos(p, 38, 46), `26200700${boleto('sicredi').nossoNumeroDv}`);
  });

  it('Safra: erro explícito em vez de layout inventado', () => {
    assert.throws(
      () =>
        gerarRemessaCnab240({
          banco: 'safra',
          sequencial: 1,
          beneficiario: EMPRESA as any,
          titulos: [],
        }),
      /safra: layout CNAB 240 do Safra não implementado/,
    );
  });
});

describe('CNAB › Remessa (validações)', () => {
  it('exige endereço completo do pagador', () => {
    const b = boleto('itau', { pagador: { nome: 'Fulano', documento: '52998224725' } });
    assert.throws(() => remessa('itau', [{ boleto: b }]), /pagador\.endereco\.logradouro/);
  });

  it('rejeita boleto de outro banco ou de outra conta', () => {
    assert.throws(() => remessa('itau', [{ boleto: boleto('bradesco') }]), /de outro banco/);
    const outraConta = boleto('itau', { codigoCedente: '11111' });
    assert.throws(() => remessa('itau', [{ boleto: outraConta }]), /não pertence ao beneficiário/);
  });

  it('rejeita percentual com 3 casas, movimento inválido e valores que não cabem', () => {
    const b = boleto('caixa');
    assert.throws(() => remessa('caixa', [{ boleto: b, multa: { percentual: 2.125 } }]), /2 casas/);
    assert.throws(
      () => remessa('caixa', [{ boleto: b, movimento: 'toString' as any }]),
      /movimento inválido/,
    );
    assert.throws(() => remessa('caixa', [{ boleto: b, protestoDias: 100 }]), /não cabe/);
    assert.throws(() => remessa('caixa', []), /ao menos um título/);
    assert.throws(() => remessa('caixa', undefined, { sequencial: 0 }), /maior que zero/);
  });

  it('exige dados de conta específicos do banco', () => {
    assert.throws(
      () =>
        gerarRemessaCnab240({
          banco: 'bradesco',
          sequencial: 1,
          beneficiario: { ...CONTAS.bradesco.beneficiario, convenio: undefined },
          titulos: [{ boleto: boleto('bradesco') }],
        }),
      /convenio é obrigatório/,
    );
    assert.throws(
      () =>
        gerarRemessaCnab240({
          banco: 'nubank' as BankId,
          sequencial: 1,
          beneficiario: EMPRESA as any,
          titulos: [],
        }),
      CnabError,
    );
  });
});

// ─── Retorno ───────────────────────────────────────────────────────────────

/** Monta uma linha de 240 posições colocando cada valor na posição do manual. */
function linha(campos: [number, string][]): string {
  const chars = Array(240).fill(' ');
  for (const [de, valor] of campos) {
    for (let i = 0; i < valor.length; i++) {
      chars[de - 1 + i] = valor[i]!;
    }
  }
  return chars.join('');
}

function retornoBradesco(opcoes: { trailerRegistros?: string } = {}): string {
  const header = linha([
    [1, '23700000'],
    [18, '211222333000181'],
    [73, 'EMPRESA EXEMPLO LTDA'],
    [143, '2'],
    [144, '06112026'],
    [158, '000042'],
  ]);
  const lote = linha([[1, '23700011T01']]);
  const t1 = linha([
    [1, '2370001300001T 06'],
    [38, '009'],
    [41, '00000'],
    [46, '00000000100'],
    [57, 'P'],
    [59, 'NF-1000'],
    [74, '20112026'],
    [82, '000000000015000'],
    [106, 'NF-1000'],
    [133, '1'],
    [134, '000052998224725'],
    [149, 'JOAO DA SILVA SAURO'],
    [199, '000000000000250'],
    [214, '00'],
  ]);
  const u1 = linha([
    [1, '2370001300002U 06'],
    [18, '000000000000300'],
    [78, '000000000015300'],
    [93, '000000000015050'],
    [138, '19112026'],
    [146, '21112026'],
  ]);
  const t2 = linha([
    [1, '2370001300003T 03'],
    [38, '009'],
    [46, '00000000101'],
    [57, '8'],
    [82, '000000000017500'],
    [214, 'A4B2'],
  ]);
  const u2 = linha([
    [1, '2370001300004U 03'],
    [138, '06112026'],
  ]);
  const trailerLote = linha([
    [1, '23700015'],
    [18, '000006'],
  ]);
  const trailer = linha([
    [1, '23799999'],
    [18, '000001'],
    [24, opcoes.trailerRegistros ?? '000008'],
  ]);
  return [header, lote, t1, u1, t2, u2, trailerLote, trailer].join('\r\n') + '\r\n';
}

describe('CNAB › Retorno', () => {
  it('lê liquidação e rejeição do Bradesco (T + U)', () => {
    const r = lerRetornoCnab240(retornoBradesco());
    assert.equal(r.banco, 'bradesco');
    assert.equal(r.sequencial, 42);
    assert.equal(r.dataGeracao, '2026-11-06');
    assert.deepEqual(r.empresa, { nome: 'EMPRESA EXEMPLO LTDA', documento: '11222333000181' });
    assert.equal(r.titulos.length, 2);

    const [pago, rejeitado] = r.titulos as [any, any];
    assert.equal(pago.codigoMovimento, '06');
    assert.equal(pago.descricaoMovimento, 'Liquidação');
    assert.equal(pago.liquidado, true);
    assert.equal(pago.nossoNumero, '00000000100');
    assert.equal(pago.numeroDocumento, 'NF-1000');
    assert.equal(pago.usoEmpresa, 'NF-1000');
    assert.equal(pago.vencimento, '2026-11-20');
    assert.equal(pago.valorTitulo, 15_000);
    assert.equal(pago.jurosMultaEncargos, 300);
    assert.equal(pago.valorPago, 15_300);
    assert.equal(pago.valorLiquido, 15_050);
    assert.equal(pago.tarifa, 250);
    assert.equal(pago.dataOcorrencia, '2026-11-19');
    assert.equal(pago.dataCredito, '2026-11-21');
    assert.deepEqual(pago.pagador, { nome: 'JOAO DA SILVA SAURO', documento: '52998224725' });
    assert.deepEqual(pago.motivos, []);
    assert.deepEqual([pago.linhaT, pago.linhaU], [3, 4]);

    assert.equal(rejeitado.rejeitado, true);
    assert.equal(rejeitado.liquidado, false);
    assert.deepEqual(rejeitado.motivos, ['A4', 'B2']);
    assert.equal(rejeitado.dataCredito, null);
  });

  it('lê o segmento T do Santander nas posições próprias (NN em 41-53)', () => {
    const header = linha([
      [1, '03300000'],
      [17, '2'],
      [18, '011222333000181'],
      [143, '2'],
      [144, '06112026'],
      [158, '000001'],
    ]);
    const t = linha([
      [1, '0330001300001T 06'],
      [41, '0000000003005'],
      [55, 'NF-1000'],
      [70, '20112026'],
      [78, '000000000015000'],
      [194, '000000000000199'],
    ]);
    const u = linha([
      [1, '0330001300002U 06'],
      [78, '000000000015000'],
      [93, '000000000014801'],
    ]);
    const arq = [
      header,
      linha([[1, '03300011']]),
      t,
      u,
      linha([
        [1, '03300015'],
        [18, '000004'],
      ]),
      linha([
        [1, '03399999'],
        [18, '000001'],
        [24, '000006'],
      ]),
    ].join('\n');
    const [titulo] = lerRetornoCnab240(Buffer.from(arq, 'latin1')).titulos as [any];
    assert.equal(titulo.nossoNumero, '000000000300', '12 dígitos, sem o DV');
    assert.equal(titulo.numeroDocumento, 'NF-1000');
    assert.equal(titulo.vencimento, '2026-11-20');
    assert.equal(titulo.tarifa, 199);
    assert.equal(titulo.valorLiquido, 14_801);
  });

  it('detecta arquivo truncado, linha com tamanho errado e trailer inconsistente', () => {
    const completo = retornoBradesco();
    const semTrailer = completo.split('\r\n').slice(0, -2).join('\r\n');
    assert.throws(() => lerRetornoCnab240(semTrailer), /sem trailer de arquivo/);
    assert.throws(
      () => lerRetornoCnab240(completo.replace('EMPRESA EXEMPLO LTDA', 'X')),
      /Linha 1: esperado 240/,
    );
    assert.throws(
      () => lerRetornoCnab240(retornoBradesco({ trailerRegistros: '000009' })),
      /inconsistente/,
    );
  });

  it('rejeita remessa, banco desconhecido e conteúdo vazio', () => {
    assert.throws(() => lerRetornoCnab240(remessa('itau')), /não é de retorno/);
    assert.throws(
      () => lerRetornoCnab240(linha([[1, '99900000']]) + '\n' + linha([[1, '99999999']])),
      /não suportado/,
    );
    assert.throws(() => lerRetornoCnab240(''), /sem header/);
  });
});
