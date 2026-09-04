<template>
  <div class="ai-workflow-designer">
    <aside class="palette">
      <h4>编排节点</h4>
      <div v-for="item in commonPaletteDefinitions" :key="item.type" class="palette-item" @mousedown="startDrag(item)">
        <span class="node-dot" :style="{ background: item.color }" />
        <div>
          <div class="palette-label">{{ item.label }}</div>
          <div class="muted">{{ item.description }}</div>
        </div>
      </div>
      <div class="palette-section-title">高级节点</div>
      <div v-for="item in advancedPaletteDefinitions" :key="item.type" class="palette-item" @mousedown="startDrag(item)">
        <span class="node-dot" :style="{ background: item.color }" />
        <div>
          <div class="palette-label">{{ item.label }}</div>
          <div class="muted">{{ item.description }}</div>
        </div>
      </div>
      <el-alert type="info" :closable="false" title="拖入节点并连线。节点和分支均通过中文选项配置，无需填写技术编码。" />
    </aside>

    <main class="canvas-wrap">
      <div class="canvas-toolbar">
        <el-button-group>
          <el-button icon="Back" title="撤销" @click="lf?.undo()" />
          <el-button icon="Right" title="重做" @click="lf?.redo()" />
          <el-button icon="ZoomIn" title="放大" @click="lf?.zoom(true)" />
          <el-button icon="ZoomOut" title="缩小" @click="lf?.zoom(false)" />
          <el-button icon="FullScreen" title="适应画布" @click="fitCanvas" />
        </el-button-group>
        <span class="muted">点击节点或连线编辑，选中后按 Delete 可删除</span>
      </div>
      <div ref="containerRef" class="logicflow-canvas" />
    </main>

    <aside class="properties">
      <template v-if="selectedNode">
        <div class="property-title">节点配置</div>
        <el-tag :color="selectedDefinition.color" effect="dark">{{ selectedDefinition.label }}</el-tag>
        <p class="muted property-description">{{ selectedDefinition.description }}</p>
        <el-alert
          v-if="selectedNode.type === 'SET_VARIABLE' && !customVariableOptions.length"
          class="property-alert"
          type="warning"
          :closable="false"
          title="请先点击顶部“变量”，创建需要记录的流程信息。"
        />
        <el-alert
          v-if="selectedNode.type === 'AUTO_OUTBOUND_WRITEBACK'"
          class="property-alert"
          type="info"
          :closable="false"
          :title="outboundWritebackHint"
        />
        <el-alert
          v-if="selectedNode.type === 'CUSTOMER_UPDATE'"
          class="property-alert"
          type="warning"
          :closable="false"
          title="只会写回这里勾选的字段。手机号和附件不允许由 AI 自动修改。"
        />
        <el-form label-position="top">
          <el-form-item label="节点名称"><el-input v-model="selectedNode.name" @input="updateSelectedNode" /></el-form-item>
          <el-form-item
            v-for="property in selectedDefinition.properties"
            v-show="isPropertyVisible(property.key)"
            :key="property.key"
            :label="property.label"
          >
            <el-select
              v-if="property.key === 'compareValue' && comparisonOptions.length"
              :model-value="selectedNode.config[property.key]"
              filterable
              placeholder="请选择比较值"
              style="width: 100%"
              @update:model-value="updateNodeProperty(property.key, $event)"
            >
              <el-option v-for="item in comparisonOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
            <el-input
              v-else-if="property.type === 'INPUT'"
              :model-value="selectedNode.config[property.key]"
              :placeholder="property.placeholder"
              @update:model-value="updateNodeProperty(property.key, $event)"
            />
            <el-input
              v-else-if="property.type === 'TEXTAREA'"
              :model-value="selectedNode.config[property.key]"
              type="textarea"
              :rows="5"
              :placeholder="property.placeholder"
              @update:model-value="updateNodeProperty(property.key, $event)"
            />
            <template v-else-if="property.type === 'TEMPLATE'">
              <el-input
                :model-value="selectedNode.config[property.key]"
                type="textarea"
                :rows="4"
                :placeholder="property.placeholder"
                @update:model-value="updateNodeProperty(property.key, $event)"
              />
              <div class="variable-insert">
                <span>插入变量：</span>
                <el-dropdown trigger="click" max-height="300px" @command="insertTemplateVariable(property.key, $event)">
                  <el-button link type="primary"
                    >选择变量 <el-icon><ArrowDown /></el-icon
                  ></el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item v-for="item in variableOptions" :key="item.value" :command="item.value">
                        {{ item.label }}
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </template>
            <el-select
              v-else-if="property.type === 'VARIABLE_SELECT'"
              :model-value="selectedNode.config[property.key]"
              filterable
              placeholder="请选择字段"
              style="width: 100%"
              @update:model-value="updateNodeProperty(property.key, $event)"
            >
              <el-option v-for="item in variableOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
            <el-select
              v-else-if="property.type === 'CUSTOM_VARIABLE_SELECT'"
              :model-value="selectedNode.config[property.key]"
              :disabled="!customVariableOptions.length"
              placeholder="请选择已创建的流程信息"
              style="width: 100%"
              @update:model-value="updateNodeProperty(property.key, $event)"
            >
              <el-option v-for="item in customVariableOptions" :key="item.value" :label="item.label" :value="item.value">
                <span>{{ item.label }}</span
                ><span v-if="item.description" class="option-extra">{{ item.description }}</span>
              </el-option>
            </el-select>
            <el-button
              v-if="property.type === 'CUSTOM_VARIABLE_SELECT'"
              class="variable-manage-button"
              link
              type="primary"
              icon="Plus"
              @click="emit('manageVariables')"
            >
              {{ customVariableOptions.length ? '管理记录内容' : '新建记录内容' }}
            </el-button>
            <template v-else-if="property.type === 'FLOW_VALUE'">
              <el-select
                v-if="selectedCustomVariable?.type === 'BOOLEAN'"
                :model-value="selectedNode.config[property.key]"
                placeholder="请选择"
                style="width: 100%"
                @update:model-value="updateNodeProperty(property.key, $event)"
              >
                <el-option label="是" :value="true" />
                <el-option label="否" :value="false" />
              </el-select>
              <el-input-number
                v-else-if="selectedCustomVariable?.type === 'NUMBER'"
                :model-value="selectedNode.config[property.key]"
                style="width: 100%"
                @update:model-value="updateNodeProperty(property.key, $event)"
              />
              <el-input
                v-else
                :model-value="selectedNode.config[property.key]"
                :placeholder="property.placeholder"
                @update:model-value="updateNodeProperty(property.key, $event)"
              />
              <p v-if="selectedCustomVariable?.description" class="field-help">用途：{{ selectedCustomVariable.description }}</p>
            </template>
            <el-select
              v-else-if="property.type === 'OPERATOR_SELECT'"
              :model-value="selectedNode.config[property.key]"
              placeholder="请选择判断方式"
              style="width: 100%"
              @update:model-value="updateNodeProperty(property.key, $event)"
            >
              <el-option v-for="item in operatorOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
            <el-select
              v-else-if="property.type === 'INTENT_MULTI_SELECT'"
              :model-value="normalizedIntentCodes(selectedNode.config[property.key])"
              multiple
              filterable
              collapse-tags
              collapse-tags-tooltip
              placeholder="请选择已配置的意图"
              style="width: 100%"
              @update:model-value="updateNodeProperty(property.key, $event)"
            >
              <el-option v-for="item in enabledIntentOptions" :key="item.intentCode" :label="item.intentName" :value="item.intentCode">
                <span>{{ item.intentName }}</span
                ><span class="option-extra">{{ item.intentCode }}</span>
              </el-option>
            </el-select>
            <el-select
              v-else-if="property.type === 'SLOT_TARGET_MULTI_SELECT'"
              :model-value="structuredFieldKeys(selectedNode.config[property.key])"
              multiple
              filterable
              collapse-tags
              collapse-tags-tooltip
              placeholder="请选择要从客户回答中提取的字段"
              style="width: 100%"
              @update:model-value="updateStructuredFields(property.key, $event, slotTargetOptions)"
            >
              <el-option v-for="item in slotTargetOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
            <el-select
              v-else-if="property.type === 'CUSTOMER_FIELD_MULTI_SELECT'"
              :model-value="structuredFieldKeys(selectedNode.config[property.key])"
              multiple
              filterable
              collapse-tags
              collapse-tags-tooltip
              placeholder="请选择本节点允许写回的客户字段"
              style="width: 100%"
              @update:model-value="updateStructuredFields(property.key, $event, customerFieldOptions)"
            >
              <el-option v-for="item in customerFieldOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
            <el-select
              v-else-if="property.type === 'QUEUE_SELECT'"
              :model-value="selectedNode.config[property.key]"
              filterable
              placeholder="请选择已配置的队列"
              style="width: 100%"
              @update:model-value="updateNodeProperty(property.key, $event)"
            >
              <el-option v-for="item in queueOptions" :key="item.queueCode" :label="item.queueName" :value="item.queueCode">
                <span>{{ item.queueName }}</span
                ><span class="option-extra">{{ item.queueCode }}</span>
              </el-option>
            </el-select>
            <el-select
              v-else-if="property.type === 'RESULT_SELECT'"
              :model-value="selectedNode.config[property.key]"
              placeholder="请选择外呼结果"
              style="width: 100%"
              @update:model-value="updateNodeProperty(property.key, $event)"
            >
              <el-option v-for="item in outboundResultOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
            <el-input-number
              v-else-if="property.type === 'NUMBER'"
              :model-value="selectedNode.config[property.key]"
              :min="1"
              style="width: 100%"
              @update:model-value="updateNodeProperty(property.key, $event)"
            />
            <el-switch
              v-else
              :model-value="Boolean(selectedNode.config[property.key])"
              @update:model-value="updateNodeProperty(property.key, $event)"
            />
          </el-form-item>
          <el-button v-if="selectedNode.type !== 'START'" type="danger" plain style="width: 100%" @click="removeSelection">删除节点</el-button>
        </el-form>
      </template>
      <template v-else-if="selectedEdge">
        <div class="property-title">连线配置</div>
        <el-form label-position="top">
          <el-form-item v-if="sourceDefinition.type === 'CONDITION'" label="满足条件" required>
            <el-select v-model="selectedEdge.condition" style="width: 100%" placeholder="请选择分支" @change="updateSelectedEdge">
              <el-option label="条件成立" value="TRUE" />
              <el-option label="条件不成立" value="FALSE" />
            </el-select>
          </el-form-item>
          <el-form-item v-else-if="sourceDefinition.type === 'INTENT_ROUTE'" label="识别结果" required>
            <el-select
              v-model="selectedEdge.condition"
              filterable
              style="width: 100%"
              placeholder="请选择意图或兜底分支"
              @change="updateSelectedEdge"
            >
              <el-option v-for="item in sourceIntentOptions" :key="item.value" :label="item.label" :value="item.value" />
              <el-option label="未命中任何意图" value="FALLBACK" />
            </el-select>
          </el-form-item>
          <el-alert v-else type="info" :closable="false" title="这是顺序连线，不需要配置条件。" />
          <p v-if="sourceDefinition.branch" class="muted">同一个判断节点的每个分支只能配置一次。</p>
          <el-button class="mt-4" type="danger" plain style="width: 100%" @click="removeSelection">删除连线</el-button>
        </el-form>
      </template>
      <el-empty v-else description="请选择节点或连线" />
    </aside>
  </div>
</template>

<script setup lang="ts">
import LogicFlow, { RectNode, RectNodeModel } from '@logicflow/core';
import '@logicflow/core/lib/index.css';
import type { AiIntentVO } from '@/api/callcenter/ai-knowledge/types';
import type { CallQueueVO } from '@/api/callcenter/call-queue/types';
import type { FormTemplate } from '@/api/callcenter/form-template/types';
import type { AiWorkflowDefinition, AiWorkflowEdge, AiWorkflowNode } from '@/api/callcenter/ai-workflow/types';
import { aiWorkflowPaletteDefinitions, getAiWorkflowNodeDefinition, type AiWorkflowNodeDefinition } from './nodeRegistry';

const props = withDefaults(
  defineProps<{
    modelValue: AiWorkflowDefinition;
    intentOptions?: AiIntentVO[];
    queueOptions?: CallQueueVO[];
    customerTemplates?: FormTemplate[];
  }>(),
  {
  intentOptions: () => [],
  queueOptions: () => [],
  customerTemplates: () => []
  }
);
const emit = defineEmits<{
  (e: 'update:modelValue', value: AiWorkflowDefinition): void;
  (e: 'manageVariables'): void;
}>();
const containerRef = ref<HTMLElement>();
const selectedNode = ref<AiWorkflowNode>();
const selectedEdge = ref<AiWorkflowEdge>();
let lf: LogicFlow | undefined;

class WorkflowCardModel extends RectNodeModel {
  setAttributes() {
    this.width = 164;
    this.height = 72;
    this.radius = 9;
    this.sourceRules.push({
      message: '终止节点不能连接后续节点',
      validate: () => !getAiWorkflowNodeDefinition(String(this.properties.workflowType)).terminal
    });
    this.targetRules.push({ message: '开始节点不能作为连线目标', validate: () => this.properties.workflowType !== 'START' });
  }
  getNodeStyle() {
    const style = super.getNodeStyle();
    style.stroke = String(this.properties.color || '#0f4c81');
    style.strokeWidth = 2;
    style.fill = '#ffffff';
    return style;
  }
}

const selectedDefinition = computed(() => getAiWorkflowNodeDefinition(selectedNode.value?.type || 'START'));
const builtInVariableOptions = [
  { label: '客户姓名', value: 'customer.name' },
  { label: '客户称呼（自动生成张先生/女士）', value: 'customer.salutation' },
  { label: '客户手机号', value: 'customer.phone' },
  { label: '客户性别（男/女）', value: 'customer.gender' },
  { label: '是否查询到客户', value: 'customer.found' },
  { label: '是否提取到信息', value: 'slot.extracted' },
  { label: '本次提取字段数', value: 'slot.extractedCount' },
  { label: '是否已更新客户', value: 'customer.updated' },
  { label: '当前客户回答', value: 'conversation.currentInput' },
  { label: '当前识别意图', value: 'conversation.intentCode' },
  { label: '外呼任务名称', value: 'task.name' },
  { label: '企业名称', value: 'task.companyName' },
  { label: '产品名称', value: 'task.productName' },
  { label: '连续未命中次数', value: 'workflow.clarifyCount' },
  { label: '知识库是否命中', value: 'knowledge.hit' },
  { label: '是否使用模型兜底', value: 'knowledge.fallback' },
  { label: '知识库回答来源', value: 'knowledge.source' },
  { label: '知识库命中数量', value: 'knowledge.hitCount' },
  { label: '知识库命中分数', value: 'knowledge.score' },
  { label: '知识库命中阈值', value: 'knowledge.threshold' },
  { label: '知识库未命中原因', value: 'knowledge.reason' },
  { label: 'FAQ 最高分', value: 'knowledge.bestFaqScore' },
  { label: '文档最高分', value: 'knowledge.bestDocumentScore' }
];
const operatorOptions = [
  { label: '等于', value: 'EQ' },
  { label: '不等于', value: 'NE' },
  { label: '包含', value: 'CONTAINS' },
  { label: '不包含', value: 'NOT_CONTAINS' },
  { label: '大于', value: 'GT' },
  { label: '大于等于', value: 'GE' },
  { label: '小于', value: 'LT' },
  { label: '小于等于', value: 'LE' },
  { label: '为空', value: 'EMPTY' },
  { label: '不为空', value: 'NOT_EMPTY' }
];
const outboundResultOptions = [
  { label: '有意向', value: 'INTERESTED' },
  { label: '无意向', value: 'NOT_INTERESTED' },
  { label: '要求回访', value: 'CALLBACK_REQUESTED' },
  { label: '已转人工', value: 'TRANSFERRED' },
  { label: '客户无输入', value: 'NO_INPUT' },
  { label: '无法识别', value: 'ASR_UNRECOGNIZED' },
  { label: '拒绝联系', value: 'DO_NOT_CALL' },
  { label: '待人工确认', value: 'PENDING_REVIEW' },
  { label: '编排执行失败', value: 'WORKFLOW_FAILED' }
];
const advancedNodeTypes = ['SET_VARIABLE', 'CUSTOMER_QUERY', 'SLOT_EXTRACT', 'CUSTOMER_UPDATE'];
const commonPaletteDefinitions = aiWorkflowPaletteDefinitions.filter((item) => !advancedNodeTypes.includes(item.type));
const advancedPaletteDefinitions = aiWorkflowPaletteDefinitions.filter((item) => advancedNodeTypes.includes(item.type));
const customVariableOptions = computed(() =>
  (props.modelValue.variables || [])
    .filter((item) => item.key)
    .map((item) => ({
      label: String(item.label || '未命名流程信息'),
      value: String(item.key),
      type: String(item.type || 'STRING'),
      description: String(item.description || '')
    }))
);
const variableOptions = computed(() => {
  const custom = (props.modelValue.variables || [])
    .filter((item) => item.key)
    .map((item) => ({ label: item.label ? `${item.label}（自定义）` : `${item.key}（自定义）`, value: String(item.key) }));
  return [...builtInVariableOptions, ...custom.filter((item) => !builtInVariableOptions.some((builtIn) => builtIn.value === item.value))];
});
interface StructuredFieldOption {
  label: string;
  value: string;
  type: string;
}
const customerFieldOptions = computed<StructuredFieldOption[]>(() => {
  const result: StructuredFieldOption[] = [{ label: '客户姓名', value: 'customer.name', type: 'STRING' }];
  const used = new Set(result.map((item) => item.value));
  props.customerTemplates.forEach((template) =>
    (template.fields || [])
      .filter((field) => field.fieldType !== 'FILE')
      .forEach((field) => {
        const value = `customer.custom.${field.fieldCode}`;
        if (used.has(value)) return;
        used.add(value);
        result.push({ label: `${template.templateName} / ${field.fieldName}`, value, type: field.fieldType === 'NUMBER' ? 'NUMBER' : 'STRING' });
      })
  );
  return result;
});
const slotTargetOptions = computed<StructuredFieldOption[]>(() => {
  const workflowVariables = customVariableOptions.value.map((item) => ({ label: `流程信息 / ${item.label}`, value: item.value, type: item.type }));
  return [
    ...workflowVariables,
    ...customerFieldOptions.value,
    { label: '客户性别', value: 'customer.gender', type: 'STRING' }
  ];
});
const enabledIntentOptions = computed(() => props.intentOptions.filter((item) => item.enabled !== false));
const comparisonOptions = computed(() => {
  const variable = selectedNode.value?.config?.variable;
  const customVariable = customVariableOptions.value.find((item) => item.value === variable);
  if (
    customVariable?.type === 'BOOLEAN' ||
    ['knowledge.hit', 'knowledge.fallback', 'customer.found', 'slot.extracted', 'customer.updated'].includes(String(variable))
  ) {
    return [
      { label: '是', value: 'true' },
      { label: '否', value: 'false' }
    ];
  }
  if (variable === 'customer.gender') {
    return [
      { label: '男', value: 'MALE' },
      { label: '女', value: 'FEMALE' },
      { label: '未知', value: 'UNKNOWN' }
    ];
  }
  if (variable === 'conversation.intentCode') {
    return enabledIntentOptions.value.map((item) => ({ label: item.intentName, value: item.intentCode }));
  }
  return [];
});
const selectedCustomVariable = computed(() => customVariableOptions.value.find((item) => item.value === selectedNode.value?.config?.key));
const incomingBranchLabels = computed(() => {
  if (!selectedNode.value) return [];
  return readGraph()
    .edges.filter((edge) => edge.target === selectedNode.value?.id)
    .map((edge) => branchLabel(edge.source, edge.condition))
    .filter(Boolean);
});
const outboundWritebackHint = computed(() =>
  incomingBranchLabels.value.length
    ? `当前来自“${incomingBranchLabels.value.join(' / ')}”分支，请选择该分支已经确认的外呼结果。`
    : '请把本节点连接在结果已经明确的意图或条件分支后；不能确定时选择“待人工确认”。'
);
const sourceDefinition = computed(() => {
  const source = readGraph().nodes.find((node) => node.id === selectedEdge.value?.source);
  return getAiWorkflowNodeDefinition(source?.type || 'START');
});
const sourceNode = computed(() => readGraph().nodes.find((node) => node.id === selectedEdge.value?.source));
const sourceIntentOptions = computed(() =>
  normalizedIntentCodes(sourceNode.value?.config?.intentCodes).map((code) => ({
    value: code,
    label: props.intentOptions.find((item) => item.intentCode === code)?.intentName || code
  }))
);
const normalizedIntentCodes = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string')
    return value
      .split(/[\r\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  return [];
};
const structuredFieldKeys = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((item) => (typeof item === 'string' ? item : String(item?.key || ''))).filter(Boolean) : [];
const updateStructuredFields = (key: string, values: string[], options: StructuredFieldOption[]) => {
  const optionMap = new Map(options.map((item) => [item.value, item]));
  updateNodeProperty(
    key,
    values.map((value) => {
      const option = optionMap.get(value);
      return { key: value, label: option?.label || value, type: option?.type || 'STRING' };
    })
  );
};
const branchLabel = (sourceId: string, condition?: string) => {
  if (!condition) return '';
  const source = props.modelValue.nodes.find((node) => node.id === sourceId) || readGraph().nodes.find((node) => node.id === sourceId);
  if (source?.type === 'CONDITION') return condition === 'TRUE' ? '条件成立' : condition === 'FALSE' ? '条件不成立' : condition;
  if (source?.type === 'INTENT_ROUTE') {
    if (condition === 'FALLBACK') return '未命中意图';
    return props.intentOptions.find((item) => item.intentCode === condition)?.intentName || condition;
  }
  return condition;
};
const toLogicFlowData = (graph: AiWorkflowDefinition) => ({
  nodes: graph.nodes.map((node) => {
    const definition = getAiWorkflowNodeDefinition(node.type);
    return {
      id: node.id,
      type: 'ai-workflow-card',
      x: node.x,
      y: node.y,
      text: node.name,
      properties: { workflowType: node.type, name: node.name, config: node.config, color: definition.color }
    };
  }),
  edges: graph.edges.map((edge) => ({
    id: edge.id,
    type: 'bezier',
    sourceNodeId: edge.source,
    targetNodeId: edge.target,
    text: branchLabel(edge.source, edge.condition),
    properties: { condition: edge.condition || '' }
  }))
});
const readGraph = (): AiWorkflowDefinition => {
  const raw = lf?.getGraphRawData();
  if (!raw) return props.modelValue;
  return {
    schemaVersion: props.modelValue.schemaVersion || '1.0',
    variables: props.modelValue.variables || [],
    nodes: raw.nodes.map((node: any) => ({
      id: node.id,
      type: node.properties.workflowType,
      name: node.properties.name || node.text?.value || node.text,
      x: node.x,
      y: node.y,
      config: node.properties.config || {}
    })),
    edges: raw.edges.map((edge: any) => ({
      id: edge.id,
      source: edge.sourceNodeId || edge.sourceNode?.id || edge.source,
      target: edge.targetNodeId || edge.targetNode?.id || edge.target,
      condition: edge.properties?.condition || edge.text?.value || edge.text || ''
    }))
  };
};
const syncGraph = () => emit('update:modelValue', readGraph());
const selectNode = (id: string) => {
  const node = readGraph().nodes.find((item) => item.id === id);
  selectedNode.value = node ? reactive(node) : undefined;
  selectedEdge.value = undefined;
};
const selectEdge = (data: any) => {
  const edge = readGraph().edges.find((item) => item.id === data.id);
  selectedEdge.value = reactive(edge || { id: data.id, source: data.sourceNodeId, target: data.targetNodeId, condition: '' });
  selectedNode.value = undefined;
};
const updateSelectedNode = () => {
  if (!lf || !selectedNode.value) return;
  const definition = getAiWorkflowNodeDefinition(selectedNode.value.type);
  lf.updateText(selectedNode.value.id, selectedNode.value.name);
  lf.setProperties(selectedNode.value.id, {
    workflowType: selectedNode.value.type,
    name: selectedNode.value.name,
    config: { ...selectedNode.value.config },
    color: definition.color
  });
  syncGraph();
};
const updateNodeProperty = (key: string, value: unknown) => {
  if (!selectedNode.value) return;
  selectedNode.value.config[key] = value;
  updateSelectedNode();
};
const isPropertyVisible = (key: string) =>
  key !== 'compareValue' || !['EMPTY', 'NOT_EMPTY'].includes(String(selectedNode.value?.config?.operator || ''));
const insertTemplateVariable = (key: string, variable: string) => {
  const current = String(selectedNode.value?.config[key] || '');
  updateNodeProperty(key, `${current}${current && !current.endsWith(' ') ? ' ' : ''}{{${variable}}}`);
};
const updateSelectedEdge = () => {
  if (!lf || !selectedEdge.value) return;
  const condition = selectedEdge.value.condition?.trim() || '';
  lf.updateText(selectedEdge.value.id, branchLabel(selectedEdge.value.source, condition));
  lf.setProperties(selectedEdge.value.id, { condition });
  syncGraph();
};
const removeSelection = () => {
  if (selectedNode.value) lf?.deleteNode(selectedNode.value.id);
  if (selectedEdge.value) lf?.deleteEdge(selectedEdge.value.id);
  selectedNode.value = undefined;
  selectedEdge.value = undefined;
  syncGraph();
};
const startDrag = (definition: AiWorkflowNodeDefinition) => {
  const config = Object.fromEntries(
    definition.properties.filter((item) => item.defaultValue !== undefined).map((item) => [item.key, item.defaultValue])
  );
  lf?.dnd.startDrag({
    type: 'ai-workflow-card',
    text: definition.label,
    properties: { workflowType: definition.type, name: definition.label, config, color: definition.color }
  });
};
const fitCanvas = () => {
  lf?.fitView(40, 40);
  lf?.zoom(0.82);
};
const initialize = async () => {
  await nextTick();
  if (!containerRef.value) return;
  lf = new LogicFlow({
    container: containerRef.value,
    grid: { size: 18, visible: true },
    keyboard: { enabled: true },
    snapline: true,
    history: true,
    textEdit: false,
    edgeType: 'bezier'
  });
  lf.register({ type: 'ai-workflow-card', view: RectNode, model: WorkflowCardModel });
  lf.setTheme({
    bezier: { stroke: '#94a3b8', strokeWidth: 2 },
    anchor: { fill: '#fff', stroke: '#0f4c81', r: 4 },
    edgeText: { color: '#d97706', fontSize: 12, textWidth: 120 }
  });
  lf.on('node:click', ({ data }: any) => selectNode(data.id));
  lf.on('edge:click', ({ data }: any) => selectEdge(data));
  lf.on('blank:click', () => {
    selectedNode.value = undefined;
    selectedEdge.value = undefined;
  });
  lf.on('node:add,node:drop,node:delete,edge:delete', syncGraph);
  lf.on('edge:add', ({ data }: any) => {
    syncGraph();
    selectEdge(data);
  });
  lf.render(toLogicFlowData(props.modelValue));
  fitCanvas();
};
defineExpose({ getGraph: readGraph });
onMounted(initialize);
onBeforeUnmount(() => lf?.destroy());
</script>

<style scoped>
.ai-workflow-designer {
  display: grid;
  grid-template-columns: 230px 1fr 320px;
  height: calc(100vh - 122px);
  user-select: none;
}
.palette,
.properties {
  padding: 16px;
  overflow: auto;
  background: #fff;
}
.palette {
  border-right: 1px solid #e5e7eb;
}
.properties {
  border-left: 1px solid #e5e7eb;
}
.palette-item {
  display: flex;
  gap: 10px;
  padding: 11px;
  margin-bottom: 9px;
  border: 1px solid #dce3ec;
  border-radius: 8px;
  cursor: grab;
}
.palette-item:hover {
  border-color: #2563eb;
  box-shadow: 0 3px 10px rgb(37 99 235 / 10%);
}
.node-dot {
  flex: none;
  width: 10px;
  height: 10px;
  margin-top: 5px;
  border-radius: 50%;
}
.palette-label {
  color: #1f2937;
  font-weight: 600;
}
.palette-section-title {
  margin: 16px 0 8px;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
}
.muted {
  margin-top: 4px;
  color: #8492a6;
  font-size: 12px;
  line-height: 1.5;
}
.canvas-wrap {
  min-width: 0;
  background: #f5f7fa;
}
.canvas-toolbar {
  height: 48px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 12px;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
}
.logicflow-canvas {
  height: calc(100% - 48px);
}
.property-title {
  margin-bottom: 14px;
  color: #1f2937;
  font-size: 16px;
  font-weight: 700;
}
.property-description {
  margin-bottom: 16px;
}
.property-alert {
  margin-bottom: 14px;
}
.field-help {
  margin: 6px 0 0;
  color: #8492a6;
  font-size: 12px;
}
.properties :deep(input),
.properties :deep(textarea) {
  user-select: text;
}
.variable-insert {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  color: #8492a6;
  font-size: 12px;
}
.variable-manage-button {
  margin-top: 6px;
  font-size: 12px;
}
.option-extra {
  float: right;
  margin-left: 18px;
  color: #94a3b8;
  font-size: 12px;
}
</style>
