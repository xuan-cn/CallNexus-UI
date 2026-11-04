export function splitUtterancePaste(values: string[], index: number, text: string, start: number, end: number): string[] {
  const original = values[index] || '';
  const merged = original.slice(0, start) + text + original.slice(end);
  const seen = new Set(values.filter((_, i) => i !== index).map(value => value.trim()).filter(Boolean));
  const added = merged.split(/\r\n|[\r\n\u2028\u2029]/).map(value => value.trim()).filter(value => {
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
  if (added.some(value => value.length > 1000)) throw new Error('每条话术最多 1000 字，请检查后重新粘贴');
  return added.length ? [...values.slice(0, index), ...added, ...values.slice(index + 1)] : values;
}
