import { describe, expect, it } from 'vitest';
import { createInternalCode, ensureInternalCode, prepareQualityItemCodes } from './internalCode';

describe('internal configuration codes', () => {
  it('generates backend-safe, unique identifiers within 32 characters', () => {
    const values = Array.from({ length: 1000 }, () => createInternalCode('gateway'));
    expect(new Set(values).size).toBe(values.length);
    expect(values.every((value) => /^[a-z][a-z0-9_]{1,31}$/.test(value))).toBe(true);
    expect(values.every((value) => value.length === 32)).toBe(true);
  });
  it('preserves existing codes exactly', () => {
    expect(ensureInternalCode('LEGACY_1001')).toBe('LEGACY_1001');
    expect(ensureInternalCode(' Existing-Code ')).toBe(' Existing-Code ');
  });
  it('generates missing codes, without changing a retry payload', () => {
    const code = ensureInternalCode('   ', 'fld');
    expect(code).toMatch(/^fld_[a-f0-9]{24}$/);
    expect(ensureInternalCode(code, 'fld')).toBe(code);
    expect(ensureInternalCode(null)).toMatch(/^cnx_/);
  });
  it('rejects invalid or overly long prefixes', () => {
    expect(() => createInternalCode('TOO_LONG')).toThrow();
    expect(() => createInternalCode('')).toThrow();
  });
  it('groups new quality items by dimension name', () => {
    const items = [
      { dimensionName: '服务规范', dimensionCode: '', itemCode: '' },
      { dimensionName: '服务规范', dimensionCode: '', itemCode: '' },
      { dimensionName: '服务态度', dimensionCode: '', itemCode: '' }
    ];
    prepareQualityItemCodes(items);
    expect(items[0].dimensionCode).toBe(items[1].dimensionCode);
    expect(items[0].dimensionCode).not.toBe(items[2].dimensionCode);
    expect(new Set(items.map((item) => item.itemCode)).size).toBe(3);
    const snapshot = JSON.stringify(items);
    prepareQualityItemCodes(items);
    expect(JSON.stringify(items)).toBe(snapshot);
  });
  it('reuses persisted dimensions for new items and preserves all existing codes', () => {
    const items = [
      { dimensionName: '服务', dimensionCode: 'temporary', itemCode: '' },
      { id: '10', dimensionName: '服务', dimensionCode: 'LEGACY_DIM', itemCode: 'LEGACY_ITEM' }
    ];
    prepareQualityItemCodes(items);
    expect(items[0].dimensionCode).toBe('LEGACY_DIM');
    expect(items[1].itemCode).toBe('LEGACY_ITEM');
    expect(items[1].dimensionCode).toBe('LEGACY_DIM');
  });
  it('keeps separate codes when a new item changes to another dimension', () => {
    const items = [
      { dimensionName: '服务', dimensionCode: 'same', itemCode: 'first' },
      { dimensionName: '态度', dimensionCode: 'same', itemCode: 'second' }
    ];
    prepareQualityItemCodes(items);
    expect(items[0].dimensionCode).not.toBe(items[1].dimensionCode);
  });
});
