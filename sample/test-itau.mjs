/**
 * Uso: pnpm build && node sample/test-santander.mjs
 */
import { gerarBoleto } from '../dist/index.js';

const vencimento = new Date();
vencimento.setUTCDate(vencimento.getUTCDate() + 7);

console.log(
  JSON.stringify(
    gerarBoleto({
      banco: 'itau',
      dataEmissao: new Date(),
      dataVencimento: vencimento,
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
    }),
    null,
    2,
  ),
);
