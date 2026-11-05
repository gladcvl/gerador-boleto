/** IDs dos bancos com implementação emissor disponível */
export type BankId =
  | 'bradesco'
  | 'santander'
  | 'caixa'
  | 'itau'
  | 'bb'
  | 'sicredi'
  | 'sicoob'
  | 'safra';

export interface Endereco {
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  /** Sigla com 2 letras */
  uf?: string;
  /** 8 dígitos, com ou sem traço */
  cep?: string;
}

/** Pessoa física ou jurídica (beneficiário, pagador ou sacador/avalista). */
export interface Pessoa {
  nome: string;
  /** CPF (11 dígitos) ou CNPJ (14 dígitos), com ou sem pontuação */
  documento?: string;
  endereco?: Endereco;
}

/** Payload mínimo compartilhado + campos específicos por banco */
export interface BoletoInputBase {
  banco: BankId;
  dataEmissao?: Date | string;
  dataVencimento?: Date | string;
  /** Data de processamento exibida no PDF (padrão: data de emissão) */
  dataProcessamento?: Date | string;
  /** Valor em CENTAVOS (inteiro). Ex.: 15000 = R$ 150,00 */
  valorDocumento: number | string;
  /** Nosso número sem DV */
  nossoNumero: number | string;
  /** Agência sem DV */
  agencia: number | string;
  agenciaDv?: string;
  /**
   * Bradesco/Itaú: conta corrente (sem DV).
   * Santander: código do beneficiário. Caixa: código do beneficiário (6 dígitos).
   */
  codigoCedente: number | string;
  contaDv?: string;
  carteira: number | string;

  /** Número do documento (seu número / número da fatura) */
  numeroDocumento?: string;
  /** Sigla da espécie: DM, DS, NP, RC, ... (padrão DM) */
  especieDocumento?: string;
  /** 'S' ou 'N' (padrão N) */
  aceite?: 'S' | 'N';

  beneficiario?: Pessoa;
  pagador?: Pessoa;
  sacadorAvalista?: Pessoa;

  localPagamento?: string;
  instrucoesPagamento?: string;
  /** Linhas de instrução exibidas no PDF (tem precedência sobre instrucoesPagamento) */
  instrucoes?: string[];
  /** Texto livre do recibo do pagador */
  demonstrativo?: string[];

  /** Caixa: identificador de emissão (padrão '4' = beneficiário) */
  identificadorEmissao?: string;
  /** Banco do Brasil: número do convênio (4, 6 ou 7 dígitos) */
  convenio?: number | string;
  /** Sicredi: posto da cooperativa (2 dígitos) */
  posto?: number | string;
  /** Sicoob: modalidade de cobrança (padrão '01') */
  modalidade?: string;
  /** Sicoob: número da parcela (padrão '001') */
  parcela?: string;

  /** @deprecated use `beneficiario.nome` */
  cedente?: string;
  /** @deprecated use `beneficiario.documento` */
  cedenteCnpj?: string;

  [key: string]: unknown;
}

export type BoletoInput = BoletoInputBase;

/** Instância mutável usada nos cálculos (datas como Date no objeto vivo) */
export type BoletoRuntime = BoletoInputBase & {
  dataEmissao: Date;
  dataVencimento: Date;
};

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/** Saída JSON-serializável (datas em ISO 8601) */
export interface BoletoJsonOutput {
  codigoBarras: string;
  linhaDigitavel: string;
  banco: BankId;
  /** Ex.: '237-2' */
  codigoBanco: string;
  dataEmissao: string;
  dataVencimento: string;
  valorDocumento: number | string;
  nossoNumero: number | string;
  /** DV do nosso número conforme a regra do banco (Bradesco pode retornar 'P') */
  nossoNumeroDv: number | string;
  /** Nosso número como impresso no boleto, ex.: '09/00000000002-8' */
  nossoNumeroFormatado: string;
  /** Campo "Agência / Código do Beneficiário" como impresso no boleto */
  agenciaCodigoBeneficiario: string;
  agencia: number | string;
  codigoCedente: number | string;
  carteira: number | string;
  [key: string]: JsonValue | undefined;
}

export interface BankOptions {
  codigo: string;
  /** DV oficial do código do banco (ex.: '2' em 237-2; Sicredi usa 'X') */
  digito: string;
  /** Nome para impressão no boleto */
  nome: string;
}

export interface BankModule {
  options: BankOptions;
  codBarras: (boleto: BoletoRuntime) => string;
  linhaDigitavel: (codBarras: string) => string;
  /** DV do nosso número conforme a regra do banco */
  nossoNumeroDv: (boleto: BoletoRuntime) => number | string;
  /** Nosso número formatado para impressão */
  nossoNumeroFormatado: (boleto: BoletoRuntime) => string;
  /** Campo "Agência / Código do Beneficiário" formatado para impressão */
  agenciaCodigoBeneficiario: (boleto: BoletoRuntime) => string;
}
