import type { BankId } from '../types.js';
import { type Banco240, banco240PorCodigo } from './bancos.js';
import { CnabError, ler, TAMANHO_REGISTRO } from './layout.js';
import { MOVIMENTOS_LIQUIDACAO, MOVIMENTOS_REJEICAO, MOVIMENTOS_RETORNO } from './ocorrencias.js';

export interface TituloRetorno {
  /** Código de movimento do retorno (ex.: '06' = liquidação) */
  codigoMovimento: string;
  descricaoMovimento: string;
  liquidado: boolean;
  rejeitado: boolean;
  /** Motivos da ocorrência (códigos de 2 posições, tabela do banco) */
  motivos: string[];
  nossoNumero: string;
  numeroDocumento: string;
  /** Identificação do título na empresa, como enviado na remessa */
  usoEmpresa: string;
  /** Datas em ISO (AAAA-MM-DD) ou null quando zeradas */
  vencimento: string | null;
  dataOcorrencia: string | null;
  dataCredito: string | null;
  /** Valores em centavos */
  valorTitulo: number;
  valorPago: number;
  valorLiquido: number;
  tarifa: number;
  jurosMultaEncargos: number;
  desconto: number;
  abatimento: number;
  iof: number;
  outrasDespesas: number;
  outrosCreditos: number;
  pagador: { nome: string; documento: string };
  /** Linhas (1-based) dos segmentos T e U no arquivo */
  linhaT: number;
  linhaU: number | null;
}

export interface RetornoCnab240 {
  banco: BankId;
  codigoBanco: string;
  empresa: { nome: string; documento: string };
  /** ISO AAAA-MM-DD */
  dataGeracao: string | null;
  sequencial: number;
  titulos: TituloRetorno[];
}

function dataIso(ddmmaaaa: string | undefined): string | null {
  if (!ddmmaaaa || /^0+$/.test(ddmmaaaa) || !/^\d{8}$/.test(ddmmaaaa)) {
    return null;
  }
  const iso = `${ddmmaaaa.slice(4)}-${ddmmaaaa.slice(2, 4)}-${ddmmaaaa.slice(0, 2)}`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

function valor(texto: string | undefined): number {
  return texto && /^\d+$/.test(texto) ? Number(texto) : 0;
}

function documento(tipo: string | undefined, numero: string | undefined): string {
  const n = numero ?? '';
  if (tipo === '1') {
    return n.slice(-11);
  }
  if (tipo === '2') {
    return n.slice(-14);
  }
  return n.replace(/^0+/, '');
}

function linhasDoArquivo(conteudo: string | Uint8Array): string[] {
  const texto = typeof conteudo === 'string' ? conteudo : Buffer.from(conteudo).toString('latin1');
  const linhas = texto.split(/\r?\n/);
  while (linhas.length > 0 && linhas[linhas.length - 1]!.trim() === '') {
    linhas.pop();
  }
  linhas.forEach((linha, i) => {
    if (linha.length !== TAMANHO_REGISTRO) {
      throw new CnabError(
        `Linha ${i + 1}: esperado ${TAMANHO_REGISTRO} posições, encontrado ${linha.length}. O arquivo não é CNAB 240 ou está corrompido.`,
      );
    }
  });
  return linhas;
}

function montarTitulo(
  banco: Banco240,
  t: Record<string, string>,
  u: Record<string, string> | undefined,
  linhaT: number,
  linhaU: number | null,
): TituloRetorno {
  const codigo = t.movimento!;
  const motivos = (t.motivos ?? '').match(/.{2}/g)?.filter((m) => m.trim() && m !== '00') ?? [];
  return {
    codigoMovimento: codigo,
    descricaoMovimento: MOVIMENTOS_RETORNO[codigo] ?? 'Ocorrência não catalogada',
    liquidado: MOVIMENTOS_LIQUIDACAO.has(codigo),
    rejeitado: MOVIMENTOS_REJEICAO.has(codigo),
    motivos,
    nossoNumero: banco.nossoNumeroRetorno(t),
    numeroDocumento: (t.numeroDocumento ?? '').trim(),
    usoEmpresa: (t.usoEmpresa ?? '').trim(),
    vencimento: dataIso(t.vencimento),
    dataOcorrencia: dataIso(u?.dataOcorrencia),
    dataCredito: dataIso(u?.dataCredito),
    valorTitulo: valor(t.valor),
    valorPago: valor(u?.valorPago),
    valorLiquido: valor(u?.valorLiquido),
    tarifa: valor(t.tarifa),
    jurosMultaEncargos: valor(u?.jurosMultaEncargos),
    desconto: valor(u?.desconto),
    abatimento: valor(u?.abatimento),
    iof: valor(u?.iof),
    outrasDespesas: valor(u?.outrasDespesas),
    outrosCreditos: valor(u?.outrosCreditos),
    pagador: {
      nome: (t.pagadorNome ?? '').trim(),
      documento: documento(t.pagadorTipoInscricao, t.pagadorInscricao),
    },
    linhaT,
    linhaU,
  };
}

/** Percorre as linhas acumulando títulos (T + U) e conferindo os trailers. */
class LeitorRetorno {
  private readonly titulos: TituloRetorno[] = [];
  private pendente: { t: Record<string, string>; linha: number } | undefined;
  private lotes = 0;
  private registrosLote = 0;

  constructor(
    private readonly banco: Banco240,
    private readonly totalLinhas: number,
  ) {}

  processar(linha: string, numeroLinha: number): void {
    if (linha.slice(0, 3) !== this.banco.codigo) {
      throw new CnabError(
        `Linha ${numeroLinha}: código de banco ${linha.slice(0, 3)} diferente do header.`,
      );
    }
    switch (linha[7]) {
      case '1':
        this.lotes++;
        this.registrosLote = 1;
        break;
      case '3':
        this.registrosLote++;
        this.detalhe(linha, numeroLinha);
        break;
      case '5':
        this.fecharPendente();
        this.trailerLote(linha, numeroLinha);
        break;
      case '9':
        this.trailerArquivo(linha);
        break;
      default:
        break;
    }
  }

  finalizar(): TituloRetorno[] {
    this.fecharPendente();
    return this.titulos;
  }

  private detalhe(linha: string, numeroLinha: number): void {
    const segmento = linha[13];
    if (segmento === 'T') {
      this.fecharPendente();
      this.pendente = { t: ler(this.banco.layout.segmentoT, linha), linha: numeroLinha };
    } else if (segmento === 'U') {
      this.fecharPendente(ler(this.banco.layout.segmentoU, linha), numeroLinha);
    }
  }

  private fecharPendente(u?: Record<string, string>, linhaU: number | null = null): void {
    if (this.pendente) {
      this.titulos.push(montarTitulo(this.banco, this.pendente.t, u, this.pendente.linha, linhaU));
      this.pendente = undefined;
    }
  }

  private trailerLote(linha: string, numeroLinha: number): void {
    const informado = Number(ler(this.banco.layout.trailerLote, linha).quantidadeRegistros);
    if (informado !== this.registrosLote + 1) {
      throw new CnabError(
        `Linha ${numeroLinha}: trailer de lote informa ${informado} registros, o lote tem ${this.registrosLote + 1}. Arquivo incompleto?`,
      );
    }
  }

  private trailerArquivo(linha: string): void {
    const trailer = ler(this.banco.layout.trailerArquivo, linha);
    const registros = Number(trailer.quantidadeRegistros);
    const lotes = Number(trailer.quantidadeLotes);
    if (registros !== this.totalLinhas || lotes !== this.lotes) {
      throw new CnabError(
        `Trailer de arquivo inconsistente: informa ${registros} registros e ${lotes} lote(s); o arquivo tem ${this.totalLinhas} e ${this.lotes}.`,
      );
    }
  }
}

/**
 * Lê um arquivo de RETORNO CNAB 240 (segmentos T e U). O banco é detectado
 * pelo header. Valida o tamanho das linhas e as quantidades dos trailers,
 * para detectar arquivos truncados.
 */
export function lerRetornoCnab240(conteudo: string | Uint8Array): RetornoCnab240 {
  const linhas = linhasDoArquivo(conteudo);
  if (linhas.length < 2 || linhas[0]![7] !== '0') {
    throw new CnabError('Arquivo sem header de arquivo (registro 0).');
  }
  const banco = banco240PorCodigo(linhas[0]!.slice(0, 3));
  const header = ler(banco.layout.headerArquivo, linhas[0]!);
  if (header.codigoRemessa !== '2') {
    throw new CnabError(
      'O arquivo não é de retorno (header: código remessa/retorno diferente de 2).',
    );
  }

  const leitor = new LeitorRetorno(banco, linhas.length);
  linhas.forEach((linha, i) => {
    leitor.processar(linha, i + 1);
  });
  const titulos = leitor.finalizar();

  if (linhas[linhas.length - 1]![7] !== '9') {
    throw new CnabError('Arquivo sem trailer de arquivo (registro 9). Arquivo incompleto?');
  }

  return {
    banco: banco.id,
    codigoBanco: banco.codigo,
    empresa: {
      nome: header.nomeEmpresa ?? '',
      documento: documento(header.tipoInscricao, header.inscricao),
    },
    dataGeracao: dataIso(header.dataGeracao),
    sequencial: valor(header.nsa),
    titulos,
  };
}
