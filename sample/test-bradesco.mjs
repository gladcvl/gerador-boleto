/**
 * Uso: pnpm build && node sample/test-bradesco.mjs
 */
import { gerarBoleto } from '../dist/index.js';

const vencimento = new Date();
vencimento.setUTCDate(vencimento.getUTCDate() + 7);

console.log(
  JSON.stringify(
    gerarBoleto({
      banco: 'bradesco',
      dataEmissao: new Date(),
      dataVencimento: vencimento,
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
    }),
    null,
    2,
  ),
);
