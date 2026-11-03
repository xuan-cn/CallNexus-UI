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
  | 'SLOT_TARGET_MULTI_SELECT'
  | 'CUSTOMER_FIELD_MULTI_SELECT'
  | 'QUEUE_SELECT'
  | 'MEDIA_SELECT'
  | 'RESULT_SELECT'
  | 'OPTIONS_SELECT';

export interface AiWorkflowPropertyDefinition {
  key: string;
  label: string;
  type: AiWorkflowPropertyType;
  placeholder?: string;
  defaultValue?: unknown;
  min?: number;
  max?: number;
  options?: Array<{ label: string; value: string }>;
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

const answerModeOptions = [
  { label: '关闭问答，仅澄清或补播', value: 'OFF' },
  { label: '仅知识库回答，未命中不调用模型兜底', value: 'KNOWLEDGE_ONLY' },
  { label: '允许大模型兜底（遵循助手配置）', value: 'MODEL_FALLBACK' }
];
const answerMatchingProperties = (prefix: string, label: string): AiWorkflowPropertyDefinition[] => [
  {
    key: prefix + 'MatchMode',
    label: label + '匹配方式',
    type: 'OPTIONS_SELECT',
    defaultValue: 'EXACT',
    options: [
      { label: '整句匹配', value: 'EXACT' },
      { label: '关键词匹配', value: 'KEYWORD' },
      { label: '意图匹配', value: 'INTENT' }
    ]
  },
  {
    key: prefix + 'Answers',
    label: label + '回答 / 关键词（每行一条）',
    type: 'TEXTAREA',
    placeholder: '整句：忽略标点空格；关键词：包含匹配，请谨慎配置否定和疑问'
  },
  {
    key: prefix + 'KeywordMode',
    label: label + '关键词条件',
    type: 'OPTIONS_SELECT',
    defaultValue: 'ANY',
    options: [
      { label: '任一关键词命中', value: 'ANY' },
      { label: '全部关键词命中', value: 'ALL' }
    ]
  },
  { key: prefix + 'ExcludedKeywords', label: label + '排除词（每行一条）', type: 'TEXTAREA', placeholder: '包含任一排除词不命中' },
  { key: prefix + 'IntentCodes', label: label + '意图', type: 'INTENT_MULTI_SELECT', defaultValue: [] }
];
export const aiWorkflowNodeDefinitions: AiWorkflowNodeDefinition[] = [
  {
    type: 'DIALOGUE_STEP',
    label: '对话步骤',
    color: '#0f766e',
    branch: true,
    description: '一步完成提问、等待和有限澄清；明确回答优先匹配，可开启 AI 辅助理解与知识插问。',
    properties: [
      {
        key: 'goal',
        label: '本步骤目标',
        type: 'TEXTAREA',
        placeholder: '说明本步骤要判断什么、各选项的判断条件，以及不确定时如何处理。支持分行填写。'
      },
      { key: 'aiUnderstandingEnabled', label: 'AI 辅助理解复杂表达', type: 'SWITCH', defaultValue: false },
      { key: 'collectedFields', label: '本步必填流程文本字段（先在顶部变量中创建）', type: 'SLOT_TARGET_MULTI_SELECT', defaultValue: [] },
      { key: 'reuseCollectedFields', label: '字段已齐全时复用并跳过本步提问', type: 'SWITCH', defaultValue: false },
      { key: 'aiAutoAdvance', label: '允许高置信度业务选项/确认/拒绝推进（否则再次确认）', type: 'SWITCH', defaultValue: false },
      {
        key: 'answerMode',
        label: '插问回答方式（需开启 AI 辅助理解，最多 5 次）',
        type: 'OPTIONS_SELECT',
        defaultValue: 'OFF',
        options: answerModeOptions
      },
      { key: 'text', label: '提问话术', type: 'TEMPLATE' },
      ...answerMatchingProperties('accepted', '确认完成'),
      ...answerMatchingProperties('declined', '明确拒绝'),
      { key: 'retryText', label: '未确认时的简短澄清话术', type: 'TEMPLATE' },
      { key: 'maxRetries', label: '最多澄清次数（不含首次提问）', type: 'NUMBER', defaultValue: 2, min: 1, max: 10 }
    ]
  },
  { type: 'START', label: '开始', color: '#0f4c81', description: 'AI 编排入口', properties: [] },
  {
    type: 'TEMPLATE_REPLY',
    label: '模板回复',
    color: '#2563eb',
    description: '渲染变量后交给 TTS 或文本通道',
    properties: [
      { key: 'text', label: '回复内容', type: 'TEMPLATE', placeholder: '例如：您好，欢迎致电客服中心。' },
      { key: 'requiredDisclosure', label: '必须完整告知（测试需模拟播完）', type: 'SWITCH', defaultValue: false },
      {
        key: 'disclosureBargeInMode',
        label: '必要告知打断方式',
        type: 'OPTIONS_SELECT',
        defaultValue: 'DISABLED',
        options: [
          { label: '禁止打断', value: 'DISABLED' },
          { label: '允许打断，按问答策略回答后完整补播', value: 'REPLAY_AFTER_REPLY' }
        ]
      },
      { key: 'disclosureMaxInterruptions', label: '最多打断次数，之后禁止打断直至补播完成', type: 'NUMBER', defaultValue: 2, min: 1, max: 5 },
      { key: 'answerMode', label: '插问回答方式', type: 'OPTIONS_SELECT', defaultValue: 'KNOWLEDGE_ONLY', options: answerModeOptions }
    ]
  },
  {
    type: 'WAIT_INPUT',
    label: '等待输入',
    color: '#0891b2',
    description: '等待最终 ASR 分句或文本消息',
    properties: [{ key: 'timeoutSeconds', label: '超时秒数', type: 'NUMBER', defaultValue: 15 }]
  },
  {
    type: 'PLAY_MEDIA',
    label: '播放声音媒体',
    color: '#b45309',
    description: '播放已发布并同步到当前语音节点的声音媒体',
    properties: [{ key: 'mediaId', label: '声音媒体', type: 'MEDIA_SELECT' }]
  },
  {
    type: 'INTENT_ROUTE',
    label: '意图判断',
    color: '#7c3aed',
    description: '命中意图后分支；未命中可在节点内回复、重问或统一继续',
    branch: true,
    properties: [
      { key: 'intentCodes', label: '需要判断的意图', type: 'INTENT_MULTI_SELECT', defaultValue: [] },
      {
        key: 'fallbackMode',
        label: '未命中时',
        type: 'OPTIONS_SELECT',
        defaultValue: 'INHERIT',
        options: [
          { label: '继承流程公共策略', value: 'INHERIT' },
          { label: '按原方式走未命中连线', value: 'EDGE' },
          { label: '回复固定话术并重新询问', value: 'FIXED_RETRY' },
          { label: 'AI 回答后重新询问', value: 'AI_RETRY' },
          { label: '回复固定话术后继续流程', value: 'FIXED_CONTINUE' },
          { label: 'AI 回答后继续流程', value: 'AI_CONTINUE' }
        ]
      },
      {
        key: 'fallbackText',
        label: '回复话术',
        type: 'TEMPLATE',
        placeholder: '例如：抱歉，我没有听清。请问您是否需要办理住院垫付？'
      },
      {
        key: 'fallbackPrompt',
        label: 'AI 回答要求',
        type: 'TEMPLATE',
        placeholder: '可留空，系统会要求 AI 简短回答；重新询问模式还会让 AI 自然地再次提问。'
      },
      { key: 'maxRetries', label: '最多重新询问', type: 'NUMBER', defaultValue: 2, min: 1, max: 10 },
      {
        key: 'retryLimitAction',
        label: '达到次数上限后',
        type: 'OPTIONS_SELECT',
        defaultValue: 'CONTINUE',
        options: [
          { label: '走“未命中后继续”统一连线', value: 'CONTINUE' },
          { label: '走原“未命中任何意图”连线', value: 'EDGE' },
          { label: '直接转技能组', value: 'TRANSFER_QUEUE' },
          { label: '直接转分机', value: 'TRANSFER_EXTENSION' },
          { label: '直接挂机', value: 'HANGUP' },
          { label: '结束编排并返回普通 AI 对话', value: 'END' }
        ]
      },
      { key: 'limitQueueCode', label: '达到上限转入技能组', type: 'QUEUE_SELECT' },
      { key: 'limitExtension', label: '达到上限转入分机', type: 'INPUT', placeholder: '例如：1001' },
      {
        key: 'limitText',
        label: '达到上限时的话术（可选）',
        type: 'TEMPLATE',
        placeholder: '例如：暂时没有确认到您的选择，我先为您继续处理。'
      }
    ]
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
    type: 'LOOP_LIMIT',
    label: '次数限制',
    color: '#ea580c',
    description: '限制知识问答或澄清的循环轮次，达到上限后退出循环',
    branch: true,
    properties: [{ key: 'maxIterations', label: '最大循环次数', type: 'NUMBER', defaultValue: 3, min: 1, max: 20 }]
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
    type: 'CUSTOMER_QUERY',
    label: '查询客户',
    color: '#0369a1',
    description: '按当前通话号码查询客户，并加载客户资料变量',
    properties: [{ key: 'phoneTemplate', label: '查询号码', type: 'TEMPLATE', defaultValue: '{{customer.phone}}' }]
  },
  {
    type: 'SLOT_EXTRACT',
    label: '提取信息',
    color: '#7e22ce',
    description: '从客户当前回答中提取选定字段，不推测未提及内容',
    properties: [
      { key: 'sourceTemplate', label: '提取来源', type: 'TEMPLATE', defaultValue: '{{conversation.currentInput}}' },
      { key: 'fields', label: '需要提取的字段', type: 'SLOT_TARGET_MULTI_SELECT', defaultValue: [] }
    ]
  },
  {
    type: 'CUSTOMER_UPDATE',
    label: '更新客户',
    color: '#be123c',
    description: '仅把明确勾选的字段写回已查询到的客户',
    properties: [{ key: 'fields', label: '允许更新的字段', type: 'CUSTOMER_FIELD_MULTI_SELECT', defaultValue: [] }]
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
  {
    type: 'TRANSFER_EXTENSION',
    label: '转分机',
    color: '#4d7c0f',
    description: '将当前客户通话转给指定分机',
    terminal: true,
    properties: [{ key: 'extension', label: '目标分机', type: 'INPUT', placeholder: '例如：1001' }]
  },
  {
    type: 'TRANSFER_IVR',
    label: '转 IVR',
    color: '#3f6212',
    description: '将当前客户通话转入指定 IVR 流程',
    terminal: true,
    properties: [{ key: 'ivrFlowId', label: 'IVR 流程 ID', type: 'INPUT', placeholder: '请输入已发布的 IVR 流程 ID' }]
  },
  { type: 'HANGUP', label: '挂断', color: '#dc2626', description: '结束当前通话', terminal: true, properties: [] },
  { type: 'END', label: '结束', color: '#64748b', description: '正常结束当前编排', terminal: true, properties: [] }
];

for (const definition of aiWorkflowNodeDefinitions) {
  if (['TEMPLATE_REPLY', 'WAIT_INPUT', 'DIALOGUE_STEP'].includes(definition.type))
    definition.properties.push({
      key: 'conversationRuleMode',
      label: '公共对话规则',
      type: 'OPTIONS_SELECT',
      defaultValue: 'INHERIT',
      options: [
        { label: '继承流程公共规则', value: 'INHERIT' },
        { label: '本节点关闭', value: 'DISABLED' },
        { label: '本节点单独配置', value: 'OVERRIDE' }
      ]
    });
  if (!['TEMPLATE_REPLY', 'MODEL_REPLY', 'KNOWLEDGE_QUERY', 'INTENT_ROUTE', 'DIALOGUE_STEP'].includes(definition.type)) continue;
  definition.properties.push(
    {
      key: 'playbackFailureAction',
      label: '停播重试失败后',
      type: 'OPTIONS_SELECT',
      defaultValue: 'HANGUP',
      options: [
        { label: '挂断通话', value: 'HANGUP' },
        { label: '转人工技能组', value: 'TRANSFER_QUEUE' }
      ]
    },
    { key: 'playbackFailureQueueCode', label: '停播失败转入技能组', type: 'QUEUE_SELECT' },
    {
      key: 'nodeBargeInMode',
      label: '本节点打断方式',
      type: 'OPTIONS_SELECT',
      defaultValue: 'INHERIT',
      options: [
        { label: '继承 AI 助手', value: 'INHERIT' },
        { label: '禁止打断', value: 'DISABLED' },
        { label: '允许打断，直接回应', value: 'INTERRUPT' },
        { label: '允许打断，控场替换当前话术', value: 'CONTROL_RESUME' }
      ]
    },
    {
      key: 'nodeControlText',
      label: '本节点控场替代话术',
      type: 'TEMPLATE',
      placeholder: '支持变量；填写完整替代话术，说完继续流程，不重播原文；留空继承助手话术'
    },
    { key: 'nodeControlMaxCount', label: '本次节点执行最多控场次数', type: 'NUMBER', defaultValue: 2, min: 1, max: 20 },
    { key: 'nodeControlCooldownMs', label: '控场冷却时间（毫秒）', type: 'NUMBER', defaultValue: 5000, min: 0, max: 60000 }
  );
}

export const aiWorkflowPaletteDefinitions = aiWorkflowNodeDefinitions.filter((item) => item.type !== 'START');
export const getAiWorkflowNodeDefinition = (type: string) =>
  aiWorkflowNodeDefinitions.find((item) => item.type === type) || aiWorkflowNodeDefinitions[0];
