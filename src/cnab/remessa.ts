import type { BankId, BoletoJsonOutput, Pessoa } from '../types.js';
import { normalizeDate } from '../util/date.js';
import { apenasDigitos, ascii } from '../util/format.js';
import { centavos, digitos } from '../util/validate.js';
import { type Banco240, type BeneficiarioCnab, banco240 } from './bancos.js';
import { CnabError, type Dados, escrever, type Layout, validarLayout } from './layout.js';
import { MOVIMENTOS_REMESSA, type MovimentoRemessa } from './ocorrencias.js';

/** Juros de mora: valor fixo por dia (centavos) OU taxa mensal (%). */
export type Juros = { valorDia: number } | { taxaMensal: number } | { isento: true };
/** Multa: valor fixo (centavos) OU percentual (%). */
export type Multa =
  | { valor: number; data?: Date | string }
  | { percentual: number; data?: Date | string };
/** Desconto até uma data: valor fixo (centavos) OU percentual (%). */
export type Desconto = ({ valor: number } | { percentual: number }) & { ate: Date | string };

export interface TituloRemessa {
  /** Objeto retornado por `criarBoleto` (deve conter `pagador` com endereço) */
  boleto: BoletoJsonOutput;
  /** Padrão: 'entrada' (registro do título) */
  movimento?: MovimentoRemessa;
  juros?: Juros;
  multa?: Multa;
  desconto?: Desconto;
  /** Protestar após N dias corridos do vencimento */
  protestoDias?: number;
  /** Baixar/devolver após N dias do vencimento */
  baixaDias?: number;
  /** Identificação do título na empresa (volta no retorno). Padrão: numeroDocumento */
  usoEmpresa?: string;
}

export interface OpcoesRemessa {
  banco: BankId;
  beneficiario: BeneficiarioCnab;
  /** Número sequencial do arquivo (NSA). Deve crescer a cada remessa enviada. */
  sequencial: number;
  titulos: TituloRemessa[];
  /** Padrão: agora */
  dataGeracao?: Date;
  /** Caixa: marca o arquivo como teste ('REMESSA-TESTE') */
  teste?: boolean;
  mensagens?: [string?, string?];
}

const CRLF = '\r\n';

function dataCnab(valor: Date | string | undefined | null): string {
  if (!valor) {
    return '0'.repeat(8);
  }
  const d = normalizeDate(valor);
  return (
    String(d.getUTCDate()).padStart(2, '0') +
    String(d.getUTCMonth() + 1).padStart(2, '0') +
    String(d.getUTCFullYear())
  );
}

function partesBrasilia(d: Date): { data: string; hora: string } {
  const f = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const p = (t: string) => f.find((x) => x.type === t)!.value;
  return {
    data: `${p('day')}${p('month')}${p('year')}`,
    hora: `${p('hour')}${p('minute')}${p('second')}`,
  };
}

/** Percentual com 2 casas → inteiro (2% → 200; 1,5% → 150). */
function percentual(valor: number, campo: string): number {
  const n = Math.round(valor * 100);
  if (!Number.isFinite(valor) || valor < 0 || Math.abs(n - valor * 100) > 1e-6) {
    throw new CnabError(`${campo}: percentual inválido (${valor}); use até 2 casas decimais.`);
  }
  return n;
}

function tipoInscricao(documento: string, campo: string): { tipo: string; numero: string } {
  const d = apenasDigitos(documento);
  if (d.length === 11) {
    return { tipo: '1', numero: d };
  }
  if (d.length === 14) {
    return { tipo: '2', numero: d };
  }
  throw new CnabError(`${campo}: CPF/CNPJ inválido ("${documento}").`);
}

function exigirPagador(
  b: BoletoJsonOutput,
  indice: number,
): Required<Pick<Pessoa, 'nome' | 'documento'>> & Pessoa {
  const p = b.pagador as Pessoa | undefined;
  const e = p?.endereco;
  const faltando = [
    !p?.nome && 'pagador.nome',
    !p?.documento && 'pagador.documento',
    !e?.logradouro && 'pagador.endereco.logradouro',
    !e?.cidade && 'pagador.endereco.cidade',
    !e?.uf && 'pagador.endereco.uf',
    apenasDigitos(e?.cep).length !== 8 && 'pagador.endereco.cep',
  ].filter(Boolean);
  if (faltando.length > 0) {
    throw new CnabError(
      `titulos[${indice}]: os bancos exigem ${faltando.join(', ')} para registrar o título.`,
    );
  }
  return p as Required<Pick<Pessoa, 'nome' | 'documento'>> & Pessoa;
}

function especie(banco: Banco240, b: BoletoJsonOutput): string {
  const sigla = String(b.especieDocumento ?? 'DM').toUpperCase();
  if (/^\d{2}$/.test(sigla)) {
    return sigla;
  }
  const codigo = banco.especies[sigla];
  if (!codigo) {
    throw new CnabError(
      `Espécie "${sigla}" sem código para ${banco.id}; informe o código numérico.`,
    );
  }
  return codigo;
}

function dadosJuros(t: TituloRemessa, venc: Date): Dados {
  const j = t.juros;
  if (!j || 'isento' in j) {
    return { codigoJuros: '3' };
  }
  const dia = new Date(venc.getTime() + 86_400_000);
  if ('valorDia' in j) {
    return {
      codigoJuros: '1',
      dataJuros: dataCnab(dia),
      juros: centavos(j.valorDia, 'juros.valorDia'),
    };
  }
  return {
    codigoJuros: '2',
    dataJuros: dataCnab(dia),
    juros: percentual(j.taxaMensal, 'juros.taxaMensal'),
  };
}

function dadosDesconto(t: TituloRemessa): Dados {
  const d = t.desconto;
  if (!d) {
    return { codigoDesconto: '0' };
  }
  return 'valor' in d
    ? {
        codigoDesconto: '1',
        dataDesconto: dataCnab(d.ate),
        desconto: centavos(d.valor, 'desconto.valor'),
      }
    : {
        codigoDesconto: '2',
        dataDesconto: dataCnab(d.ate),
        desconto: percentual(d.percentual, 'desconto.percentual'),
      };
}

function dadosMulta(t: TituloRemessa, venc: Date): Dados {
  const m = t.multa!;
  const data = dataCnab(m.data ?? new Date(venc.getTime() + 86_400_000));
  return 'valor' in m
    ? { codigoMulta: '1', dataMulta: data, multa: centavos(m.valor, 'multa.valor') }
    : { codigoMulta: '2', dataMulta: data, multa: percentual(m.percentual, 'multa.percentual') };
}

function linhasTitulo(
  banco: Banco240,
  beneficiario: BeneficiarioCnab,
  t: TituloRemessa,
  indice: number,
  proximoSequencial: () => number,
): string[] {
  const b = t.boleto;
  if (b?.banco !== banco.id || typeof b.codigoBarras !== 'string') {
    throw new CnabError(
      `titulos[${indice}]: boleto ausente ou de outro banco (esperado ${banco.id}); use o retorno de criarBoleto().`,
    );
  }
  banco.validarTitulo(b, beneficiario);

  const chaveMovimento = t.movimento ?? 'entrada';
  if (!Object.hasOwn(MOVIMENTOS_REMESSA, chaveMovimento)) {
    throw new CnabError(`titulos[${indice}]: movimento inválido "${String(t.movimento)}".`);
  }
  const movimento = MOVIMENTOS_REMESSA[chaveMovimento];
  const pagador = exigirPagador(b, indice);
  const insc = tipoInscricao(pagador.documento, `titulos[${indice}].pagador.documento`);
  const venc = normalizeDate(b.dataVencimento);
  const comum = { banco: banco.codigo, lote: '0001', movimento };

  const p = escrever(
    banco.layout.segmentoP,
    {
      ...comum,
      ...banco.padroesP,
      ...banco.dadosTitulo(b, beneficiario),
      sequencial: proximoSequencial(),
      numeroDocumento: String(b.numeroDocumento ?? b.nossoNumero),
      vencimento: dataCnab(venc),
      valor: centavos(b.valorDocumento),
      especie: especie(banco, b),
      aceite: b.aceite === 'S' ? 'A' : 'N',
      dataEmissao: dataCnab(b.dataEmissao),
      ...dadosJuros(t, venc),
      ...dadosDesconto(t),
      usoEmpresa: t.usoEmpresa ?? String(b.numeroDocumento ?? ''),
      codigoProtesto: t.protestoDias ? '1' : '3',
      prazoProtesto: t.protestoDias ?? 0,
      codigoBaixa: t.baixaDias ? '1' : '2',
      prazoBaixa: t.baixaDias ?? 0,
    },
    `titulos[${indice}].P`,
  );

  const e = pagador.endereco!;
  const sacador = b.sacadorAvalista as Pessoa | undefined;
  const sacadorInsc = sacador?.documento
    ? tipoInscricao(sacador.documento, `titulos[${indice}].sacadorAvalista.documento`)
    : { tipo: '0', numero: '' };
  const q = escrever(
    banco.layout.segmentoQ,
    {
      ...comum,
      sequencial: proximoSequencial(),
      tipoInscricao: insc.tipo,
      inscricao: insc.numero,
      nome: pagador.nome,
      endereco: [e.logradouro, e.numero, e.complemento].filter(Boolean).join(' '),
      bairro: e.bairro,
      cep: apenasDigitos(e.cep),
      cidade: e.cidade,
      uf: e.uf,
      sacadorTipoInscricao: sacadorInsc.tipo,
      sacadorInscricao: sacadorInsc.numero,
      sacadorNome: sacador?.nome,
    },
    `titulos[${indice}].Q`,
  );

  if (!t.multa) {
    return [p, q];
  }
  const r = escrever(
    banco.layout.segmentoR,
    { ...comum, sequencial: proximoSequencial(), ...dadosMulta(t, venc) },
    `titulos[${indice}].R`,
  );
  return [p, q, r];
}

/** Valida os layouts do banco uma única vez por processo. */
const validados = new WeakSet<object>();
function garantirLayouts(banco: Banco240): void {
  if (validados.has(banco)) {
    return;
  }
  for (const [nome, layout] of Object.entries(banco.layout) as [string, Layout][]) {
    validarLayout(layout, `${banco.id}.${nome}`);
  }
  validados.add(banco);
}

/**
 * Gera o arquivo de REMESSA CNAB 240 (registro de títulos e instruções).
 *
 * Retorna o conteúdo em ASCII com quebras CRLF. Grave com
 * `fs.writeFileSync(caminho, conteudo, 'latin1')`.
 */
export function gerarRemessaCnab240(opcoes: OpcoesRemessa): string {
  const banco = banco240(opcoes?.banco);
  garantirLayouts(banco);
  const benef = opcoes.beneficiario;
  if (!benef?.nome || !benef.documento || !benef.agencia) {
    throw new CnabError(
      'beneficiario.nome, beneficiario.documento e beneficiario.agencia são obrigatórios.',
    );
  }
  if (!Array.isArray(opcoes.titulos) || opcoes.titulos.length === 0) {
    throw new CnabError('Informe ao menos um título.');
  }
  const nsa = Number(digitos(opcoes.sequencial, 'sequencial', 6));
  if (nsa === 0) {
    throw new CnabError('sequencial deve ser maior que zero.');
  }

  const insc = tipoInscricao(benef.documento, 'beneficiario.documento');
  const agora = partesBrasilia(opcoes.dataGeracao ?? new Date());
  const conta = banco.dadosConta(benef);
  const empresa = {
    banco: banco.codigo,
    tipoInscricao: insc.tipo,
    inscricao: insc.numero,
    nomeEmpresa: ascii(benef.nome),
    ...conta,
  };

  const headerArquivo = escrever(
    banco.layout.headerArquivo,
    {
      ...empresa,
      nomeBanco: banco.nomeArquivo,
      codigoRemessa: '1',
      dataGeracao: agora.data,
      horaGeracao: agora.hora,
      nsa,
      versaoLayout: banco.versaoArquivo,
      densidade: banco.densidade,
      reservadoEmpresa:
        banco.id === 'caixa' ? (opcoes.teste ? 'REMESSA-TESTE' : 'REMESSA-PRODUCAO') : '',
    },
    'headerArquivo',
  );

  const headerLote = escrever(
    banco.layout.headerLote,
    {
      ...empresa,
      lote: '0001',
      operacao: 'R',
      versaoLote: banco.versaoLote,
      mensagem1: opcoes.mensagens?.[0],
      mensagem2: opcoes.mensagens?.[1],
      numeroRemessa: nsa,
      dataGravacao: agora.data,
    },
    'headerLote',
  );

  let sequencial = 0;
  const detalhes = opcoes.titulos.flatMap((t, i) =>
    linhasTitulo(banco, benef, t, i, () => ++sequencial),
  );

  const trailerLote = escrever(
    banco.layout.trailerLote,
    { banco: banco.codigo, lote: '0001', quantidadeRegistros: detalhes.length + 2 },
    'trailerLote',
  );
  const linhas = [headerArquivo, headerLote, ...detalhes, trailerLote];
  const trailerArquivo = escrever(
    banco.layout.trailerArquivo,
    { banco: banco.codigo, quantidadeLotes: 1, quantidadeRegistros: linhas.length + 1 },
    'trailerArquivo',
  );
  linhas.push(trailerArquivo);
  return linhas.join(CRLF) + CRLF;
}
