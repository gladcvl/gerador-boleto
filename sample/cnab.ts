/**
 * Gera arquivos de remessa CNAB 240 de exemplo (um por banco).
 * Uso: pnpm sample:cnab  → sample/saida/REMESSA-<banco>.REM
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { type BeneficiarioCnab, gerarRemessaCnab240 } from '../src/cnab/index.js';
import { type BankId, type BoletoInput, criarBoleto } from '../src/index.js';

const empresa = {
  nome: 'Empresa Exemplo Comércio de Peças LTDA',
  documento: '11222333000181',
};

const pagadores = [
  {
    nome: 'João da Silva Sauro',
    documento: '52998224725',
    endereco: { logradouro: 'Rua das Flores', numero: '25', bairro: 'Centro', cidade: 'Campinas', uf: 'SP', cep: '13010000' },
  },
  {
    nome: 'Padaria Pão Quente ME',
    documento: '45723174000110',
    endereco: { logradouro: 'Av. Brasil', numero: '900', bairro: 'Jardim América', cidade: 'Rio de Janeiro', uf: 'RJ', cep: '21040360' },
  },
];

const contas: Record<BankId, { beneficiario: BeneficiarioCnab; boleto: Partial<BoletoInput>; nn: (i: number) => string }> = {
  bradesco: {
    beneficiario: { ...empresa, agencia: '1229', agenciaDv: '1', conta: '0000469', contaDv: '6', convenio: '1234567' },
    boleto: { agencia: '1229', codigoCedente: '0000469', carteira: '09' },
    nn: (i) => String(100 + i),
  },
  itau: {
    beneficiario: { ...empresa, agencia: '3907', conta: '69608', contaDv: '6' },
    boleto: { agencia: '3907', codigoCedente: '69608', carteira: '109' },
    nn: (i) => String(200 + i),
  },
  santander: {
    beneficiario: { ...empresa, agencia: '3978', conta: '13000123', contaDv: '4', convenio: '397800006404154', codigoBeneficiario: '6404154' },
    boleto: { agencia: '3978', codigoCedente: '6404154', carteira: '101' },
    nn: (i) => String(300 + i),
  },
  caixa: {
    beneficiario: { ...empresa, agencia: '1234', agenciaDv: '5', codigoBeneficiario: '654321' },
    boleto: { agencia: '1234', codigoCedente: '654321', carteira: '14' },
    nn: (i) => String(400 + i),
  },
};

mkdirSync(new URL('./saida/', import.meta.url), { recursive: true });
for (const [banco, c] of Object.entries(contas) as [BankId, (typeof contas)[BankId]][]) {
  const titulos = pagadores.map((pagador, i) => ({
    boleto: criarBoleto({
      ...c.boleto,
      banco,
      dataEmissao: '05/11/2026',
      dataVencimento: '20/11/2026',
      valorDocumento: 15_000 + i * 2_500,
      nossoNumero: c.nn(i),
      numeroDocumento: `NF-${1000 + i}`,
      pagador,
    } as BoletoInput),
    multa: { percentual: 2 },
    juros: { taxaMensal: 1 },
    protestoDias: i === 1 ? 5 : undefined,
  }));
  const remessa = gerarRemessaCnab240({
    banco,
    sequencial: 1,
    beneficiario: c.beneficiario,
    titulos,
    dataGeracao: new Date('2026-11-05T12:00:00-03:00'),
    teste: true,
  });
  writeFileSync(new URL(`./saida/REMESSA-${banco}.REM`, import.meta.url), remessa, 'latin1');
  console.log(`sample/saida/REMESSA-${banco}.REM: ${remessa.split('\r\n').length - 1} linhas`);
}
