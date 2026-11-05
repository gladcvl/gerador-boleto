/**
 * Datas de boleto são datas de calendário (sem hora). Internamente são
 * representadas como `Date` à meia-noite UTC.
 *
 * Regras de conversão:
 * - `'DD/MM/AAAA'` (padrão brasileiro) e `'AAAA-MM-DD'` → a data literal.
 * - ISO com hora (`'2026-05-15T22:00:00-03:00'`) → a data escrita na string,
 *   independente do fuso (evita "pular" para o dia seguinte em UTC).
 * - `Date` exatamente à meia-noite UTC → a data UTC (valores "só data",
 *   como os produzidos por `new Date('2026-05-15')` e pela própria lib).
 * - Qualquer outro `Date` (ex.: `new Date()`) → a data no horário de Brasília,
 *   que é o calendário usado pela compensação bancária.
 */

const TIMEZONE_BRASIL = 'America/Sao_Paulo';

const RE_BR = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const RE_ISO = /^(\d{4})-(\d{2})-(\d{2})(?:[T ][\d:.]+(?:Z|[+-]\d{2}:?\d{2})?)?$/;

const formatterBrasil = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE_BRASIL,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function invalida(value: unknown): Error {
  return new Error(`Data inválida: ${String(value)}`);
}

/** Cria a data UTC validando que dia/mês existem (rejeita 31/02, 15/13 etc.). */
function dataUtc(ano: number, mes: number, dia: number, original: unknown): Date {
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  if (d.getUTCFullYear() !== ano || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) {
    throw invalida(original);
  }
  return d;
}

function dataNoBrasil(instante: Date): Date {
  const [ano, mes, dia] = formatterBrasil.format(instante).split('-').map(Number);
  return new Date(Date.UTC(ano!, mes! - 1, dia!));
}

export function normalizeDate(value: Date | string): Date {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw invalida(value);
    }
    const ehMeiaNoiteUtc =
      value.getUTCHours() === 0 &&
      value.getUTCMinutes() === 0 &&
      value.getUTCSeconds() === 0 &&
      value.getUTCMilliseconds() === 0;
    if (ehMeiaNoiteUtc) {
      return new Date(value.getTime());
    }
    return dataNoBrasil(value);
  }

  if (typeof value !== 'string') {
    throw invalida(value);
  }

  const texto = value.trim();
  const br = RE_BR.exec(texto);
  if (br) {
    return dataUtc(Number(br[3]), Number(br[2]), Number(br[1]), value);
  }

  const iso = RE_ISO.exec(texto);
  if (iso) {
    return dataUtc(Number(iso[1]), Number(iso[2]), Number(iso[3]), value);
  }

  throw invalida(value);
}

/** Data de hoje no calendário de Brasília (meia-noite UTC). */
export function utcToday(): Date {
  return dataNoBrasil(new Date());
}

/** Formata uma data como DD/MM/AAAA. */
export function formatarDataBr(date: Date): string {
  const d = String(date.getUTCDate()).padStart(2, '0');
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getUTCFullYear()}`;
}
