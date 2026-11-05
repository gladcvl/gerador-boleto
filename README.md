# @box4dev/gerador-boleto

<p align="center">
  <img src="https://raw.githubusercontent.com/box4dev/gerador-boleto/main/logo.png" alt="Gerador-Boleto Logo" width="200" />
</p>

<p align="center">
  <b>Boletos no padrão FEBRABAN: linha digitável, código de barras, PDF e arquivos CNAB 240 de remessa e retorno.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/npm/v/@box4dev/gerador-boleto?style=flat-square" alt="npm version" />
  <img src="https://img.shields.io/npm/l/@box4dev/gerador-boleto?style=flat-square" alt="license" />
  <img src="https://img.shields.io/github/actions/workflow/status/box4dev/gerador-boleto/ci.yml?style=flat-square" alt="build status" />
</p>

- **Pacote npm:** [@box4dev/gerador-boleto](https://www.npmjs.com/package/@box4dev/gerador-boleto)
- **Código-fonte:** [github.com/box4dev/gerador-boleto](https://github.com/box4dev/gerador-boleto)
- **Inspirado em:** [node-boleto](https://npmjs.com/package/node-boleto)

| Módulo                            | O que faz                                                     | Dependências                 |
| --------------------------------- | ------------------------------------------------------------- | ---------------------------- |
| `@box4dev/gerador-boleto`         | Linha digitável, código de barras, nosso número (JSON)        | nenhuma                      |
| `@box4dev/gerador-boleto/pdf`     | Boleto em PDF (recibo do pagador + ficha de compensação)      | `pdfkit` (peer, opcional)    |
| `@box4dev/gerador-boleto/cnab`    | Remessa e retorno CNAB 240 de cobrança                        | nenhuma                      |

## Bancos

| `banco`     | Banco                    | Código de barras / PDF | CNAB 240 |
| ----------- | ------------------------ | :--------------------: | :------: |
| `bradesco`  | Bradesco (237)           |           ✅            |    ✅     |
| `itau`      | Itaú (341)               |           ✅            |    ✅     |
| `santander` | Santander (033)          |           ✅            |    ✅     |
| `caixa`     | Caixa SIGCB (104)        |           ✅            |    ✅     |
| `bb`        | Banco do Brasil (001)    |           ✅            |    ✅     |
| `sicredi`   | Sicredi (748)            |           ✅            |    ✅     |
| `sicoob`    | Sicoob (756)             |           ✅            |    ✅     |
| `safra`     | Safra (422)              |          ✅ ¹           |    —  ²  |

Também são aceitos nomes e códigos alternativos: `'Banco do Brasil'`, `'001'`, `'Itaú'`, `'cef'`, `'756'` etc.

¹ DV do nosso número do Safra ainda pendente de confirmação com boleto real.
² O layout CNAB 240 do Safra não está implementado (a cobrança Safra costuma usar CNAB 400); a função retorna erro explícito.

> [!IMPORTANT]
> **Homologação.** Todo banco exige homologar o convênio (envio de boleto e remessa-teste) antes de aceitar em produção, e os manuais variam por versão de convênio. Os layouts seguem o padrão FEBRABAN e as particularidades publicadas de cada banco, e são verificados por testes, mas **valide com o seu banco antes de emitir boletos reais**. Os layouts CNAB são declarativos (`BANCOS_240`): ajustar uma posição é uma alteração de uma linha.
>
> PagBank não é suportado: o boleto PagBank é emitido pela API deles, não calculado localmente.

## Requisitos

- Node.js **18** ou superior

## Instalação

```bash
npm install @box4dev/gerador-boleto
# para PDF:
npm install pdfkit
```

## Uso

### Boleto real: `criarBoleto` (modo estrito)

Use em produção. Nunca preenche nada aleatoriamente: campo faltando ou inválido lança `BoletoValidationError`, sem truncar nem "corrigir" dados bancários.

```typescript
import { criarBoleto, BoletoValidationError } from '@box4dev/gerador-boleto';

const boleto = criarBoleto({
  banco: 'itau',
  dataEmissao: '05/11/2026',
  dataVencimento: '20/11/2026',   // 'DD/MM/AAAA', 'AAAA-MM-DD' ou Date
  valorDocumento: 15000,          // SEMPRE em centavos: R$ 150,00
  nossoNumero: '12345678',        // sem DV
  agencia: '3907',                // sem DV
  codigoCedente: '69608',         // conta (Bradesco/Itaú/BB/Safra) ou código do beneficiário
  carteira: '109',
  numeroDocumento: 'NF-1020',
  beneficiario: {
    nome: 'Empresa Exemplo LTDA',
    documento: '11.222.333/0001-81',
    endereco: { logradouro: 'Av. Paulista', numero: '1000', cidade: 'São Paulo', uf: 'SP', cep: '01310-100' },
  },
  pagador: {
    nome: 'João da Silva',
    documento: '529.982.247-25',
    endereco: { logradouro: 'Rua das Flores', numero: '25', bairro: 'Centro', cidade: 'Campinas', uf: 'SP', cep: '13010-000' },
  },
  instrucoes: ['Após o vencimento cobrar multa de 2% e juros de 1% ao mês.'],
});

boleto.linhaDigitavel;            // '34191.09123 34567.853907 76960.860005 1 16360000015000'
boleto.codigoBarras;              // 44 dígitos
boleto.nossoNumeroFormatado;      // '109/12345678-5'
boleto.agenciaCodigoBeneficiario; // '3907 / 69608-6'
```

#### Campos por banco

| Banco     | Obrigatórios (além de valor, vencimento e nosso número) | Observações                                                                     |
| --------- | ------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Bradesco  | `agencia` (4), `codigoCedente` = conta (7), `carteira` (2) | DV do NN pode ser `'P'`                                                      |
| Itaú      | `agencia` (4), `codigoCedente` = conta (5), `carteira` (3) | carteiras de layout especial (106, 107, 122, 142, 143, 195, 196, 198) são rejeitadas |
| Santander | `codigoCedente` = código do beneficiário (7), `carteira` (3) | NN com até 12 dígitos                                                     |
| Caixa     | `codigoCedente` = código do beneficiário (6)            | `carteira` `'14'` (padrão) ou `'24'`; NN com até 15 dígitos (ou 17 com prefixo coerente) |
| BB        | `convenio` (4, 6 ou 7), `carteira` (2)                  | convênio 4/6: também `agencia` e `codigoCedente` = conta (8); NN: 10 (conv. 7), 5 (conv. 6, ou 17 nas carteiras 16/18), 7 (conv. 4) |
| Sicredi   | `agencia` = cooperativa (4), `posto` (2), `codigoCedente` (5) | NN 8 dígitos: ano (2) + byte 2–9 (1) + sequencial (5)                   |
| Sicoob    | `agencia` = cooperativa (4), `codigoCedente` = cliente (7) | NN 7 dígitos; `modalidade` (padrão `'01'`), `parcela` (padrão `'001'`)       |
| Safra     | `agencia` (5, com DV), `codigoCedente` = conta (9, com DV) | NN 8 dígitos                                                                 |

### Massa de testes: `gerarBoleto`

Preenche aleatoriamente (com dados válidos e coerentes) tudo que não for informado.

```javascript
import { gerarBoleto } from '@box4dev/gerador-boleto';

gerarBoleto();                          // banco e dados aleatórios
gerarBoleto({ banco: 'sicredi' });      // só o banco fixo
gerarBoleto({ banco: 'bb', valorDocumento: 99900 });
```

### PDF

```javascript
import { writeFile } from 'node:fs/promises';
import { gerarBoletoPdf } from '@box4dev/gerador-boleto/pdf';

const pdf = await gerarBoletoPdf([boleto1, boleto2]); // um boleto por página (A4)
await writeFile('boletos.pdf', pdf);

// opções: { recibo: false } remove o recibo do pagador; { dataCriacao } torna o PDF reprodutível
```

O código de barras é Interleaved 2 of 5 com as medidas FEBRABAN (barra estreita 0,254 mm, ~103 mm × 13 mm) e é verificado nos testes por um decodificador independente.

### CNAB 240: remessa

```javascript
import { writeFileSync } from 'node:fs';
import { gerarRemessaCnab240 } from '@box4dev/gerador-boleto/cnab';

const remessa = gerarRemessaCnab240({
  banco: 'itau',
  sequencial: 1, // NSA: incremente a cada arquivo enviado
  beneficiario: { nome: 'Empresa Exemplo LTDA', documento: '11222333000181', agencia: '3907', conta: '69608', contaDv: '6' },
  titulos: [
    {
      boleto,                               // retorno de criarBoleto (pagador com endereço completo)
      multa: { percentual: 2 },             // ou { valor: centavos, data }
      juros: { taxaMensal: 1 },             // ou { valorDia: centavos } / { isento: true }
      desconto: { valor: 500, ate: '15/11/2026' },
      protestoDias: 5,
      baixaDias: 30,
      // movimento: 'baixa' | 'alterarVencimento' | ... (padrão 'entrada')
    },
  ],
});
writeFileSync('REMESSA.REM', remessa, 'latin1'); // ASCII, linhas de 240 posições, CRLF
```

Dados de conta específicos em `beneficiario`:

| Banco     | Campos                                                                    |
| --------- | ------------------------------------------------------------------------- |
| Bradesco  | `conta`, `convenio` (código da empresa no banco)                          |
| Itaú      | `conta`                                                                   |
| Santander | `conta`, `convenio` (código de transmissão), `codigoBeneficiario`        |
| Caixa     | `codigoBeneficiario`; `teste: true` marca o arquivo como `REMESSA-TESTE` |
| BB        | `conta`, `convenio`, `carteira`, `variacaoCarteira`                       |
| Sicoob    | `conta`, `codigoBeneficiario` (código do cliente)                         |
| Sicredi   | `conta`, `codigoBeneficiario`                                             |

A remessa confere se cada boleto pertence à conta do beneficiário e recusa valores que não cabem nos campos.

### CNAB 240: retorno

```javascript
import { readFileSync } from 'node:fs';
import { lerRetornoCnab240 } from '@box4dev/gerador-boleto/cnab';

const retorno = lerRetornoCnab240(readFileSync('RETORNO.RET')); // banco detectado pelo header
for (const t of retorno.titulos) {
  if (t.liquidado) baixarNoSistema(t.nossoNumero, t.valorPago, t.dataCredito);
  if (t.rejeitado) console.warn(t.nossoNumero, t.descricaoMovimento, t.motivos);
}
```

Valores vêm em centavos e datas em ISO (`AAAA-MM-DD`). O leitor valida o tamanho das linhas e as quantidades dos trailers, então detecta arquivos truncados.

## Segurança

O input pode vir de fontes não confiáveis (por exemplo, `JSON.parse` de uma API): chaves como `__proto__`, `constructor` e campos internos são descartados, e nomes de banco são resolvidos sem consultar o protótipo. Para reportar vulnerabilidades, consulte a [Política de Segurança](https://github.com/box4dev/gerador-boleto?tab=security-ov-file#readme).

## Desenvolvimento

```bash
corepack pnpm install
corepack pnpm test          # testes + cobertura
corepack pnpm run typecheck
corepack pnpm run biome:ci
corepack pnpm run sample:pdf   # sample/saida/boletos.pdf
corepack pnpm run sample:cnab  # sample/saida/REMESSA-*.REM
```

## Contribuição

Contribuições são muito bem-vindas! Abra Issues para bugs ou sugestões. Veja o [Guia de Contribuição](https://github.com/box4dev/gerador-boleto?tab=contributing-ov-file#readme).

Boletos reais (já pagos ou vencidos) com agência, conta e nosso número são a melhor forma de validar os layouts dos bancos: abra uma Issue com esses dados (sem informações pessoais do pagador).

## Licença

Distribuído sob a licença MIT. Veja [Licença](https://github.com/box4dev/gerador-boleto?tab=MIT-1-ov-file#readme).

<p align="center">
  Feito com ❤️ por <a href="https://box4.dev">box4.dev</a>
</p>
