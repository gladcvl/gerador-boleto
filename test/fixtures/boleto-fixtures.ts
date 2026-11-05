/**
 * Fixtures de dados para testes E2E.
 *
 * Os payloads e outputs esperados aqui foram extraídos dos arquivos
 * de exemplo (example/) e dos testes unitários existentes (src/index.test.ts),
 * garantindo que os dados de referência estejam centralizados.
 */

// ─── Bradesco ────────────────────────────────────────────

export const BRADESCO_COMPLETO = {
  input: {
    banco: 'bradesco' as const,
    dataEmissao: '2026-05-10T00:00:00.000Z',
    dataVencimento: '2026-05-17T00:00:00.000Z',
    valorDocumento: 15990,
    nossoNumero: '12345678901',
    agencia: '1229',
    codigoCedente: '0000469',
    carteira: '25',
  },
  expected: {
    codigoBanco: '237-2',
    codigoBarras: '23797144900000159901229251234567890100004690',
    linhaDigitavel: '23791.22928 51234.567892 01000.046902 7 14490000015990',
  },
};

export const BRADESCO_MASSA_ESPECIFICA = {
  input: {
    banco: 'bradesco' as const,
    dataEmissao: '2026-05-12T00:00:00.000Z',
    dataVencimento: '2026-05-17T00:00:00.000Z',
    valorDocumento: 70577,
    nossoNumero: 529681698,
    agencia: 1843,
    codigoCedente: 7224250,
    carteira: 69,
  },
  expected: {
    codigoBanco: '237-2',
    codigoBarras: '23791144900000705771843690052968169872242500',
    linhaDigitavel: '23791.84365 90052.968162 98722.425000 1 14490000070577',
    // mod11 pesos 2-7 sobre carteira(69) + NN(00529681698) → resto 6 → DV 5
    nossoNumeroDv: 5,
  },
};

export const BRADESCO_EXAMPLE = {
  input: {
    banco: 'bradesco' as const,
    dataEmissao: '2026-05-10T00:00:00.000Z',
    dataVencimento: '2026-05-17T00:00:00.000Z',
    valorDocumento: 99900,
    nossoNumero: '12345678901',
    agencia: '1229',
    codigoCedente: '0000469',
    carteira: '9',
    localPagamento: 'Local Teste',
    numeroDocumento: '8888888',
    cedente: 'Empresa Teste LTDA',
    cedenteCnpj: '18727053000174',
    instrucoesPagamento: 'Instrução Teste',
  },
};

// ─── Santander ───────────────────────────────────────────

export const SANTANDER_COMPLETO = {
  input: {
    banco: 'santander' as const,
    dataEmissao: '2026-05-10T00:00:00.000Z',
    dataVencimento: '2026-05-17T00:00:00.000Z',
    valorDocumento: 1500,
    nossoNumero: '1234567',
    numeroDocumento: '123123',
    cedente: 'Empresa Teste LTDA',
    cedenteCnpj: '18727053000174',
    agencia: '3978',
    codigoCedente: '6404154',
    carteira: '102',
  },
  expected: {
    codigoBanco: '033-7',
    codigoBarras: '03397144900000015009640415400000123456790102',
    linhaDigitavel: '03399.64041 15400.000129 34567.901029 7 14490000001500',
  },
};

export const SANTANDER_MASSA_ESPECIFICA = {
  input: {
    banco: 'santander' as const,
    dataEmissao: '2026-05-12T00:00:00.000Z',
    dataVencimento: '2026-05-17T00:00:00.000Z',
    valorDocumento: 63180,
    nossoNumero: 408192924,
    agencia: 2071,
    codigoCedente: 4545508,
    carteira: 186,
  },
  expected: {
    codigoBanco: '033-7',
    codigoBarras: '03396144900000631809454550800040819292450186',
    linhaDigitavel: '03399.45453 50800.040813 92924.501866 6 14490000063180',
    nossoNumeroDv: 5,
  },
};

export const SANTANDER_EXAMPLE = {
  input: {
    banco: 'santander' as const,
    dataEmissao: '2026-05-10T00:00:00.000Z',
    dataVencimento: '2026-05-17T00:00:00.000Z',
    valorDocumento: 1500,
    nossoNumero: '1234567',
    agencia: '3978',
    codigoCedente: '6404154',
    carteira: '101',
    localPagamento: 'Local Teste Santander',
    numeroDocumento: '654321',
    cedente: 'Empresa Teste LTDA',
    cedenteCnpj: '91886612000189',
    instrucoesPagamento: 'Instrução Teste',
  },
};

// ─── Caixa ───────────────────────────────────────────────

export const CAIXA_COMPLETO = {
  input: {
    banco: 'caixa' as const,
    dataEmissao: '2026-05-10T00:00:00.000Z',
    dataVencimento: '2026-05-17T00:00:00.000Z',
    valorDocumento: 32112,
    codigoCedente: '005507',
    carteira: '1',
    identificadorEmissao: '4',
    nossoNumero: '222333777777777',
  },
  expected: {
    codigoBanco: '104-0',
    codigoBarras: '10494144900000321120055077222133347777777771',
    linhaDigitavel: '10490.05505 77222.133348 77777.777713 4 14490000032112',
  },
};

export const CAIXA_MASSA_ESPECIFICA = {
  input: {
    banco: 'caixa' as const,
    dataEmissao: '2026-05-12T00:00:00.000Z',
    dataVencimento: '2026-05-17T00:00:00.000Z',
    valorDocumento: 70445,
    nossoNumero: 716978190,
    agencia: 1573,
    codigoCedente: 484900,
    carteira: '14',
  },
  expected: {
    // Calculado de forma independente (script Python do layout SIGCB)
    codigoBanco: '104-0',
    codigoBarras: '10492144900000704454849000000100047169781903',
    linhaDigitavel: '10494.84908 00000.100040 71697.819036 2 14490000070445',
    nossoNumeroDv: 1,
  },
};

export const CAIXA_EXAMPLE = {
  input: {
    banco: 'caixa' as const,
    dataEmissao: '2026-05-10T00:00:00.000Z',
    dataVencimento: '2026-05-17T00:00:00.000Z',
    valorDocumento: 88800,
    nossoNumero: '345678987654321',
    agencia: '1234',
    codigoCedente: '654321',
    carteira: '14',
    localPagamento: 'Local Teste',
    numeroDocumento: 'CX-001',
    cedente: 'Empresa Teste LTDA',
    cedenteCnpj: '54811186000198',
    instrucoesPagamento: 'Instrução Teste',
    identificadorEmissao: '4',
  },
};

// ─── Itaú ────────────────────────────────────────────────

export const ITAU_EXAMPLE = {
  input: {
    banco: 'itau' as const,
    dataEmissao: '2026-05-10T00:00:00.000Z',
    dataVencimento: '2026-05-17T00:00:00.000Z',
    valorDocumento: 83297,
    nossoNumero: '30672934',
    agencia: '3907',
    codigoCedente: '69608',
    carteira: '109',
    localPagamento: 'Local Teste Itaú',
    numeroDocumento: '987654',
    cedente: 'Empresa Teste LTDA',
    cedenteCnpj: '49755276000179',
    instrucoesPagamento: 'Instrução Teste',
  },
};

// ─── Payloads para cenários negativos ────────────────────

export const BANCO_INVALIDO = {
  banco: 'nao-existe' as 'bradesco',
  valorDocumento: 1000,
  nossoNumero: '12345',
};

export const DATA_INVALIDA_STRING = {
  banco: 'bradesco' as const,
  dataVencimento: 'data-invalida-xyz',
  valorDocumento: 1000,
  nossoNumero: '12345678901',
  agencia: '1234',
  codigoCedente: '1234567',
  carteira: '25',
};

// ─── Payloads JSON (via stdin) ───────────────────────────

export const PAYLOAD_STDIN = {
  banco: 'bradesco' as const,
  dataEmissao: '11/05/2026',
  dataVencimento: '15/05/2026',
  valorDocumento: 99900,
  nossoNumero: '12345678901',
  numeroDocumento: '8888888',
  cedente: 'Empresa Teste LTDA',
  cedenteCnpj: '18727053000174',
  agencia: '1229',
  codigoCedente: '0000469',
  carteira: '25',
  instrucoesPagamento: 'teste',
};

// ─── Bancos disponíveis (para iteração em testes) ────────

export const BANCOS_DISPONIVEIS = ['bradesco', 'santander', 'caixa', 'itau'] as const;

// ─── Códigos bancários esperados ─────────────────────────

export const CODIGOS_BANCO: Record<string, string> = {
  bradesco: '237-2',
  santander: '033-7',
  caixa: '104-0',
  itau: '341-7',
};
