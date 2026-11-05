import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { criarBoleto, gerarBoleto } from '../../../src/index.js';
import { barrasI2of5, gerarBoletoPdf, montarModelo } from '../../../src/pdf/index.js';
import { formatarDocumento, formatarEndereco, formatarMoeda } from '../../../src/util/format.js';

/**
 * Decodificador I2of5 independente do codificador: mede larguras das barras
 * e espaços e reconstrói os dígitos. Se o codificador errar um padrão, este
 * teste não "concorda" com ele por construção.
 */
function decodificar(barras: { x: number; largura: number }[]): string {
  const elementos: number[] = [];
  for (let i = 0; i < barras.length; i++) {
    elementos.push(barras[i]!.largura);
    const proxima = barras[i + 1];
    if (proxima) {
      elementos.push(proxima.x - (barras[i]!.x + barras[i]!.largura));
    }
  }
  // remove início (4 elementos) e fim (3 elementos)
  assert.deepEqual(elementos.slice(0, 4), [1, 1, 1, 1], 'padrão de início');
  assert.deepEqual(elementos.slice(-3), [3, 1, 1], 'padrão de fim');
  const dados = elementos.slice(4, -3);
  const pesos = [1, 2, 4, 7, 0];
  const digito = (larguras: number[]): string => {
    const largos: number[] = larguras.map((l) => (l > 1 ? 1 : 0));
    assert.equal(
      largos.reduce((a, b) => a + b, 0),
      2,
      'cada dígito tem exatamente 2 elementos largos',
    );
    const soma = largos.reduce((acc: number, l, i) => acc + l * pesos[i]!, 0);
    return String(soma === 11 ? 0 : soma);
  };
  let out = '';
  for (let i = 0; i < dados.length; i += 10) {
    const bloco = dados.slice(i, i + 10);
    out += digito(bloco.filter((_, j) => j % 2 === 0));
    out += digito(bloco.filter((_, j) => j % 2 === 1));
  }
  return out;
}

const BOLETO = {
  banco: 'itau' as const,
  dataEmissao: '05/11/2026',
  dataVencimento: '20/11/2026',
  valorDocumento: 152_990,
  nossoNumero: '30672934',
  agencia: '3907',
  codigoCedente: '69608',
  carteira: '109',
  numeroDocumento: 'NF-42',
  beneficiario: {
    nome: 'Empresa Exemplo LTDA',
    documento: '11222333000181',
    endereco: {
      logradouro: 'Av. Paulista',
      numero: '1000',
      cidade: 'São Paulo',
      uf: 'SP',
      cep: '01310100',
    },
  },
  pagador: { nome: 'João da Silva', documento: '52998224725' },
  instrucoes: ['Linha 1', 'Linha 2'],
};

describe('PDF › Código de barras Interleaved 2 of 5', () => {
  it('codifica 44 dígitos em 405 módulos (≈103 mm com barra estreita de 0,254 mm)', () => {
    const { barras, larguraTotal } = barrasI2of5('0'.repeat(44));
    assert.equal(larguraTotal, 405);
    assert.equal(barras.length, 2 + 22 * 5 + 2);
  });

  it('decodificação independente reconstrói exatamente o código', () => {
    for (let i = 0; i < 50; i++) {
      const codigo = String(gerarBoleto().codigoBarras);
      assert.equal(decodificar(barrasI2of5(codigo).barras), codigo);
    }
  });

  it('rejeita quantidade ímpar ou caracteres não numéricos', () => {
    assert.throws(() => barrasI2of5('123'), /par/);
    assert.throws(() => barrasI2of5('12a4'), /par/);
  });
});

describe('PDF › Formatação', () => {
  it('moeda, documento e endereço', () => {
    assert.equal(formatarMoeda(0), 'R$ 0,00');
    assert.equal(formatarMoeda(152_990), 'R$ 1.529,90');
    assert.equal(formatarMoeda(9_999_999_999), 'R$ 99.999.999,99');
    assert.equal(formatarDocumento('11222333000181'), '11.222.333/0001-81');
    assert.equal(formatarDocumento('529.982.247-25'), '529.982.247-25');
    assert.equal(
      formatarEndereco({
        logradouro: 'Rua A',
        numero: '1',
        bairro: 'Centro',
        cidade: 'Campinas',
        uf: 'SP',
        cep: '13010000',
      }),
      'Rua A, 1 - Centro - Campinas/SP - CEP 13010-000',
    );
  });

  it('modelo traz os campos formatados do boleto', () => {
    const b = criarBoleto(BOLETO);
    const m = montarModelo(b);
    assert.equal(m.vencimento, '20/11/2026');
    assert.equal(m.dataDocumento, '05/11/2026');
    assert.equal(m.valorDocumento, 'R$ 1.529,90');
    assert.equal(m.nossoNumero, b.nossoNumeroFormatado);
    assert.equal(m.beneficiarioDocumento, 'CNPJ 11.222.333/0001-81');
    assert.equal(m.pagador, 'João da Silva - CPF 529.982.247-25');
    assert.deepEqual(m.instrucoes, ['Linha 1', 'Linha 2']);
    assert.equal(m.especieDocumento, 'DM');
    assert.equal(m.nomeBanco, 'Itaú Unibanco S.A.');
  });

  it('aceita os campos legados cedente/cedenteCnpj e instrucoesPagamento', () => {
    const m = montarModelo(
      gerarBoleto({
        banco: 'bradesco',
        cedente: 'Antiga LTDA',
        cedenteCnpj: '11222333000181',
        instrucoesPagamento: 'A\nB',
      }),
    );
    assert.equal(m.beneficiario, 'Antiga LTDA');
    assert.deepEqual(m.instrucoes, ['A', 'B']);
  });

  it('rejeita objetos que não vieram de gerarBoleto/criarBoleto', () => {
    assert.throws(
      () => montarModelo({ banco: 'itau', codigoBarras: '123' } as any),
      /Boleto inválido/,
    );
    assert.throws(() => montarModelo({ banco: 'xpto' } as any), /Boleto inválido/);
  });
});

describe('PDF › Documento', () => {
  it('gera um PDF válido com uma página por boleto', async () => {
    const boletos = [
      criarBoleto(BOLETO),
      gerarBoleto({ banco: 'caixa' }),
      gerarBoleto({ banco: 'santander' }),
    ];
    const pdf = await gerarBoletoPdf(boletos, { dataCriacao: new Date('2026-01-01T00:00:00Z') });
    assert.equal(pdf.subarray(0, 5).toString('latin1'), '%PDF-');
    assert.ok(pdf.subarray(-6).toString('latin1').includes('%%EOF'));
    const paginas = pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? [];
    assert.equal(paginas.length, 3);
  });

  it('é reprodutível quando a data de criação é fixada', async () => {
    const b = criarBoleto(BOLETO);
    const opcoes = { dataCriacao: new Date('2026-01-01T00:00:00Z') };
    const [a, c] = await Promise.all([gerarBoletoPdf(b, opcoes), gerarBoletoPdf(b, opcoes)]);
    assert.ok(a.equals(c));
  });

  it('aceita recibo: false', async () => {
    const pdf = await gerarBoletoPdf(criarBoleto(BOLETO), { recibo: false });
    assert.equal(pdf.subarray(0, 5).toString('latin1'), '%PDF-');
  });

  it('rejeita lista vazia e boleto inválido antes de escrever', async () => {
    await assert.rejects(gerarBoletoPdf([]), /ao menos um/);
    await assert.rejects(async () => gerarBoletoPdf({ banco: 'itau' } as any), /Boleto inválido/);
  });
});
