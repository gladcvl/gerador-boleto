/**
 * Uso: pnpm build && node sample/test-caixa.mjs
 */
import { gerarBoleto } from '../dist/index.js';

const vencimento = new Date();
vencimento.setUTCDate(vencimento.getUTCDate() + 7);

console.log(
  JSON.stringify(
    gerarBoleto({
      banco: 'caixa',
      dataEmissao: new Date(),
      dataVencimento: vencimento,
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
      identificadorEmissao: '4'
    }),
    null,
    2,
  ),
);
