/**
 * JSON → JSON via stdin.
 * Uso: pnpm build && node sample/stdin-json.mjs < entrada.json
 */
import { gerarBoleto } from '../dist/index.js';

const chunks = [];
process.stdin.on('data', (d) => chunks.push(d));
process.stdin.on('end', () => {
  const raw = Buffer.concat(chunks).toString('utf8');
  const entrada = JSON.parse(raw);
  process.stdout.write(`${JSON.stringify(gerarBoleto(entrada), null, 2)}\n`);
});
