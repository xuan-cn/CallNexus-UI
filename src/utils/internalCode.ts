/** Internal configuration identifiers are generated once and never derived from editable display names. */
export function createInternalCode(prefix = 'cnx'): string {
  if (!/^[a-z][a-z0-9_]{0,6}$/.test(prefix)) throw new Error('Invalid internal code prefix');
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return `${prefix}_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

export function ensureInternalCode(value?: string | null, prefix = 'cnx'): string {
  return value?.trim() ? value : createInternalCode(prefix);
}

export function prepareQualityItemCodes<T extends { id?: unknown; dimensionCode?: string; dimensionName?: string; itemCode?: string }>(
  items: T[]
): void {
  const dimensions = new Map<string, string>();
  const codeOwners = new Map<string, string>();
  for (const item of items)
    if (item.id && item.dimensionCode && item.dimensionName?.trim()) {
      dimensions.set(item.dimensionName.trim(), item.dimensionCode);
      codeOwners.set(item.dimensionCode, item.dimensionName.trim());
    }
  for (const item of items) {
    const name = item.dimensionName?.trim();
    if (!item.id && name) {
      const reusableCode = item.dimensionCode && (!codeOwners.has(item.dimensionCode) || codeOwners.get(item.dimensionCode) === name);
      item.dimensionCode = dimensions.get(name) || (reusableCode ? item.dimensionCode! : createInternalCode('dim'));
      dimensions.set(name, item.dimensionCode);
      codeOwners.set(item.dimensionCode, name);
    } else if (!item.dimensionCode) item.dimensionCode = createInternalCode('dim');
    item.itemCode = ensureInternalCode(item.itemCode, 'item');
  }
}
