import type { Component } from 'vue';
import type { IvrPropertyEditorType } from '../nodeRegistry';
import ExtensionInputEditor from './ExtensionInputEditor.vue';
import MediaSelectEditor from './MediaSelectEditor.vue';
import QueueSelectEditor from './QueueSelectEditor.vue';
import BusinessHoursSelectEditor from './BusinessHoursSelectEditor.vue';
import VoiceMailSelectEditor from './VoiceMailSelectEditor.vue';
import AiAgentSelectEditor from './AiAgentSelectEditor.vue';
import ExternalNumberGroupEditor from './ExternalNumberGroupEditor.vue';

const propertyEditorRegistry: Record<IvrPropertyEditorType, Component> = {
  MEDIA_SELECT: MediaSelectEditor,
  EXTENSION_INPUT: ExtensionInputEditor,
  QUEUE_SELECT: QueueSelectEditor,
  BUSINESS_HOURS_SELECT: BusinessHoursSelectEditor,
  VOICEMAIL_SELECT: VoiceMailSelectEditor,
  AI_AGENT_SELECT: AiAgentSelectEditor,
  EXTERNAL_NUMBER_GROUP: ExternalNumberGroupEditor
};

export const getIvrPropertyEditor = (type: IvrPropertyEditorType): Component | undefined => propertyEditorRegistry[type];
