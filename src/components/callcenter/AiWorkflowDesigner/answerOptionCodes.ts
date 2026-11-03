export function createAnswerOptionCode(existingCodes: string[]): string {
  const existing = new Set(existingCodes);
  let code: string;
  do {
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    code =
      'ANSWER_' +
      Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
  } while (existing.has(code));
  return code;
}

export function fillMissingAnswerOptionCodes<T extends { code?: string }>(options: T[]): T[] {
  const used = options.map((option) => option.code || '');
  return options.map((option) => {
    if (option.code?.trim()) return option;
    const code = createAnswerOptionCode(used);
    used.push(code);
    return { ...option, code };
  });
}
