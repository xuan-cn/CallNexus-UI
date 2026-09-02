export type AiWorkflowPropertyType =
  | 'INPUT'
  | 'TEXTAREA'
  | 'NUMBER'
  | 'SWITCH'
  | 'TEMPLATE'
  | 'VARIABLE_SELECT'
  | 'CUSTOM_VARIABLE_SELECT'
  | 'FLOW_VALUE'
  | 'OPERATOR_SELECT'
  | 'INTENT_MULTI_SELECT'
  | 'QUEUE_SELECT'
  | 'RESULT_SELECT';

export interface AiWorkflowPropertyDefinition {
  key: string;
  label: string;
  type: AiWorkflowPropertyType;
  placeholder?: string;
  defaultValue?: unknown;
}

export interface AiWorkflowNodeDefinition {
  type: string;
  label: string;
  color: string;
  description: string;
  terminal?: boolean;
  branch?: boolean;
  properties: AiWorkflowPropertyDefinition[];
}

export const aiWorkflowNodeDefinitions: AiWorkflowNodeDefinition[] = [
  { type: 'START', label: '开始', color: '#0f4c81', description: 'AI 编排入口', properties: [] },
  {
    type: 'TEMPLATE_REPLY',
    label: '模板回复',
    color: '#2563eb',
    description: '渲染变量后交给 TTS 或文本通道',
    properties: [{ key: 'text', label: '回复内容', type: 'TEMPLATE', placeholder: '例如：您好，欢迎致电客服中心。' }]
  },
  {
    type: 'WAIT_INPUT',
    label: '等待输入',
    color: '#0891b2',
    description: '等待最终 ASR 分句或文本消息',
    properties: [{ key: 'timeoutSeconds', label: '超时秒数', type: 'NUMBER', defaultValue: 15 }]
  },
  {
    type: 'INTENT_ROUTE',
    label: '意图判断',
    color: '#7c3aed',
    description: '使用 AI 助手绑定的本地意图库分支',
    branch: true,
    properties: [{ key: 'intentCodes', label: '需要判断的意图', type: 'INTENT_MULTI_SELECT', defaultValue: [] }]
  },
  {
    type: 'CONDITION',
    label: '条件判断',
    color: '#d97706',
    description: '根据上下文变量执行确定性分支',
    branch: true,
    properties: [
      { key: 'variable', label: '判断字段', type: 'VARIABLE_SELECT' },
      { key: 'operator', label: '判断方式', type: 'OPERATOR_SELECT', defaultValue: 'EQ' },
      { key: 'compareValue', label: '比较值', type: 'INPUT', placeholder: '请输入要比较的内容' }
    ]
  },
  {
    type: 'SET_VARIABLE',
    label: '记录流程信息',
    color: '#475569',
    description: '记录本次流程中的临时信息，供后续条件判断使用',
    properties: [
      { key: 'key', label: '记录内容', type: 'CUSTOM_VARIABLE_SELECT' },
      { key: 'value', label: '设置为', type: 'FLOW_VALUE', placeholder: '请输入要记录的内容' }
    ]
  },
  {
    type: 'KNOWLEDGE_QUERY',
    label: '知识库回答',
    color: '#16a34a',
    description: '使用当前 AI 助手绑定的 FAQ/RAG',
    properties: [{ key: 'queryTemplate', label: '查询内容', type: 'TEMPLATE', defaultValue: '{{conversation.currentInput}}' }]
  },
  {
    type: 'MODEL_REPLY',
    label: '模型回答',
    color: '#0d9488',
    description: '使用当前 AI 助手模型生成自然回复',
    properties: [{ key: 'promptTemplate', label: '补充提示词', type: 'TEMPLATE', placeholder: '可留空，或输入本节点的补充要求' }]
  },
  {
    type: 'TICKET_DRAFT_CREATE',
    label: '工单草稿',
    color: '#9333ea',
    description: '调用现有 AI 工单草稿能力',
    properties: [{ key: 'waitResult', label: '等待生成结果', type: 'SWITCH', defaultValue: false }]
  },
  {
    type: 'AUTO_OUTBOUND_WRITEBACK',
    label: '记录外呼结果',
    color: '#0284c7',
    description: '在结果已经明确的分支中，记录本次自动外呼结果',
    properties: [
      { key: 'resultCode', label: '外呼结果', type: 'RESULT_SELECT' },
      { key: 'remark', label: '结果说明', type: 'TEMPLATE' }
    ]
  },
  {
    type: 'TRANSFER_QUEUE',
    label: '转技能组',
    color: '#65a30d',
    description: '转入指定技能组或队列',
    terminal: true,
    properties: [{ key: 'queueCode', label: '目标队列', type: 'QUEUE_SELECT' }]
  },
  { type: 'HANGUP', label: '挂断', color: '#dc2626', description: '结束当前通话', terminal: true, properties: [] },
  { type: 'END', label: '结束', color: '#64748b', description: '正常结束当前编排', terminal: true, properties: [] }
];

export const aiWorkflowPaletteDefinitions = aiWorkflowNodeDefinitions.filter((item) => item.type !== 'START');
export const getAiWorkflowNodeDefinition = (type: string) =>
  aiWorkflowNodeDefinitions.find((item) => item.type === type) || aiWorkflowNodeDefinitions[0];
