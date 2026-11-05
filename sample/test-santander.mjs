/**
 * Uso: pnpm build && node sample/test-santander.mjs
 */
import { gerarBoleto } from '../dist/index.js';

const vencimento = new Date();
vencimento.setUTCDate(vencimento.getUTCDate() + 7);

console.log(
  JSON.stringify(
    gerarBoleto({
      banco: 'santander',
      dataEmissao: new Date(),
      dataVencimento: vencimento,
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
    }),
    null,
    2,
  ),
);
