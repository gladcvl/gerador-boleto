/**
 * Arquivos CNAB 240 de cobrança: remessa (registro de títulos) e retorno
 * (confirmações, liquidações, baixas).
 *
 * Bancos: Bradesco (237), Itaú (341), Santander (033) e Caixa SIGCB (104).
 *
 * ATENÇÃO: todo banco exige homologação do arquivo (envio de remessa-teste)
 * antes do uso em produção, e os manuais variam por versão de convênio.
 * Os layouts são declarativos (`BANCOS_240`) para facilitar ajustes.
 *
 * @example
 * import { criarBoleto } from '@box4dev/gerador-boleto';
 * import { gerarRemessaCnab240, lerRetornoCnab240 } from '@box4dev/gerador-boleto/cnab';
 *
 * const remessa = gerarRemessaCnab240({
 *   banco: 'itau',
 *   sequencial: 1,
 *   beneficiario: { nome: 'Empresa LTDA', documento: '11222333000181', agencia: '3907', conta: '69608', contaDv: '1' },
 *   titulos: [{ boleto: criarBoleto({ ... }), multa: { percentual: 2 }, juros: { taxaMensal: 1 } }],
 * });
 * fs.writeFileSync('REMESSA.REM', remessa, 'latin1');
 *
 * const retorno = lerRetornoCnab240(fs.readFileSync('RETORNO.RET'));
 * for (const t of retorno.titulos) if (t.liquidado) baixar(t.nossoNumero, t.valorPago);
 */
export type { Banco240, BeneficiarioCnab } from './bancos.js';
export { BANCOS_240 } from './bancos.js';
export type { Layout240 } from './febraban240.js';
export { ESPECIES_FEBRABAN, FEBRABAN_240 } from './febraban240.js';
export type { Campo, Layout, TipoCampo } from './layout.js';
export { CnabError, escrever, ler, validarLayout } from './layout.js';
export type { MovimentoRemessa } from './ocorrencias.js';
export { MOVIMENTOS_REMESSA, MOVIMENTOS_RETORNO } from './ocorrencias.js';
export type { Desconto, Juros, Multa, OpcoesRemessa, TituloRemessa } from './remessa.js';
export { gerarRemessaCnab240 } from './remessa.js';
export type { RetornoCnab240, TituloRetorno } from './retorno.js';
export { lerRetornoCnab240 } from './retorno.js';
