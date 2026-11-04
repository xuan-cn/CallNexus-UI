import { defineComponent, watch } from 'vue';
import { createInternalCode } from '@/utils/internalCode';

/** No DOM or layout slot. Empty form resets receive a fresh identifier; loaded identifiers stay unchanged. */
export default defineComponent({
  name: 'AutoInternalCode',
  props: { modelValue: { type: String, default: '' }, prefix: { type: String, default: 'cnx' } },
  emits: { 'update:modelValue': (_value: string) => true },
  setup(props, { emit }) {
    watch(
      () => props.modelValue,
      (value) => {
        if (!value?.trim()) emit('update:modelValue', createInternalCode(props.prefix));
      },
      { immediate: true, flush: 'sync' }
    );
    return () => null;
  }
});
