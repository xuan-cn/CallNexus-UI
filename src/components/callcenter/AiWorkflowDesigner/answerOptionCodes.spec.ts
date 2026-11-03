import { describe, expect, it } from 'vitest';
import { createAnswerOptionCode, fillMissingAnswerOptionCodes } from './answerOptionCodes';

describe('answer option codes', () => {
  it('creates unique codes accepted by the backend', () => {
    const codes: string[] = [];
    for (let i = 0; i < 100; i++) {
      const code = createAnswerOptionCode(codes);
      expect(code).toMatch(/^[A-Z][A-Z0-9_]{0,31}$/);
      expect(codes).not.toContain(code);
      codes.push(code);
    }
  });
  it('keeps existing codes and only fills missing ones', () => {
    const result = fillMissingAnswerOptionCodes([{ code: 'FAMILY', label: '家属' }, { code: '', label: '本人' }, { label: '代理人' }]);
    expect(result[0].code).toBe('FAMILY');
    expect(new Set(result.map((option) => option.code)).size).toBe(3);
    const renamed = result.map((option) => ({ ...option, label: '新名称' }));
    expect(fillMissingAnswerOptionCodes(renamed).map((option) => option.code)).toEqual(result.map((option) => option.code));
  });
});
