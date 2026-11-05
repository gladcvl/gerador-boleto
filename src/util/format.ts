import type { Endereco } from '../types.js';

/** 15000 → 'R$ 150,00' */
export function formatarMoeda(centavos: number): string {
  const reais = Math.floor(centavos / 100);
  const cents = String(centavos % 100).padStart(2, '0');
  const milhar = String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${milhar},${cents}`;
}

export function apenasDigitos(valor: unknown): string {
  return String(valor ?? '').replace(/\D/g, '');
}

/** Formata CPF (11) ou CNPJ (14); outros tamanhos são devolvidos como vieram. */
export function formatarDocumento(documento: string | undefined): string {
  const d = apenasDigitos(documento);
  if (d.length === 11) {
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (d.length === 14) {
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return documento ?? '';
}

/** 'CPF' / 'CNPJ' conforme o tamanho, ou vazio. */
export function tipoDocumento(documento: string | undefined): 'CPF' | 'CNPJ' | '' {
  const d = apenasDigitos(documento);
  if (d.length === 11) {
    return 'CPF';
  }
  if (d.length === 14) {
    return 'CNPJ';
  }
  return '';
}

export function formatarCep(cep: string | undefined): string {
  const d = apenasDigitos(cep);
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : (cep ?? '');
}

/** 'Rua X, 10 - Apto 2 - Centro - São Paulo/SP - CEP 01000-000' */
export function formatarEndereco(e: Endereco | undefined): string {
  if (!e) {
    return '';
  }
  const rua = [e.logradouro, e.numero].filter(Boolean).join(', ');
  const cidade = [e.cidade, e.uf].filter(Boolean).join('/');
  const cep = e.cep ? `CEP ${formatarCep(e.cep)}` : '';
  return [rua, e.complemento, e.bairro, cidade, cep].filter(Boolean).join(' - ');
}

/**
 * Remove acentos e caracteres fora do ASCII imprimível. Usado nos arquivos
 * CNAB, que os bancos esperam em ASCII maiúsculo.
 */
export function ascii(texto: unknown): string {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ');
}
