/**
 * Código de barras Interleaved 2 of 5 (ITF), exigido pela FEBRABAN para os
 * 44 dígitos do boleto.
 *
 * Cada dígito tem 5 elementos (2 largos, 3 estreitos). Os dígitos são
 * agrupados em pares: o primeiro define as barras e o segundo os espaços.
 * Início: barra-espaço-barra-espaço estreitos. Fim: barra larga, espaço
 * estreito, barra estreita.
 */

const PADROES = [
  'nnwwn', // 0
  'wnnnw', // 1
  'nwnnw', // 2
  'wwnnn', // 3
  'nnwnw', // 4
  'wnwnn', // 5
  'nwwnn', // 6
  'nnnww', // 7
  'wnnwn', // 8
  'nwnwn', // 9
];

/** Razão entre elemento largo e estreito (FEBRABAN: entre 2,25 e 3). */
export const RAZAO_LARGO = 3;

export interface Barra {
  /** Posição inicial, em unidades de barra estreita */
  x: number;
  /** Largura, em unidades de barra estreita */
  largura: number;
}

/**
 * Converte o código em barras. Larguras e posições estão em "módulos"
 * (largura da barra estreita); multiplique pela largura física desejada.
 */
export function barrasI2of5(codigo: string): { barras: Barra[]; larguraTotal: number } {
  if (!/^\d+$/.test(codigo) || codigo.length % 2 !== 0) {
    throw new Error('Interleaved 2 of 5 exige quantidade par de dígitos numéricos.');
  }

  // Sequência de elementos alternando barra/espaço, começando por barra.
  const elementos: number[] = [1, 1, 1, 1]; // início
  for (let i = 0; i < codigo.length; i += 2) {
    const barras = PADROES[Number(codigo[i])]!;
    const espacos = PADROES[Number(codigo[i + 1])]!;
    for (let j = 0; j < 5; j++) {
      elementos.push(barras[j] === 'w' ? RAZAO_LARGO : 1);
      elementos.push(espacos[j] === 'w' ? RAZAO_LARGO : 1);
    }
  }
  elementos.push(RAZAO_LARGO, 1, 1); // fim

  const resultado: Barra[] = [];
  let x = 0;
  elementos.forEach((largura, indice) => {
    if (indice % 2 === 0) {
      resultado.push({ x, largura });
    }
    x += largura;
  });
  return { barras: resultado, larguraTotal: x };
}
