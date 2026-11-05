import { getBank } from './bank/registry.js';
import type { BankModule, BoletoRuntime } from './types.js';
import { copiaSegura } from './util/sanitize.js';

/**
 * Campos calculados pela biblioteca. Se vierem no input (ex.: reprocessando
 * um JSON gerado antes), são ignorados e recalculados.
 */
const CAMPOS_CALCULADOS = new Set([
  'bank',
  'codigoBarras',
  'linhaDigitavel',
  'codigoBanco',
  'nossoNumeroDv',
  'nossoNumeroFormatado',
  'agenciaCodigoBeneficiario',
  '_calculate',
]);

export class Boleto {
  bank: BankModule;

  codigoBarras!: string;
  linhaDigitavel!: string;

  banco!: BoletoRuntime['banco'];
  codigoBanco!: string;
  dataEmissao!: Date;
  dataVencimento!: Date;
  valorDocumento!: BoletoRuntime['valorDocumento'];
  nossoNumero!: BoletoRuntime['nossoNumero'];
  nossoNumeroDv!: number | string;
  nossoNumeroFormatado!: string;
  agenciaCodigoBeneficiario!: string;
  agencia!: BoletoRuntime['agencia'];
  codigoCedente!: BoletoRuntime['codigoCedente'];
  carteira!: BoletoRuntime['carteira'];

  // Permite que campos extras (instrucoesPagamento, localPagamento, etc)
  // existam na raiz da instância para serialização automática.
  [key: string]: unknown;

  constructor(input: BoletoRuntime) {
    const bank = getBank(input?.banco);
    if (!bank) {
      throw new Error('Banco inválido.');
    }

    /**
     * Copia apenas dados: descarta __proto__/constructor/prototype e campos
     * calculados, para que um input malicioso não troque o módulo do banco
     * nem o protótipo da instância.
     */
    Object.assign(this, copiaSegura(input, CAMPOS_CALCULADOS));
    this.bank = bank;

    this._calculate();
  }

  private _calculate(): void {
    const runtime = this as unknown as BoletoRuntime;
    const { codigo, digito } = this.bank.options;
    this.codigoBanco = `${codigo}-${digito}`;

    this.codigoBarras = this.bank.codBarras(runtime);
    this.linhaDigitavel = this.bank.linhaDigitavel(this.codigoBarras);
    this.nossoNumeroDv = this.bank.nossoNumeroDv(runtime);
    this.nossoNumeroFormatado = this.bank.nossoNumeroFormatado(runtime);
    this.agenciaCodigoBeneficiario = this.bank.agenciaCodigoBeneficiario(runtime);
  }
}
