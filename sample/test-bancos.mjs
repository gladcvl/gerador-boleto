/**
 * Uso: pnpm build && node sample/test-bradesco.mjs
 */
import { gerarBoleto } from '../dist/index.js';

console.log(JSON.stringify(gerarBoleto({banco: 'bradesco'}), null, 2));
console.log(JSON.stringify(gerarBoleto({banco: 'caixa'}), null, 2));
console.log(JSON.stringify(gerarBoleto({banco: 'itau'}), null, 2));
console.log(JSON.stringify(gerarBoleto({banco: 'santander'}), null, 2));

