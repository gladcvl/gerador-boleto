/**
 * Gera boletos de exemplo em PDF (um de cada banco).
 * Uso: pnpm sample:pdf  → sample/saida/boletos.pdf
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { criarBoleto } from '../src/index.js';
import { gerarBoletoPdf } from '../src/pdf/index.js';

const comum = {
  dataEmissao: '05/11/2026',
  dataVencimento: '20/11/2026',
  valorDocumento: 152_990,
  numeroDocumento: 'NF-2026-0042',
  beneficiario: {
    nome: 'Empresa Exemplo Comércio de Peças LTDA',
    documento: '11222333000181',
    endereco: { logradouro: 'Av. Paulista', numero: '1000', bairro: 'Bela Vista', cidade: 'São Paulo', uf: 'SP', cep: '01310100' },
  },
  pagador: {
    nome: 'João da Silva Sauro',
    documento: '52998224725',
    endereco: { logradouro: 'Rua das Flores', numero: '25', complemento: 'Apto 31', bairro: 'Centro', cidade: 'Campinas', uf: 'SP', cep: '13010000' },
  },
  instrucoes: [
    'Após o vencimento cobrar multa de 2,00% e juros de 1,00% ao mês.',
    'Não receber após 30 dias do vencimento.',
    'Referente à NF-2026-0042.',
  ],
  demonstrativo: ['Pedido 98765 - 3 itens', 'Dúvidas: financeiro@exemplo.com.br'],
};

const boletos = [
  criarBoleto({ ...comum, banco: 'bradesco', agencia: '1229', agenciaDv: '1', codigoCedente: '0000469', contaDv: '6', carteira: '09', nossoNumero: '12345678901' }),
  criarBoleto({ ...comum, banco: 'itau', agencia: '3907', codigoCedente: '69608', carteira: '109', nossoNumero: '30672934' }),
  criarBoleto({ ...comum, banco: 'santander', agencia: '3978', codigoCedente: '6404154', carteira: '101', nossoNumero: '1234567' }),
  criarBoleto({ ...comum, banco: 'caixa', agencia: '1234', codigoCedente: '654321', carteira: '14', nossoNumero: '1001' }),
];

mkdirSync(new URL('./saida/', import.meta.url), { recursive: true });
const pdf = await gerarBoletoPdf(boletos);
writeFileSync(new URL("./saida/codigos.json", import.meta.url), JSON.stringify(boletos.map((b) => b.codigoBarras)));
writeFileSync(new URL('./saida/boletos.pdf', import.meta.url), pdf);
console.log(`sample/saida/boletos.pdf (${pdf.length} bytes, ${boletos.length} páginas)`);
