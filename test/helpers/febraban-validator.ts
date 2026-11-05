/**
 * Helpers de validação FEBRABAN para testes automatizados.
 *
 * Reimplementa as funções de validação de boleto (mod10, mod11)
 * de forma independente do código-fonte principal, garantindo
 * que os testes validem o output sem dependência circular.
 *
 * Baseado em: sample/validador.js
 */

/** Calcula o dígito verificador módulo 10 (usado nos campos da linha digitável) */
export function mod10(str: string): number {
  let sum = 0;
  let multiplier = 2;
  for (let i = str.length - 1; i >= 0; i--) {
    let prod = Number.parseInt(str[i]!, 10) * multiplier;
    if (prod > 9) prod = Math.floor(prod / 10) + (prod % 10);
    sum += prod;
    multiplier = multiplier === 2 ? 1 : 2;
  }
  const mod = sum % 10;
  return mod === 0 ? 0 : 10 - mod;
}

/** Calcula o dígito verificador módulo 11 (usado no DV geral do código de barras) */
export function mod11Boleto(str: string): number {
  let sum = 0;
  let multiplier = 2;
  for (let i = str.length - 1; i >= 0; i--) {
    sum += Number.parseInt(str[i]!, 10) * multiplier;
    multiplier++;
    if (multiplier > 9) multiplier = 2;
  }
  const mod = sum % 11;
  const res = 11 - mod;
  if (res === 0 || res === 1 || res === 10 || res === 11) return 1;
  return res;
}

/** Valida o DV geral (posição 5) do código de barras de 44 dígitos */
export function validarCodigoBarras(codBarras: string): {
  valido: boolean;
  dvInformado: number;
  dvCalculado: number;
} {
  if (codBarras.length !== 44) {
    return { valido: false, dvInformado: -1, dvCalculado: -1 };
  }
  const semDv = codBarras.substring(0, 4) + codBarras.substring(5);
  const dvInformado = Number.parseInt(codBarras[4]!, 10);
  const dvCalculado = mod11Boleto(semDv);
  return { valido: dvInformado === dvCalculado, dvInformado, dvCalculado };
}

/** Resultado da validação de um campo individual da linha digitável */
interface CampoValidacao {
  dv: number;
  calculado: number;
  valido: boolean;
}

/** Valida os 3 campos + DV geral da linha digitável de 47 dígitos */
export function validarLinhaDigitavel(linha: string): {
  valida: boolean;
  campo1: CampoValidacao;
  campo2: CampoValidacao;
  campo3: CampoValidacao;
  dvGeral: CampoValidacao;
} {
  const digits = linha.replace(/\D/g, '');
  if (digits.length !== 47) {
    const invalid = { dv: -1, calculado: -1, valido: false };
    return { valida: false, campo1: invalid, campo2: invalid, campo3: invalid, dvGeral: invalid };
  }

  // Campo 1: posições 0-8 → dígitos, posição 9 → DV mod10
  const campo1Str = digits.substring(0, 9);
  const dv1 = Number.parseInt(digits[9]!, 10);
  const calc1 = mod10(campo1Str);

  // Campo 2: posições 10-19 → dígitos, posição 20 → DV mod10
  const campo2Str = digits.substring(10, 20);
  const dv2 = Number.parseInt(digits[20]!, 10);
  const calc2 = mod10(campo2Str);

  // Campo 3: posições 21-30 → dígitos, posição 31 → DV mod10
  const campo3Str = digits.substring(21, 31);
  const dv3 = Number.parseInt(digits[31]!, 10);
  const calc3 = mod10(campo3Str);

  // DV geral: posição 32 → reconstruir barcode e validar mod11
  const dvGeral = Number.parseInt(digits[32]!, 10);
  const barcode =
    digits.substring(0, 3) + // banco (3)
    digits.substring(3, 4) + // moeda (1)
    digits.substring(32, 33) + // dv geral (1)
    digits.substring(33, 47) + // fator + valor (14)
    digits.substring(4, 9) + // campo livre parte 1 (5)
    digits.substring(10, 20) + // campo livre parte 2 (10)
    digits.substring(21, 31); // campo livre parte 3 (10)

  const semDvGeral = barcode.substring(0, 4) + barcode.substring(5);
  const calcDvGeral = mod11Boleto(semDvGeral);

  const campo1 = { dv: dv1, calculado: calc1, valido: dv1 === calc1 };
  const campo2 = { dv: dv2, calculado: calc2, valido: dv2 === calc2 };
  const campo3 = { dv: dv3, calculado: calc3, valido: dv3 === calc3 };
  const dvGeralResult = { dv: dvGeral, calculado: calcDvGeral, valido: dvGeral === calcDvGeral };

  return {
    valida: campo1.valido && campo2.valido && campo3.valido && dvGeralResult.valido,
    campo1,
    campo2,
    campo3,
    dvGeral: dvGeralResult,
  };
}

/** Verifica a consistência entre código de barras e linha digitável */
export function validarConsistenciaBoletoCompleto(
  codBarras: string,
  linhaDigitavel: string,
): {
  barrasValido: boolean;
  linhaValida: boolean;
  consistente: boolean;
} {
  const barrasResult = validarCodigoBarras(codBarras);
  const linhaResult = validarLinhaDigitavel(linhaDigitavel);

  // Reconstruir barcode a partir da linha e comparar
  const digits = linhaDigitavel.replace(/\D/g, '');
  const barcodeReconstruido =
    digits.substring(0, 3) +
    digits.substring(3, 4) +
    digits.substring(32, 33) +
    digits.substring(33, 47) +
    digits.substring(4, 9) +
    digits.substring(10, 20) +
    digits.substring(21, 31);

  return {
    barrasValido: barrasResult.valido,
    linhaValida: linhaResult.valida,
    consistente: barcodeReconstruido === codBarras,
  };
}
