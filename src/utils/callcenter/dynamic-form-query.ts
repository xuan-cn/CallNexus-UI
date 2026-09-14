import type { DynamicFieldFilter, FormField, FormQueryField } from '@/api/callcenter/form-template/types';

export type DynamicQueryValues = Record<string, unknown>;

const hasValue = (value: unknown) =>
  value !== undefined && value !== null && value !== '' && (!Array.isArray(value) || value.length > 0);

export const buildDynamicFilters = (fields: FormQueryField[], values: DynamicQueryValues): DynamicFieldFilter[] =>
  fields.reduce<DynamicFieldFilter[]>((filters, field) => {
    const value = values[field.fieldCode];
    if (!hasValue(value)) return filters;
    if (field.queryMode === 'BETWEEN') {
      const range = Array.isArray(value) ? value : [];
      if (hasValue(range[0]) && hasValue(range[1])) {
        filters.push({ fieldCode: field.fieldCode, operator: field.queryMode, value: range[0], endValue: range[1] });
      }
      return filters;
    }
    filters.push({ fieldCode: field.fieldCode, operator: field.queryMode, value });
    return filters;
  }, []);

export const formatDynamicFieldValue = (value: unknown, field: Pick<FormField, 'options'>) => {
  if (!hasValue(value)) return '-';
  const rawValues = Array.isArray(value) ? value.map(String) : String(value).split(',');
  if (!field.options?.length) return rawValues.join('，');
  return rawValues.map((item) => field.options.find((option) => option.value === item)?.label || item).join('，');
};
