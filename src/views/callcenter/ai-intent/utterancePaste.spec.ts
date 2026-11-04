import { describe, expect, it } from 'vitest';
import { splitUtterancePaste } from './utterancePaste';
describe('utterance multiline paste', () => {
  it('splits newline variants and keeps commas inside sentences', () => {
    expect(splitUtterancePaste([''], 0, '您好，我需要办理\r\n\n我是本人\r可以\u2028好的', 0, 0)).toEqual(['您好，我需要办理', '我是本人', '可以', '好的']);
  });
  it('deduplicates within the same column and pasted lines', () => {
    expect(splitUtterancePaste(['已有', ''], 1, '已有\n新话术\n新话术', 0, 0)).toEqual(['已有', '新话术']);
  });
  it('preserves selection prefix, suffix and other rows', () => {
    expect(splitUtterancePaste(['之前', '我是XX本人', '之后'], 1, '张三\n李四', 2, 4)).toEqual(['之前', '我是张三', '李四本人', '之后']);
  });
  it('does not erase existing input on blank or entirely duplicate paste', () => {
    expect(splitUtterancePaste(['已有', ''], 1, '已有\n', 0, 0)).toEqual(['已有', '']);
  });
  it('rejects oversized lines without changing inputs', () => {
    const values = ['原话术'];
    expect(() => splitUtterancePaste(values, 0, 'a'.repeat(1001) + '\n', 0, 3)).toThrow('最多 1000 字');
    expect(values).toEqual(['原话术']);
  });
});
