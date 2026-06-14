<template>
  <div class="ivr-designer" :class="{ 'is-readonly': readonly }">
    <aside v-if="!readonly" class="palette">
      <h4>流程节点</h4>
      <div v-for="item in ivrPaletteDefinitions" :key="item.type" class="palette-item" @mousedown="startDrag(item)">
        <span class="node-dot" :style="{ background: item.color }" />
        <div>
          <div class="palette-label">{{ item.label }}</div>
          <div class="palette-description">{{ item.description }}</div>
        </div>
      </div>
      <el-alert class="mt-4" type="info" :closable="false" title="拖入节点后，从节点锚点拖出连线。按键菜单的连线需要配置按键。" />
    </aside>

    <main class="canvas-wrap">
      <div class="canvas-toolbar">
        <el-button-group>
          <el-button icon="Back" title="撤销" @click="lf?.undo()" />
          <el-button icon="Right" title="重做" @click="lf?.redo()" />
          <el-button icon="ZoomIn" title="放大" @click="lf?.zoom(true)" />
          <el-button icon="ZoomOut" title="缩小" @click="lf?.zoom(false)" />
          <el-button icon="FullScreen" title="适应画布" @click="lf?.fitView(40, 40)" />
        </el-button-group>
        <span class="toolbar-tip">点击节点或连线编辑属性，选中后按 Delete 可删除</span>
      </div>
      <div ref="containerRef" class="logicflow-canvas" />
    </main>

    <aside v-if="!readonly" class="properties">
      <template v-if="selectedNode">
        <div class="property-title">节点配置</div>
        <el-tag :color="selectedDefinition.color" effect="dark">{{ selectedDefinition.label }}</el-tag>
        <p class="property-description">{{ selectedDefinition.description }}</p>
        <el-form label-position="top">
          <el-form-item label="节点名称">
            <el-input v-model="selectedNode.name" @input="updateSelectedNode" />
          </el-form-item>
          <el-form-item
            v-for="property in selectedDefinition.propertySchema"
            :key="property.key"
            :label="property.label"
            :required="property.required"
          >
            <component
              :is="getIvrPropertyEditor(property.component)"
              v-if="getIvrPropertyEditor(property.component)"
              :model-value="selectedNode.config[property.key]"
              :media-options="mediaOptions"
              :queue-options="queueOptions"
              :placeholder="property.placeholder"
              @update:model-value="updateNodeProperty(property.key, $event)"
            />
            <el-alert v-else type="error" :closable="false" :title="`未注册的属性编辑器：${property.component}`" />
          </el-form-item>
          <el-button v-if="selectedNode.type !== 'START'" type="danger" plain style="width: 100%" @click="removeSelection">删除节点</el-button>
        </el-form>
      </template>
      <template v-else-if="selectedEdge">
        <div class="property-title">连线配置</div>
        <el-form label-position="top">
          <el-form-item v-if="sourceDefinition.edgeSchema" :label="sourceDefinition.edgeSchema.label">
            <el-input
              v-model="selectedEdge.condition"
              maxlength="1"
              :placeholder="sourceDefinition.edgeSchema.placeholder"
              @input="updateSelectedEdge"
            />
          </el-form-item>
          <el-alert v-else type="info" :closable="false" title="普通节点连线不需要配置条件。" />
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
import { IvrEdge, IvrGraph, IvrNode, IvrNodeType } from '@/api/callcenter/ivr-flow/types';
import { MediaAssetVO } from '@/api/callcenter/media-asset/types';
import { CallQueueVO } from '@/api/callcenter/call-queue/types';
import { getIvrNodeDefinition, IvrNodeDefinition, ivrPaletteDefinitions } from './nodeRegistry';
import { getIvrPropertyEditor } from './propertyEditors';

const props = withDefaults(
  defineProps<{ modelValue: IvrGraph; mediaOptions: MediaAssetVO[]; queueOptions?: CallQueueVO[]; readonly?: boolean }>(),
  {
    queueOptions: () => [],
    readonly: false
  }
);
const emit = defineEmits<{ (e: 'update:modelValue', value: IvrGraph): void }>();
const containerRef = ref<HTMLElement>();
const selectedNode = ref<IvrNode>();
const selectedEdge = ref<IvrEdge>();
let lf: LogicFlow | undefined;

class IvrCardModel extends RectNodeModel {
  setAttributes() {
    this.width = 156;
    this.height = 74;
    this.radius = 8;
    this.sourceRules.push({
      message: '转接分机、转接队列和挂断节点不能连接下一节点',
      validate: () => !getIvrNodeDefinition(this.properties.ivrType as IvrNodeType).terminal
    });
    this.targetRules.push({
      message: '开始节点不能作为连线目标',
      validate: () => this.properties.ivrType !== 'START'
    });
  }
  getNodeStyle() {
    const style = super.getNodeStyle();
    const color = String(this.properties.color || '#053b70');
    style.stroke = color;
    style.strokeWidth = 2;
    style.fill = '#ffffff';
    return style;
  }
  getTextStyle() {
    const style = super.getTextStyle();
    style.color = '#303133';
    style.fontSize = 14;
    return style;
  }
}

const selectedDefinition = computed(() => getIvrNodeDefinition(selectedNode.value?.type || 'START'));
const sourceDefinition = computed(() => {
  const source = props.modelValue.nodes.find((node) => node.id === selectedEdge.value?.source);
  return getIvrNodeDefinition(source?.type || 'START');
});

const toLogicFlowData = (graph: IvrGraph) => ({
  nodes: graph.nodes.map((node) => {
    const definition = getIvrNodeDefinition(node.type);
    return {
      id: node.id,
      type: 'ivr-card',
      x: node.x,
      y: node.y,
      text: node.name,
      properties: { ivrType: node.type, name: node.name, config: node.config, color: definition.color }
    };
  }),
  edges: graph.edges.map((edge) => ({
    id: edge.id,
    type: 'polyline',
    sourceNodeId: edge.source,
    targetNodeId: edge.target,
    text: edge.condition || '',
    properties: { condition: edge.condition || '' }
  }))
});

const readGraph = (): IvrGraph => {
  const raw = lf?.getGraphRawData();
  if (!raw) return props.modelValue;
  return {
    nodes: raw.nodes.map((node: any) => ({
      id: node.id,
      type: node.properties.ivrType as IvrNodeType,
      name: node.properties.name || node.text?.value || node.text || getIvrNodeDefinition(node.properties.ivrType).label,
      x: node.x,
      y: node.y,
      config: node.properties.config || {}
    })),
    edges: raw.edges.map((edge: any) => ({
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
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
const selectEdge = (id: string) => {
  const edge = readGraph().edges.find((item) => item.id === id);
  selectedEdge.value = edge ? reactive(edge) : undefined;
  selectedNode.value = undefined;
};
const updateSelectedNode = () => {
  if (!lf || !selectedNode.value) return;
  const definition = getIvrNodeDefinition(selectedNode.value.type);
  lf.updateText(selectedNode.value.id, selectedNode.value.name);
  lf.setProperties(selectedNode.value.id, {
    ivrType: selectedNode.value.type,
    name: selectedNode.value.name,
    config: { ...selectedNode.value.config },
    color: definition.color
  });
  syncGraph();
};
const updateNodeProperty = (key: string, value: string | number) => {
  if (!selectedNode.value) return;
  selectedNode.value.config[key] = value;
  updateSelectedNode();
};
const updateSelectedEdge = () => {
  if (!lf || !selectedEdge.value) return;
  lf.updateText(selectedEdge.value.id, selectedEdge.value.condition || '');
  lf.setProperties(selectedEdge.value.id, { condition: selectedEdge.value.condition || '' });
  syncGraph();
};
const removeSelection = () => {
  if (!lf) return;
  if (selectedNode.value) lf.deleteNode(selectedNode.value.id);
  if (selectedEdge.value) lf.deleteEdge(selectedEdge.value.id);
  selectedNode.value = undefined;
  selectedEdge.value = undefined;
  syncGraph();
};
const startDrag = (definition: IvrNodeDefinition) => {
  if (props.readonly) return;
  lf?.dnd.startDrag({
    type: 'ivr-card',
    text: definition.label,
    properties: { ivrType: definition.type, name: definition.label, config: {}, color: definition.color }
  });
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
    edgeType: 'polyline',
    stopScrollGraph: false,
    stopZoomGraph: false,
    stopMoveGraph: false
  });
  if (props.readonly) {
    lf.updateEditConfig({ isSilentMode: true });
  }
  lf.register({ type: 'ivr-card', view: RectNode, model: IvrCardModel });
  lf.setTheme({
    polyline: { stroke: '#91a4bd', strokeWidth: 2 },
    anchor: { fill: '#ffffff', stroke: '#053b70', r: 4 },
    nodeText: { color: '#303133', fontSize: 14 },
    edgeText: { color: '#e6a23c', fontSize: 13 }
  });
  lf.on('node:click', ({ data }: any) => selectNode(data.id));
  lf.on('edge:click', ({ data }: any) => selectEdge(data.id));
  lf.on('blank:click', () => {
    selectedNode.value = undefined;
    selectedEdge.value = undefined;
  });
  lf.on('node:delete', () => {
    selectedNode.value = undefined;
    syncGraph();
  });
  lf.on('edge:delete', () => {
    selectedEdge.value = undefined;
    syncGraph();
  });
  lf.on('node:add,node:drop,edge:add', syncGraph);
  lf.render(toLogicFlowData(props.modelValue));
  lf.fitView(40, 40);
};
const getGraph = () => readGraph();
defineExpose({ getGraph });
onMounted(initialize);
onBeforeUnmount(() => lf?.destroy());
</script>

<style scoped>
.ivr-designer {
  display: grid;
  grid-template-columns: 230px 1fr 320px;
  height: calc(100vh - 120px);
  user-select: none;
  -webkit-user-select: none;
}
.ivr-designer.is-readonly {
  grid-template-columns: 1fr;
}
.palette,
.properties {
  padding: 16px;
  background: #fff;
  overflow: auto;
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
  align-items: flex-start;
  padding: 12px;
  margin-bottom: 10px;
  border: 1px solid #dcdfe6;
  border-radius: 7px;
  cursor: grab;
}
.palette-item:active {
  cursor: grabbing;
}
.palette-item:hover {
  border-color: #053b70;
  box-shadow: 0 3px 10px rgb(5 59 112 / 10%);
}
.node-dot {
  flex: none;
  width: 10px;
  height: 10px;
  margin-top: 5px;
  border-radius: 50%;
}
.palette-label {
  font-weight: 600;
  color: #303133;
}
.palette-description,
.property-description,
.toolbar-tip {
  margin-top: 4px;
  color: #909399;
  font-size: 12px;
}
.canvas-wrap {
  position: relative;
  min-width: 0;
  background: #f6f8fb;
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
  font-size: 16px;
  font-weight: 700;
}
.properties :deep(input),
.properties :deep(textarea) {
  user-select: text;
  -webkit-user-select: text;
}
</style>
