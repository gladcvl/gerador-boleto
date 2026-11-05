import { normalizeDate } from '../util/date.js';
import { zeroPad } from '../util/string.js';
import { mod10, mod11 } from './checksum.js';

const MS_PER_DAY = 86_400_000;
const FEBRABAN_BASE_DATE = Date.UTC(1997, 9, 7);
const FEBRABAN_RESTART_DATE = Date.UTC(2025, 1, 22);

export function dvBarraModulo11(barra: string): number {
  const resto2 = mod11(barra, 9, 1);
  return resto2 === 0 || resto2 === 1 || resto2 === 10 ? 1 : 11 - resto2;
}

function formatCampo(campo: string): string {
  const dv = mod10(campo);
  const comDv = `${campo}${dv}`;
  return `${comDv.substring(0, 5)}.${comDv.substring(5)}`;
}

export function linhaDigitavelPadrao(codBarras: string): string {
  const campos: string[] = [];

  let campo =
    codBarras.substring(0, 3) +
    codBarras.substring(3, 4) +
    codBarras.substring(19, 20) +
    codBarras.substring(20, 24);
  campos.push(formatCampo(campo));

  campo = codBarras.substring(24, 34);
  campos.push(formatCampo(campo));

  campo = codBarras.substring(34, 44);
  campos.push(formatCampo(campo));

  campos.push(codBarras.substring(4, 5));

  campo = codBarras.substring(5, 9) + codBarras.substring(9, 19);
  campos.push(campo);

  return campos.join(' ');
}

export function fatorVencimento(date: Date | string): string {
  const end = normalizeDate(date).getTime();
  let factor = Math.round((end - FEBRABAN_BASE_DATE) / MS_PER_DAY);

  if (end >= FEBRABAN_RESTART_DATE) {
    // A partir de 22/02/2025, reinicia a contagem a partir de 1000
    factor = Math.round((end - FEBRABAN_RESTART_DATE) / MS_PER_DAY) + 1000;
  } else if (factor >= 10000) {
    // Antes de 22/02/2025, mantém a lógica original (fallback para sistemas legados)
    factor = (factor % 10000) + 1000;
  }

  if (factor < 1000 || factor > 9999) {
    throw new Error(
      `Data de vencimento fora da faixa suportada pelo fator de vencimento FEBRABAN: ${normalizeDate(date).toISOString().slice(0, 10)}`,
    );
  }

  return zeroPad(factor, 4);
}
