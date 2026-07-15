import type { IvrNodeType } from '@/api/callcenter/ivr-flow/types';

export type IvrPropertyEditorType = 'MEDIA_SELECT' | 'EXTENSION_INPUT' | 'QUEUE_SELECT' | 'BUSINESS_HOURS_SELECT' | 'VOICEMAIL_SELECT' | 'AI_AGENT_SELECT' | 'EXTERNAL_NUMBER_GROUP';
export type IvrEdgeEditorType = 'DTMF_DIGIT' | 'BUSINESS_HOURS_BRANCH';

export interface IvrPropertyDefinition {
  key: string;
  label: string;
  component: IvrPropertyEditorType;
  required?: boolean;
  placeholder?: string;
}

export interface IvrEdgeSchema {
  label: string;
  component: IvrEdgeEditorType;
  required?: boolean;
  placeholder?: string;
}

export interface IvrNodeDefinition {
  type: IvrNodeType;
  label: string;
  color: string;
  description: string;
  terminal?: boolean;
  propertySchema: IvrPropertyDefinition[];
  edgeSchema?: IvrEdgeSchema;
}

const definitions: IvrNodeDefinition[] = [
  {
    type: 'START',
    label: '开始',
    color: '#053b70',
    description: 'IVR 流程入口',
    propertySchema: []
  },
  {
    type: 'PLAYBACK',
    label: '播放语音',
    color: '#409eff',
    description: '播放已发布的 IVR 提示音',
    propertySchema: [{ key: 'mediaId', label: '提示音', component: 'MEDIA_SELECT', required: true }]
  },
  {
    type: 'DTMF',
    label: '按键菜单',
    color: '#e6a23c',
    description: '播放提示音并根据用户按键分流',
    propertySchema: [{ key: 'mediaId', label: '提示音', component: 'MEDIA_SELECT', required: true }],
    edgeSchema: {
      label: '按键',
      component: 'DTMF_DIGIT',
      required: true,
      placeholder: '0-9'
    }
  },
  {
    type: 'EXTENSION',
    label: '转接分机',
    color: '#67c23a',
    description: '桥接到指定 SIP 分机',
    terminal: true,
    propertySchema: [
      {
        key: 'extension',
        label: '目标分机',
        component: 'EXTENSION_INPUT',
        required: true,
        placeholder: '例如 1001'
      }
    ]
  },
  {
    type: 'QUEUE',
    label: '转接队列',
    color: '#7c3aed',
    description: '将来电转入指定呼叫队列',
    terminal: true,
    propertySchema: [
      {
        key: 'queueId',
        label: '目标队列',
        component: 'QUEUE_SELECT',
        required: true
      }
    ]
  },
  {
    type: 'BUSINESS_HOURS',
    label: '工作时间判断',
    color: '#0f766e',
    description: '根据工作时间方案选择时间内或时间外分支',
    propertySchema: [{ key: 'planId', label: '工作时间方案', component: 'BUSINESS_HOURS_SELECT', required: true }],
    edgeSchema: { label: '分支', component: 'BUSINESS_HOURS_BRANCH', required: true }
  },
  {
    type: 'VOICEMAIL',
    label: '语音留言',
    color: '#8b5cf6',
    description: '播放提示音并录制客户留言',
    terminal: true,
    propertySchema: [{ key: 'boxId', label: '留言箱', component: 'VOICEMAIL_SELECT', required: true }]
  },
  {
    type: 'AI_AGENT',
    label: 'AI 语音助手',
    color: '#2563eb',
    description: '将来电交给指定 AI 助手进行知识库语音对话',
    terminal: true,
    propertySchema: [{ key: 'aiAgentId', label: 'AI 助手', component: 'AI_AGENT_SELECT', required: true }]
  },
  {
    type: 'EXTERNAL_NUMBER',
    label: '转外线号码组',
    color: '#16a34a',
    description: '按顺序、轮询或记忆策略转接多个手机或外线号码',
    terminal: true,
    propertySchema: [{ key: 'externalNumberGroup', label: '外线号码组', component: 'EXTERNAL_NUMBER_GROUP', required: true }]
  },
  {
    type: 'HANGUP',
    label: '挂断',
    color: '#f56c6c',
    description: '结束当前通话',
    terminal: true,
    propertySchema: []
  }
];

export const ivrNodeDefinitions = definitions;
export const ivrPaletteDefinitions = definitions.filter((item) => item.type !== 'START');
export const getIvrNodeDefinition = (type: IvrNodeType) => definitions.find((item) => item.type === type) || definitions[0];
