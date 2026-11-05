import type { BoletoRuntime } from '../types.js';
import { centavos, digitos } from '../util/validate.js';

/** Valor do documento com 10 dígitos para o código de barras. */
export function valorBarras(boleto: BoletoRuntime): string {
  return String(centavos(boleto.valorDocumento)).padStart(10, '0');
}

/** Insere o DV geral na posição 5 do código de barras. */
export function inserirDv(barraSemDv: string, dv: number): string {
  const codigo = barraSemDv.substring(0, 4) + String(dv) + barraSemDv.substring(4);
  if (!/^\d{44}$/.test(codigo)) {
    throw new Error(`Falha interna: código de barras gerado inválido (${codigo}).`);
  }
  return codigo;
}

function comDv(numero: string, dv: unknown): string {
  return typeof dv === 'string' && dv.trim() !== '' ? `${numero}-${dv.trim()}` : numero;
}

/** Agência formatada com DV opcional, ou vazio se não informada. */
export function agenciaFormatada(boleto: BoletoRuntime, tamanho = 4): string {
  if (boleto.agencia == null || boleto.agencia === '') {
    return '';
  }
  return comDv(digitos(boleto.agencia, 'agencia', tamanho), boleto.agenciaDv);
}

export function contaFormatada(conta: string, boleto: BoletoRuntime): string {
  return comDv(conta, boleto.contaDv);
}

export function juntarAgenciaCodigo(agencia: string, codigo: string): string {
  return agencia ? `${agencia} / ${codigo}` : codigo;
}
