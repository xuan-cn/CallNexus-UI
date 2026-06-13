import type { Component } from 'vue';
import type { IvrPropertyEditorType } from '../nodeRegistry';
import ExtensionInputEditor from './ExtensionInputEditor.vue';
import MediaSelectEditor from './MediaSelectEditor.vue';

const propertyEditorRegistry: Record<IvrPropertyEditorType, Component> = {
  MEDIA_SELECT: MediaSelectEditor,
  EXTENSION_INPUT: ExtensionInputEditor
};

export const getIvrPropertyEditor = (type: IvrPropertyEditorType): Component | undefined => propertyEditorRegistry[type];
