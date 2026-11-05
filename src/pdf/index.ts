/**
 * Geração de boletos em PDF (layout FEBRABAN: recibo do pagador + ficha de
 * compensação com código de barras Interleaved 2 of 5).
 *
 * Requer a dependência opcional `pdfkit`:  npm install pdfkit
 *
 * @example
 * import { criarBoleto } from '@box4dev/gerador-boleto';
 * import { gerarBoletoPdf } from '@box4dev/gerador-boleto/pdf';
 *
 * const pdf = await gerarBoletoPdf(criarBoleto({ ... }));
 * await fs.promises.writeFile('boleto.pdf', pdf);
 */
import PdfDocument from 'pdfkit';
import type { BoletoJsonOutput } from '../types.js';
import { barrasI2of5 } from './barcode.js';
import { type ModeloBoleto, montarModelo } from './modelo.js';

export { barrasI2of5 } from './barcode.js';
export type { ModeloBoleto } from './modelo.js';
export { montarModelo } from './modelo.js';

export interface OpcoesPdf {
  /** Inclui o recibo do pagador acima da ficha de compensação (padrão: true) */
  recibo?: boolean;
  /** Título do documento PDF (metadados) */
  titulo?: string;
  /** Data de criação gravada nos metadados (útil para PDFs reprodutíveis) */
  dataCriacao?: Date;
}

type Doc = InstanceType<typeof PdfDocument>;

const MM = 72 / 25.4;
const MARGEM = 10 * MM;
const LARGURA_A4 = 595.28;
const LARGURA = LARGURA_A4 - 2 * MARGEM;
const COLUNA_DIREITA = 45 * MM;
const ALTURA_LINHA = 8 * MM;

const FONTE = 'Helvetica';
const FONTE_NEGRITO = 'Helvetica-Bold';
const COR_LINHA = '#000000';
const COR_ROTULO = '#333333';

/** Trunca o texto com reticências para caber na largura (fonte já selecionada). */
function caber(doc: Doc, texto: string, largura: number): string {
  if (doc.widthOfString(texto) <= largura) {
    return texto;
  }
  let fim = texto.length;
  while (fim > 0 && doc.widthOfString(`${texto.slice(0, fim)}…`) > largura) {
    fim--;
  }
  return `${texto.slice(0, fim).trimEnd()}…`;
}

/** Desenha um campo com rótulo pequeno e valor. */
function campo(
  doc: Doc,
  x: number,
  y: number,
  largura: number,
  altura: number,
  rotulo: string,
  valor: string,
  opcoes: { alinhar?: 'left' | 'right'; negrito?: boolean; fundo?: boolean } = {},
): void {
  if (opcoes.fundo) {
    doc.save().rect(x, y, largura, altura).fill('#eeeeee').restore();
  }
  doc.lineWidth(0.5).strokeColor(COR_LINHA).rect(x, y, largura, altura).stroke();
  doc
    .font(FONTE)
    .fontSize(5.5)
    .fillColor(COR_ROTULO)
    .text(rotulo, x + 2, y + 1.5, { width: largura - 4, lineBreak: false });
  doc
    .font(opcoes.negrito ? FONTE_NEGRITO : FONTE)
    .fontSize(8.5)
    .fillColor('#000000');
  doc.text(caber(doc, valor, largura - 4), x + 2, y + altura - 11, {
    width: largura - 4,
    align: opcoes.alinhar ?? 'left',
    lineBreak: false,
  });
}

/** Cabeçalho: nome do banco | código | linha digitável (ou título). */
function cabecalho(doc: Doc, m: ModeloBoleto, y: number, direita: string, grande: boolean): number {
  const altura = 9 * MM;
  const larguraNome = 55 * MM;
  const larguraCodigo = 18 * MM;

  doc
    .font(FONTE_NEGRITO)
    .fontSize(10)
    .fillColor('#000000')
    .text(m.nomeBanco, MARGEM, y + altura - 13, {
      width: larguraNome - 4,
      lineBreak: false,
      ellipsis: true,
    });

  const xCodigo = MARGEM + larguraNome;
  doc
    .lineWidth(1.5)
    .moveTo(xCodigo, y + 2)
    .lineTo(xCodigo, y + altura)
    .moveTo(xCodigo + larguraCodigo, y + 2)
    .lineTo(xCodigo + larguraCodigo, y + altura)
    .stroke();
  doc
    .font(FONTE_NEGRITO)
    .fontSize(14)
    .text(m.codigoBanco, xCodigo, y + altura - 16, { width: larguraCodigo, align: 'center' });

  const xDireita = xCodigo + larguraCodigo;
  doc
    .font(FONTE_NEGRITO)
    .fontSize(grande ? 10.5 : 9)
    .text(direita, xDireita, y + altura - 13, {
      width: MARGEM + LARGURA - xDireita,
      align: 'right',
      lineBreak: false,
    });

  doc
    .lineWidth(1.5)
    .moveTo(MARGEM, y + altura)
    .lineTo(MARGEM + LARGURA, y + altura)
    .stroke();
  return y + altura;
}

function blocoTexto(
  doc: Doc,
  x: number,
  y: number,
  largura: number,
  altura: number,
  rotulo: string,
  conteudo: string[],
): void {
  doc.lineWidth(0.5).rect(x, y, largura, altura).stroke();
  doc
    .font(FONTE)
    .fontSize(5.5)
    .fillColor(COR_ROTULO)
    .text(rotulo, x + 2, y + 1.5, { width: largura - 4, lineBreak: false });
  doc.font(FONTE).fontSize(8).fillColor('#000000');
  const maxLinhas = Math.floor((altura - 10) / 10);
  conteudo.slice(0, maxLinhas).forEach((linha, i) => {
    doc.text(caber(doc, linha, largura - 4), x + 2, y + 9 + i * 10, {
      width: largura - 4,
      lineBreak: false,
    });
  });
}

function recibo(doc: Doc, m: ModeloBoleto, y0: number): number {
  let y = cabecalho(doc, m, y0, 'Recibo do Pagador', false);
  const larguraEsq = LARGURA - COLUNA_DIREITA;
  const xDir = MARGEM + larguraEsq;

  campo(
    doc,
    MARGEM,
    y,
    larguraEsq,
    ALTURA_LINHA,
    'Beneficiário',
    `${m.beneficiario}  ${m.beneficiarioDocumento}`.trim(),
  );
  campo(doc, xDir, y, COLUNA_DIREITA, ALTURA_LINHA, 'Vencimento', m.vencimento, {
    alinhar: 'right',
    negrito: true,
  });
  y += ALTURA_LINHA;

  const terco = larguraEsq / 3;
  campo(
    doc,
    MARGEM,
    y,
    terco,
    ALTURA_LINHA,
    'Agência / Código do Beneficiário',
    m.agenciaCodigoBeneficiario,
  );
  campo(doc, MARGEM + terco, y, terco, ALTURA_LINHA, 'Nosso Número', m.nossoNumero);
  campo(doc, MARGEM + 2 * terco, y, terco, ALTURA_LINHA, 'Nº do Documento', m.numeroDocumento);
  campo(doc, xDir, y, COLUNA_DIREITA, ALTURA_LINHA, '(=) Valor do Documento', m.valorDocumento, {
    alinhar: 'right',
    negrito: true,
  });
  y += ALTURA_LINHA;

  campo(doc, MARGEM, y, larguraEsq, ALTURA_LINHA, 'Pagador', m.pagador);
  campo(doc, xDir, y, COLUNA_DIREITA, ALTURA_LINHA, '(=) Valor Cobrado', '', { alinhar: 'right' });
  y += ALTURA_LINHA;

  const alturaDemo = 22 * MM;
  blocoTexto(doc, MARGEM, y, larguraEsq, alturaDemo, 'Demonstrativo', m.demonstrativo);
  doc
    .font(FONTE)
    .fontSize(6)
    .fillColor(COR_ROTULO)
    .text('Autenticação Mecânica', xDir, y + 2, { width: COLUNA_DIREITA, align: 'right' });
  y += alturaDemo;

  // linha de corte
  y += 4 * MM;
  doc
    .save()
    .lineWidth(0.5)
    .dash(3, { space: 2 })
    .moveTo(MARGEM, y)
    .lineTo(MARGEM + LARGURA, y)
    .stroke()
    .undash()
    .restore();
  doc
    .font(FONTE)
    .fontSize(5.5)
    .fillColor(COR_ROTULO)
    .text('Corte na linha pontilhada', MARGEM, y + 1.5, { width: LARGURA, align: 'right' });
  return y + 5 * MM;
}

function fichaCompensacao(doc: Doc, m: ModeloBoleto, y0: number): void {
  let y = cabecalho(doc, m, y0, m.linhaDigitavel, true);
  const larguraEsq = LARGURA - COLUNA_DIREITA;
  const xDir = MARGEM + larguraEsq;
  const dir = { alinhar: 'right' as const };

  campo(doc, MARGEM, y, larguraEsq, ALTURA_LINHA, 'Local de Pagamento', m.localPagamento);
  campo(doc, xDir, y, COLUNA_DIREITA, ALTURA_LINHA, 'Vencimento', m.vencimento, {
    ...dir,
    negrito: true,
    fundo: true,
  });
  y += ALTURA_LINHA;

  // Beneficiário em duas linhas: nome + documento / endereço
  const alturaBenef = ALTURA_LINHA + 3 * MM;
  campo(doc, MARGEM, y, larguraEsq, alturaBenef, 'Beneficiário', m.beneficiarioEndereco);
  doc.font(FONTE).fontSize(8.5);
  doc.text(
    caber(
      doc,
      [m.beneficiario, m.beneficiarioDocumento].filter(Boolean).join(' - '),
      larguraEsq - 4,
    ),
    MARGEM + 2,
    y + 9,
    { width: larguraEsq - 4, lineBreak: false },
  );
  campo(
    doc,
    xDir,
    y,
    COLUNA_DIREITA,
    alturaBenef,
    'Agência / Código do Beneficiário',
    m.agenciaCodigoBeneficiario,
    dir,
  );
  y += alturaBenef;

  const c = [0.17, 0.2, 0.13, 0.1, 0.2, 0.2].map((f) => f * larguraEsq);
  let x = MARGEM;
  const linha3: [string, string][] = [
    ['Data do Documento', m.dataDocumento],
    ['Nº do Documento', m.numeroDocumento],
    ['Espécie Doc.', m.especieDocumento],
    ['Aceite', m.aceite],
    ['Data Processamento', m.dataProcessamento],
  ];
  linha3.forEach(([rotulo, valor], i) => {
    const w = i === linha3.length - 1 ? c[i]! + c[5]! : c[i]!;
    campo(doc, x, y, w, ALTURA_LINHA, rotulo, valor);
    x += w;
  });
  campo(doc, xDir, y, COLUNA_DIREITA, ALTURA_LINHA, 'Nosso Número', m.nossoNumero, dir);
  y += ALTURA_LINHA;

  x = MARGEM;
  const linha4: [string, string][] = [
    ['Uso do Banco', ''],
    ['Carteira', m.carteira],
    ['Espécie', m.especie],
    ['Quantidade', ''],
    ['(x) Valor', ''],
  ];
  linha4.forEach(([rotulo, valor], i) => {
    const w = i === linha4.length - 1 ? c[i]! + c[5]! : c[i]!;
    campo(doc, x, y, w, ALTURA_LINHA, rotulo, valor);
    x += w;
  });
  campo(doc, xDir, y, COLUNA_DIREITA, ALTURA_LINHA, '(=) Valor do Documento', m.valorDocumento, {
    ...dir,
    negrito: true,
    fundo: true,
  });
  y += ALTURA_LINHA;

  const direita = [
    '(-) Desconto / Abatimento',
    '(-) Outras Deduções',
    '(+) Mora / Multa',
    '(+) Outros Acréscimos',
    '(=) Valor Cobrado',
  ];
  const alturaInstrucoes = ALTURA_LINHA * direita.length;
  blocoTexto(
    doc,
    MARGEM,
    y,
    larguraEsq,
    alturaInstrucoes,
    'Instruções (texto de responsabilidade do beneficiário)',
    m.instrucoes,
  );
  direita.forEach((rotulo, i) => {
    campo(doc, xDir, y + i * ALTURA_LINHA, COLUNA_DIREITA, ALTURA_LINHA, rotulo, '', dir);
  });
  y += alturaInstrucoes;

  const alturaPagador = 13 * MM;
  blocoTexto(
    doc,
    MARGEM,
    y,
    LARGURA,
    alturaPagador,
    'Pagador',
    [m.pagador, m.pagadorEndereco].filter(Boolean),
  );
  y += alturaPagador;

  campo(doc, MARGEM, y, larguraEsq, ALTURA_LINHA - 6, 'Sacador / Avalista', m.sacadorAvalista);
  campo(doc, xDir, y, COLUNA_DIREITA, ALTURA_LINHA - 6, 'Código de Baixa', '', dir);
  y += ALTURA_LINHA - 6;

  // Código de barras: barra estreita de 0,254 mm (≈ 103 mm no total) e 13 mm de altura
  const { barras } = barrasI2of5(m.codigoBarras);
  const modulo = 0.254 * MM;
  const alturaBarras = 13 * MM;
  const yBarras = y + 3 * MM;
  doc.fillColor('#000000');
  for (const barra of barras) {
    doc.rect(MARGEM + barra.x * modulo, yBarras, barra.largura * modulo, alturaBarras).fill();
  }
  doc
    .font(FONTE)
    .fontSize(6)
    .fillColor(COR_ROTULO)
    .text('Autenticação Mecânica - Ficha de Compensação', xDir - 20 * MM, y + 1.5, {
      width: COLUNA_DIREITA + 20 * MM,
      align: 'right',
    });
}

function desenharBoleto(doc: Doc, modelo: ModeloBoleto, opcoes: OpcoesPdf): void {
  let y = MARGEM;
  if (opcoes.recibo !== false) {
    y = recibo(doc, modelo, y);
  }
  fichaCompensacao(doc, modelo, y);
}

/**
 * Gera um PDF com um boleto por página.
 *
 * @param boletos objeto(s) retornado(s) por `gerarBoleto`/`criarBoleto`
 * @returns conteúdo do PDF
 */
export async function gerarBoletoPdf(
  boletos: BoletoJsonOutput | BoletoJsonOutput[],
  opcoes: OpcoesPdf = {},
): Promise<Buffer> {
  const lista = Array.isArray(boletos) ? boletos : [boletos];
  if (lista.length === 0) {
    throw new Error('Informe ao menos um boleto.');
  }
  // Monta (e valida) todos os modelos antes de começar a escrever o PDF
  const modelos = lista.map(montarModelo);

  const primeiro = modelos[0]!;
  const titulo =
    opcoes.titulo ?? (modelos.length === 1 ? `Boleto ${primeiro.nossoNumero}` : 'Boletos');
  // Chaves do dicionário Info definidas pela especificação PDF
  const info = Object.fromEntries([
    ['Title', titulo],
    ['Author', primeiro.beneficiario],
    ['Producer', '@box4dev/gerador-boleto'],
    ['Creator', '@box4dev/gerador-boleto'],
    ['CreationDate', opcoes.dataCriacao ?? new Date()],
  ]) as PDFKit.DocumentInfo;

  const doc = new PdfDocument({ size: 'A4', margin: 0, autoFirstPage: false, info });

  return new Promise<Buffer>((resolve, reject) => {
    const partes: Buffer[] = [];
    doc.on('data', (parte: Buffer) => partes.push(parte));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);
    try {
      for (const modelo of modelos) {
        doc.addPage();
        desenharBoleto(doc, modelo, opcoes);
      }
      doc.end();
    } catch (erro) {
      reject(erro);
    }
  });
}
