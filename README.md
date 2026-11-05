# @box4dev/gerador-boleto

<p align="center">
  <img src="https://raw.githubusercontent.com/box4dev/gerador-boleto/main/logo.png" alt="Gerador-Boleto Logo" width="200" />
</p>

<p align="center">
  <b>Gerador de Boleto no padrão FEBRABAN: Linha Digitável e Código de Barras.<br>
  Sem HTML, PDF ou renderização gráfica — apenas dados prontos para JSON.</b>
</p>

<p align="center">Ideal para geração de massa para testes automatizados.</p>

<p align="center">
  <img src="https://img.shields.io/npm/v/@box4dev/gerador-boleto?style=flat-square" alt="npm version" />
  <img src="https://img.shields.io/npm/l/@box4dev/gerador-boleto?style=flat-square" alt="license" />
  <img src="https://img.shields.io/github/actions/workflow/status/box4dev/gerador-boleto/ci.yml?style=flat-square" alt="build status" />
</p>

- **Pacote npm:** [@box4dev/gerador-boleto](https://www.npmjs.com/package/@box4dev/gerador-boleto)
- **Código-fonte:** [github.com/box4dev/gerador-boleto](https://github.com/box4dev/gerador-boleto)
- **Inspirado em:** [node-boleto](https://npmjs.com/package/node-boleto)


## Características
Gera linha digitável e código de barras (44 dígitos) para os bancos:

| Valor       | Descrição         |
| ----------- | ----------------- |
| `bradesco`  | Bradesco (237)    |
| `caixa`     | Caixa SIGCB (104) |
| `itau`      | Itaú (341)        |
| `santander` | Santander (033)   |

## Requisitos

- Node.js **18** ou superior

## Instalação

```bash
npm install @box4dev/gerador-boleto
# ou
pnpm add @box4dev/gerador-boleto
```

## Importação

### ESM

```typescript
import { gerarBoleto } from '@box4dev/gerador-boleto'
```

### CommonJS

```javascript
const { gerarBoleto } = require('@box4dev/gerador-boleto')
```

## Exemplos de uso

Todos os campos são opcionais. 
Caso não sejam informados, o banco e os valores de entrada serão escolhidos aleatoriamente


### Sem imformar parâmetros

```javascript
const dados = gerarBoleto();

console.log(dados.codigoBarras);
// '03396145000000996689025708991834007174230101'

console.log(dados.linhaDigitavel);
// '03399.02579 08991.834006 71742.301014 6 14500000099668'

console.log(dados);
/* 
{
  codigoBarras: '03396145000000996689025708991834007174230101',
  linhaDigitavel: '03399.02579 08991.834006 71742.301014 6 14500000099668',
  banco: 'santander',
  codigoBanco: '033-7',
  dataEmissao: '2026-05-13T00:00:00.000Z',
  dataVencimento: '2026-05-18T00:00:00.000Z',
  valorDocumento: 99668,
  nossoNumero: 918340071742,
  nossoNumeroDv: 3,
  agencia: 1674,
  codigoCedente: 257089,
  carteira: '101',
  localPagamento: 'Até o vencimento, preferencialmente no Banco Santander',
  instrucoesPagamento: 'Sr. Caixa, cobrar multa de 2% após o vencimento. Receber até 10 dias após o vencimento.'
} */
```

### Informando apenas o banco

```javascript
console.log( gerarBoleto({ banco: 'bradesco' }) );

console.log( gerarBoleto({ banco: 'caixa' }) );

console.log( gerarBoleto({ banco: 'itau' }) );

console.log( gerarBoleto({ banco: 'santander' }) );
``` 


### Informando parâmetros úteis para a lógica de boletos

```javascript
console.log( 
  gerarBoleto({
    banco: 'bradesco',
    valorDocumento: 15990,
    nossoNumero: '12345678901',
    agencia: '1229',
    codigoCedente: '0000469',
    carteira: '9',
  })
);
```

### Informando parâmetros opcionais (qualquer coisa informada será apresentada após a execução)

```javascript
console.log(
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
    numeroDocumento: '999888',
    cedente: 'Empresa Teste LTDA',
    cedenteCnpj: '54811186000198',
    instrucoesPagamento: 'Instrução Teste',
    identificadorEmissao: '4'
    // qualquer outra informação que desejar adicionar ao objeto será apresentada após a execução
  })
);
```

## Bancos suportados (`banco`)

| Valor       | Descrição         |
| ----------- | ----------------- |
| `santander` | Santander (033)   |
| `bradesco`  | Bradesco (237)    |
| `caixa`     | Caixa SIGCB (104) |
| `itau`      | Itaú (341)        |

## Contribuição

Contribuições são muito bem-vindas! Sinta-se à vontade para abrir Issues para reportar bugs ou sugerir novas funcionalidades. Para mais detalhes, veja nosso [Guia de Contribuição](https://github.com/box4dev/gerador-boleto?tab=contributing-ov-file#readme).

## Licença

Distribuído sob a licença MIT. Veja [Licença](https://github.com/box4dev/gerador-boleto?tab=MIT-1-ov-file#readme) para mais informações.

## Segurança

Para reportar vulnerabilidades de segurança, consulte nossa [Política de Segurança](https://github.com/box4dev/gerador-boleto?tab=security-ov-file#readme).

<p align="center">
  Feito com ❤️ por <a href="https://box4.dev">box4.dev</a>
</p>
