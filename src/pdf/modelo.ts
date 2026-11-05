import { getBank } from '../bank/registry.js';
import type { BoletoJsonOutput, Pessoa } from '../types.js';
import { formatarDataBr, normalizeDate } from '../util/date.js';
import {
  formatarDocumento,
  formatarEndereco,
  formatarMoeda,
  tipoDocumento,
} from '../util/format.js';
import { centavos } from '../util/validate.js';

/** Todos os textos impressos no boleto, já formatados. */
export interface ModeloBoleto {
  nomeBanco: string;
  codigoBanco: string;
  linhaDigitavel: string;
  codigoBarras: string;
  localPagamento: string;
  vencimento: string;
  beneficiario: string;
  beneficiarioDocumento: string;
  beneficiarioEndereco: string;
  agenciaCodigoBeneficiario: string;
  dataDocumento: string;
  numeroDocumento: string;
  especieDocumento: string;
  aceite: string;
  dataProcessamento: string;
  nossoNumero: string;
  carteira: string;
  especie: string;
  valorDocumento: string;
  instrucoes: string[];
  demonstrativo: string[];
  pagador: string;
  pagadorEndereco: string;
  sacadorAvalista: string;
}

function comoPessoa(valor: unknown): Pessoa | undefined {
  if (valor && typeof valor === 'object' && typeof (valor as Pessoa).nome === 'string') {
    return valor as Pessoa;
  }
  return undefined;
}

function texto(valor: unknown): string {
  return typeof valor === 'string' || typeof valor === 'number' ? String(valor) : '';
}

function linhas(valor: unknown): string[] {
  if (Array.isArray(valor)) {
    return valor.map(texto).filter(Boolean);
  }
  return texto(valor)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function pessoaComDocumento(p: Pessoa | undefined): string {
  if (!p) {
    return '';
  }
  const tipo = tipoDocumento(p.documento);
  return p.documento
    ? `${p.nome} - ${tipo ? `${tipo} ` : ''}${formatarDocumento(p.documento)}`
    : p.nome;
}

function data(valor: unknown): string {
  if (!valor) {
    return '';
  }
  return formatarDataBr(normalizeDate(valor as string));
}

/**
 * Converte o JSON gerado por `gerarBoleto`/`criarBoleto` nos textos do PDF.
 * Aceita os campos legados `cedente`/`cedenteCnpj`.
 */
export function montarModelo(b: BoletoJsonOutput): ModeloBoleto {
  const banco = getBank(b.banco);
  if (!banco || typeof b.codigoBarras !== 'string' || !/^\d{44}$/.test(b.codigoBarras)) {
    throw new Error(
      'Boleto inválido para PDF: use o objeto retornado por gerarBoleto() ou criarBoleto().',
    );
  }

  const beneficiario =
    comoPessoa(b.beneficiario) ??
    (b.cedente ? { nome: texto(b.cedente), documento: texto(b.cedenteCnpj) } : undefined);
  const pagador = comoPessoa(b.pagador);
  const sacador = comoPessoa(b.sacadorAvalista);

  const instrucoes = linhas(b.instrucoes);

  return {
    nomeBanco: banco.options.nome,
    codigoBanco: b.codigoBanco,
    linhaDigitavel: b.linhaDigitavel,
    codigoBarras: b.codigoBarras,
    localPagamento: texto(b.localPagamento),
    vencimento: data(b.dataVencimento),
    beneficiario: beneficiario?.nome ?? '',
    beneficiarioDocumento: beneficiario?.documento
      ? `${tipoDocumento(beneficiario.documento) || 'Doc.'} ${formatarDocumento(beneficiario.documento)}`
      : '',
    beneficiarioEndereco: formatarEndereco(beneficiario?.endereco),
    agenciaCodigoBeneficiario: b.agenciaCodigoBeneficiario,
    dataDocumento: data(b.dataEmissao),
    numeroDocumento: texto(b.numeroDocumento),
    especieDocumento: texto(b.especieDocumento) || 'DM',
    aceite: texto(b.aceite) || 'N',
    dataProcessamento: data(b.dataProcessamento ?? b.dataEmissao),
    nossoNumero: b.nossoNumeroFormatado,
    carteira: texto(b.carteira),
    especie: 'R$',
    valorDocumento: formatarMoeda(centavos(b.valorDocumento)),
    instrucoes: instrucoes.length > 0 ? instrucoes : linhas(b.instrucoesPagamento),
    demonstrativo: linhas(b.demonstrativo),
    pagador: pessoaComDocumento(pagador),
    pagadorEndereco: formatarEndereco(pagador?.endereco),
    sacadorAvalista: pessoaComDocumento(sacador),
  };
}
