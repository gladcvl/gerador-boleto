# Histórico de Alterações (Changelog)

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado no [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/spec/v2.0.0.html).


## [Não lançado]

### Adicionado
- **PDF** (`@box4dev/gerador-boleto/pdf`): recibo do pagador + ficha de compensação, código de barras Interleaved 2 of 5 próprio. `pdfkit` como peer dependency opcional.
- **CNAB 240** (`@box4dev/gerador-boleto/cnab`): remessa (segmentos P, Q, R) e retorno (T, U) para Bradesco, Itaú, Santander, Caixa, Banco do Brasil, Sicoob e Sicredi.
- **Novos bancos**: Banco do Brasil (001), Sicredi (748), Sicoob (756) e Safra (422).
- `criarBoleto()`: modo estrito para produção (nunca preenche dados aleatórios).
- `BoletoValidationError`, `nossoNumeroFormatado`, `agenciaCodigoBeneficiario`, tipos `Pessoa`/`Endereco`.
- Aliases de banco (`'Banco do Brasil'`, `'001'`, `'Itaú'`, `'cef'`...).

### Corrigido
- `valorDocumento` decimal ou formatado gerava código de barras com `NaN`.
- Campos eram truncados em silêncio (conta Itaú, código Caixa) ou estouravam as 44 posições (nosso número Santander).
- Caixa: carteiras `02`/`01`/`82` e nosso número aleatório de 17 dígitos geravam constante inválida no campo livre; nosso número perdia precisão acima de `MAX_SAFE_INTEGER`.
- `nossoNumeroDv` usava módulo 11 genérico: errado para Bradesco, Itaú e Caixa.
- Datas `DD/MM/AAAA` (documentadas) eram rejeitadas; `31/02` "rolava" para março; `new Date()` após 21h de Brasília virava o dia seguinte.
- Segurança: banco `'toString'`/`'__proto__'` passava na validação; chaves `bank`, `_calculate` e `__proto__` no input sobrescreviam o módulo do banco ou o protótipo da instância.
- Lockfile quebrava no Windows (CRLF): adicionado `.gitattributes`.
- Scripts `sample:*` apontavam para a pasta errada.
- Ferramentas de desenvolvimento: pnpm 11.28.9, tsup 9, esbuild ≥ 0.28.1 (18 advisories).

### Alterado (pode quebrar compatibilidade)
- Entradas inválidas agora lançam erro em vez de gerar boletos incorretos.
- Strings `NN/NN/AAAA` são interpretadas como `DD/MM/AAAA` (antes, `MM/DD` do JavaScript).
- `nossoNumeroDv` muda para Bradesco, Itaú e Caixa (agora segue a regra de cada banco); Bradesco pode retornar `'P'`.
- `BoletoJsonOutput` passou a ter campos tipados; objetos aninhados (`pagador`, `beneficiario`) agora são preservados na saída.
- `codigoBanco` usa o DV oficial (Sicredi: `748-X`).
- Itaú: carteiras de layout especial são rejeitadas.

## [1.0.1] - 2026-05-15

### Adicionado

Esta versão corrige a estrutura de publicação do pacote no npm, garantindo que o README e os arquivos de distribuição (CJS, ESM e Types) sejam incluídos corretamente.

- **Correções Técnicas**
  - Adicionado o campo `files` no `package.json` para incluir a pasta `dist`.
  - Configurado o campo `exports` para suporte híbrido (CommonJS e ES Modules).
  - Vinculado o `README.md` explicitamente para exibição no registro do npm.
  - Adicionado selo de **Provenance** na publicação via GitHub Actions.

**Full Changelog**: https://github.com/box4dev/gerador-boleto/compare/v1.0.0...v1.0.1

## [1.0.0] - 2026-05-14

### Adicionado
- **Lançamento Inicial**
  - Primeira versão pública do pacote `@box4dev/gerador-boleto`.
  - Implementação de geradores de boleto para Bradesco, Caixa, Itaú e Santander.
  - Suporte completo a TypeScript, incluindo geração automática de tipos.
  - Disponibilidade de builds em múltiplos formatos (ESM, CJS) para ampla compatibilidade.
  - Configuração de pipeline de Integração Contínua (CI) com GitHub Actions.
  - Documentação básica e guias para contribuição.
  - Implementação de testes unitários.
  - Implementação de testes E2E.