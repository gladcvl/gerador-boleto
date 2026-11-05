import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeDate, utcToday } from '../../../src/util/date.js';

describe('Unit › Util › normalizeDate', () => {
  it('deve aceitar objeto Date válido', () => {
    const result = normalizeDate(new Date('2026-05-17T15:30:00.000Z'));
    assert.ok(result instanceof Date);
    assert.equal(result.getUTCFullYear(), 2026);
    assert.equal(result.getUTCMonth(), 4);
    assert.equal(result.getUTCDate(), 17);
  });

  it('deve aceitar string ISO completa', () => {
    const result = normalizeDate('2026-05-17T00:00:00.000Z');
    assert.equal(result.getUTCDate(), 17);
  });

  it('deve aceitar string curta YYYY-MM-DD', () => {
    const result = normalizeDate('2026-05-17');
    assert.equal(result.getUTCDate(), 17);
  });

  it('deve normalizar para meia-noite UTC', () => {
    const result = normalizeDate(new Date('2026-05-17T15:30:45.123Z'));
    assert.equal(result.getUTCHours(), 0);
    assert.equal(result.getUTCMinutes(), 0);
    assert.equal(result.getUTCSeconds(), 0);
    assert.equal(result.getUTCMilliseconds(), 0);
  });

  it('deve retornar nova instância', () => {
    const input = new Date('2026-05-17T00:00:00.000Z');
    assert.notEqual(normalizeDate(input), input);
  });

  it('deve produzir mesmo resultado para Date e string', () => {
    const a = normalizeDate(new Date('2026-05-17T00:00:00.000Z'));
    const b = normalizeDate('2026-05-17T00:00:00.000Z');
    assert.equal(a.getTime(), b.getTime());
  });

  it('deve lançar erro para string inválida', () => {
    assert.throws(() => normalizeDate('xyz'), /Data inválida/);
  });

  it('deve lançar erro para string vazia', () => {
    assert.throws(() => normalizeDate(''), /Data inválida/);
  });

  it('deve lançar erro para Date inválida (NaN)', () => {
    assert.throws(() => normalizeDate(new Date('not-a-date')), /Data inválida/);
  });

  it('deve incluir o valor inválido na mensagem de erro', () => {
    assert.throws(
      () => normalizeDate('xyz-invalid'),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes('xyz-invalid'));
        return true;
      },
    );
  });
});

describe('Unit › Util › utcToday', () => {
  it('deve retornar uma instância de Date', () => {
    assert.ok(utcToday() instanceof Date);
  });

  it('deve retornar a data de hoje no calendário de Brasília', () => {
    const result = utcToday();
    const hojeBrasil = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(
      new Date(),
    );
    assert.equal(result.toISOString().slice(0, 10), hojeBrasil);
  });

  it('deve retornar meia-noite UTC', () => {
    const result = utcToday();
    assert.equal(result.getUTCHours(), 0);
    assert.equal(result.getUTCMinutes(), 0);
    assert.equal(result.getUTCSeconds(), 0);
  });

  it('deve retornar instâncias diferentes a cada chamada', () => {
    const a = utcToday();
    const b = utcToday();
    assert.notEqual(a, b);
    assert.equal(a.getTime(), b.getTime());
  });
});
