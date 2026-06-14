import type { Component } from 'vue';
import type { IvrPropertyEditorType } from '../nodeRegistry';
import ExtensionInputEditor from './ExtensionInputEditor.vue';
import MediaSelectEditor from './MediaSelectEditor.vue';
import QueueSelectEditor from './QueueSelectEditor.vue';

const propertyEditorRegistry: Record<IvrPropertyEditorType, Component> = {
  MEDIA_SELECT: MediaSelectEditor,
  EXTENSION_INPUT: ExtensionInputEditor,
  QUEUE_SELECT: QueueSelectEditor
};

export const getIvrPropertyEditor = (type: IvrPropertyEditorType): Component | undefined => propertyEditorRegistry[type];
