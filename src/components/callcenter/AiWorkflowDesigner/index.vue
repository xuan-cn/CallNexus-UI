<template>
  <div class="ai-workflow-designer" :class="{ 'is-tree-view': viewMode === 'tree' }">
    <aside v-show="viewMode === 'canvas'" class="palette">
      <h4>编排节点</h4>
      <el-tooltip v-for="item in commonPaletteDefinitions" :key="item.type" :content="`${item.label}：${item.description}`" placement="right" :show-after="300">
        <button type="button" class="palette-item" :aria-label="`${item.label}：${item.description}`" @mousedown.left="startDrag(item)">
          <span class="node-dot" :style="{ background: item.color }" />
          <span class="palette-label">{{ item.label }}</span>
        </button>
      </el-tooltip>
      <div class="palette-section-title">高级节点</div>
      <el-tooltip v-for="item in advancedPaletteDefinitions" :key="item.type" :content="`${item.label}：${item.description}`" placement="right" :show-after="300">
        <button type="button" class="palette-item" :aria-label="`${item.label}：${item.description}`" @mousedown.left="startDrag(item)">
          <span class="node-dot" :style="{ background: item.color }" />
          <span class="palette-label">{{ item.label }}</span>
        </button>
      </el-tooltip>
      <el-alert type="info" :closable="false" title="拖入节点并连线。节点和分支均通过中文选项配置，无需填写技术编码。" />
    </aside>

    <main class="canvas-wrap">
      <div class="canvas-toolbar">
        <el-radio-group v-model="viewMode" size="small" @change="changeView"
          ><el-radio-button value="canvas">连线</el-radio-button><el-radio-button value="tree">树状</el-radio-button></el-radio-group
        >
        <el-button-group v-show="viewMode === 'canvas'">
          <el-button icon="Back" title="撤销" @click="lf?.undo()" />
          <el-button icon="Right" title="重做" @click="lf?.redo()" />
          <el-button icon="ZoomIn" title="放大" @click="lf?.zoom(true)" />
          <el-button icon="ZoomOut" title="缩小" @click="lf?.zoom(false)" />
          <el-button icon="FullScreen" title="适应画布" @click="fitCanvas" />
          <el-button icon="Rank" title="从上到下整理布局" @click="organizeLayout">整理</el-button>
        </el-button-group>
        <el-select v-model="navigationNode" class="node-navigation" filterable clearable placeholder="搜索节点名称 / 类型" @change="navigateToNode">
          <el-option
            v-for="node in modelValue.nodes"
            :key="node.id"
            :value="node.id"
            :label="`${node.name} · ${getAiWorkflowNodeDefinition(node.type).label}`"
            ><span>{{ node.name }}</span
            ><small class="navigation-id">{{ node.id.slice(-8) }}</small></el-option
          >
        </el-select>
        <el-button v-if="viewMode === 'canvas'" :disabled="!selectedNode" @click="foldSelectedBranch">折叠下游</el-button>
        <el-button v-if="viewMode === 'canvas'" :disabled="!hiddenNodeIds.size" @click="restoreBranchView"
          >展开全部{{ hiddenNodeIds.size ? `（${hiddenNodeIds.size}）` : '' }}</el-button
        >
        <el-tag v-if="foldedRootName" type="info">已收起：{{ foldedRootName }} 的独立下游（仅视图）</el-tag>
        <el-tag v-if="validationMarks.length" type="danger">红色为上次校验错误，修改后请重新校验</el-tag>
      </div>
      <div v-show="viewMode === 'canvas'" ref="containerRef" class="logicflow-canvas" />
      <div v-if="viewMode === 'tree'" ref="treeContainer" class="workflow-tree">
        <el-tree
          ref="treeRef"
          :data="treeEntries"
          node-key="key"
          :indent="22"
          :default-expanded-keys="treeExpandedKeys"
          :current-node-key="selectedNode ? `node:${selectedNode.id}` : undefined"
          highlight-current
          :expand-on-click-node="false"
          @node-click="selectTreeEntry"
          @node-expand="(data) => setTreeExpanded(data.key, true)"
          @node-collapse="(data) => setTreeExpanded(data.key, false)"
        >
          <template #default="{ data, node }">
            <span :data-tree-key="data.key" class="workflow-tree-row" :class="{ 'is-reference': data.reference }">
              <span v-if="data.branch" class="tree-condition" :title="data.branch">{{ data.branch }}</span>
              <button v-if="data.reference" class="tree-reference" :title="data.name" @click.stop="focusNode(data.nodeId)">
                ↪ {{ data.reference === 'cycle' ? '返回' : '转到' }}「{{ data.name }}」
              </button>
              <span v-else class="tree-node-name" :title="data.name">{{ data.name }}</span>
              <small v-if="!data.reference && data.name !== treeNodeType(data.nodeId)" class="tree-node-type">{{ treeNodeType(data.nodeId) }}</small>
              <small v-if="!node.expanded && data.stepCount" class="tree-step-count">{{ data.stepCount }} 个步骤</small>
              <span v-if="validationMarks.some((mark) => mark.nodeId === data.nodeId)" class="tree-error">校验错误</span>
              <span class="tree-actions"
                ><el-button
                  v-if="!data.reference && canAddTreeStep(data.nodeId)"
                  size="small"
                  text
                  aria-label="添加下一步"
                  title="添加下一步"
                  @click.stop="openTreeAdd(data.nodeId)"
                  >＋</el-button
                ></span
              >
            </span>
          </template>
        </el-tree>
      </div>
      <el-dialog v-model="treeAddVisible" title="添加下一步" width="520px" append-to-body>
        <el-form label-position="top">
          <el-form-item label="从哪个出口添加"
            ><el-select v-model="treeAdd.condition"
              ><el-option v-for="outlet in treeAddOutlets" :key="outlet.value" :value="outlet.value" :label="outlet.label" /></el-select
          ></el-form-item>
          <el-radio-group v-model="treeAdd.mode"
            ><el-radio-button value="new">新建节点</el-radio-button><el-radio-button value="existing">连接已有节点</el-radio-button></el-radio-group
          >
          <template v-if="treeAdd.mode === 'new'">
            <el-form-item label="节点类型"
              ><el-select v-model="treeAdd.type" filterable
                ><el-option
                  v-for="item in aiWorkflowNodeDefinitions.filter((item) => item.type !== 'START')"
                  :key="item.type"
                  :label="item.label"
                  :value="item.type" /></el-select
            ></el-form-item>
            <el-form-item label="节点名称"><el-input v-model="treeAdd.name" placeholder="留空使用节点类型名称" /></el-form-item>
            <el-form-item v-if="treeOldTarget && getAiWorkflowNodeDefinition(treeAdd.type).branch" label="原后续连接到新节点的哪个出口"
              ><el-select v-model="treeAdd.onward"
                ><el-option v-for="outlet in treeNewOutlets" :key="outlet.value" :label="outlet.label" :value="outlet.value" /></el-select
            ></el-form-item>
          </template>
          <el-form-item v-else label="已有节点"
            ><el-select v-model="treeAdd.target" filterable
              ><el-option
                v-for="node in modelValue.nodes.filter((node) => node.id !== treeAdd.source && node.type !== 'START')"
                :key="node.id"
                :value="node.id"
                :label="node.name + ' · ' + node.id.slice(-8)" /></el-select
          ></el-form-item>
          <el-alert
            v-if="treeOldTarget"
            :closable="false"
            type="info"
            :title="treeAdd.mode === 'new' ? '新节点插入后保留原后续连接；其他出口不变。' : '将替换此出口的原连接，原节点不会删除。'"
          />
          <el-alert v-if="treeAddError" type="error" :closable="false" :title="treeAddError" />
        </el-form>
        <template #footer
          ><el-button @click="treeAddVisible = false">取消</el-button><el-button type="primary" @click="confirmTreeAdd">确认添加</el-button></template
        >
      </el-dialog>
    </main>

    <aside class="properties">
      <el-alert v-for="message in selectedValidationMessages" :key="message" :title="message" type="error" :closable="false" class="property-alert" />
      <template v-if="selectedNode">
        <div class="property-title">节点配置</div>
        <el-tag :color="selectedDefinition.color" effect="dark">{{ selectedDefinition.label }}</el-tag>
        <p class="muted property-description">{{ selectedDefinition.description }}</p>
        <el-alert
          v-if="selectedNode.config.answerMode === 'MODEL_FALLBACK'"
          type="warning"
          :closable="false"
          class="property-alert"
          title="允许使用知识库之外的模型回答，请在助手中限制回答范围；模型回复不等于业务确认，不会自动推进流程。"
        />
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
          v-if="selectedNode.type === 'LOOP_LIMIT'"
          class="property-alert"
          type="info"
          :closable="false"
          title="每次进入此节点计数一次。继续循环分支可连回等待输入，达到上限分支必须连接挂机、转人工或结束流程。"
        />
        <el-alert
          v-if="selectedNode.type === 'CUSTOMER_UPDATE'"
          class="property-alert"
          type="warning"
          :closable="false"
          title="只会写回这里勾选的字段。手机号和附件不允许由 AI 自动修改。"
        />
        <el-alert
          v-if="selectedNode.type === 'INTENT_ROUTE' && String(selectedNode.config.fallbackMode || 'EDGE') === 'INHERIT'"
          class="property-alert"
          type="info"
          :closable="false"
          title="当前节点继承顶部“公共兜底”配置。需要特殊处理时，可改为其他策略单独覆盖。"
        />
        <el-alert
          v-else-if="selectedNode.type === 'INTENT_ROUTE' && String(selectedNode.config.fallbackMode || 'EDGE') !== 'EDGE'"
          class="property-alert"
          type="info"
          :closable="false"
          title="重新询问由系统在当前节点内完成，不需要画回路线；继续流程只需配置一条统一的“未命中后继续”连线。"
        />
        <el-alert
          v-if="selectedNode.type === 'PLAY_MEDIA'"
          class="property-alert"
          type="info"
          :closable="false"
          title="这里只显示已发布的声音媒体。实际通话节点未同步成功时，流程会停止并记录失败原因。"
        />
        <el-form label-position="top" class="node-identity">
          <el-form-item label="节点名称"><el-input v-model="selectedNode.name" @input="updateSelectedNode" /></el-form-item>
        </el-form>
        <el-tabs v-model="activeNodeSection" class="node-section-tabs">
          <el-tab-pane v-for="section in visibleNodeSections" :key="section.name" :label="section.label" :name="section.name" />
        </el-tabs>
        <ConversationRulesForm
          v-if="selectedNode.config.conversationRuleMode === 'OVERRIDE' && activeNodeSection === 'rules'"
          :key="selectedNode.id"
          :model-value="selectedNode.config.conversationRules || []"
          :intent-options="enabledIntentOptions"
          :queue-options="queueOptions"
          @update:model-value="updateNodeProperty('conversationRules', $event)"
        />
        <el-form label-position="top">
          <template v-if="selectedNode.type === 'DIALOGUE_STEP'">
            <div v-show="activeNodeSection === 'answers'">
              <el-form-item label="业务答案选项（可选，配置后替代确认完成出口）">
                <div style="width: 100%">
                  <div v-for="(option, index) in selectedNode.config.answerOptions || []" :key="index" class="dialogue-answer-option">
                    <el-input v-model="option.label" aria-label="选项名称" placeholder="选项名称，如 本人" @change="updateSelectedNode" />
                    <AnswerMatchFields
                      :model-value="option"
                      :intent-options="enabledIntentOptions"
                      @change="(key, value) => updateDialogueMatch(option, key, value)"
                    />
                    <el-button class="remove-answer-option" text type="danger" @click="removeDialogueOption(index)">删除选项</el-button>
                  </div>
                  <el-button :disabled="(selectedNode.config.answerOptions || []).length >= 10" @click="addDialogueOption">添加业务选项</el-button>
                </div>
              </el-form-item>
            </div>
            <el-form-item
              v-for="outlet in dialogueOutlets"
              v-show="activeNodeSection === 'routing'"
              :key="outlet.value"
              :label="outlet.label + '后进入'"
              required
            >
              <el-select
                :model-value="dialogueTarget(outlet.value)"
                clearable
                filterable
                style="width: 100%"
                placeholder="选择已有节点，自动生成连线"
                @change="setDialogueTarget(outlet.value, $event)"
              >
                <el-option
                  v-for="target in modelValue.nodes.filter((node) => node.type !== 'START' && node.id !== selectedNode?.id)"
                  :key="target.id"
                  :label="target.name"
                  :value="target.id"
                />
              </el-select>
            </el-form-item>
          </template>
          <el-form-item
            v-for="property in selectedDefinition.properties"
            v-show="isPropertyVisible(property.key) && propertySection(property.key) === activeNodeSection"
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
              v-else-if="property.type === 'OPTIONS_SELECT'"
              :model-value="
                selectedNode.config[property.key] ??
                (property.key === 'answerMode' && selectedNode.type === 'DIALOGUE_STEP' && selectedNode.config.knowledgeQuestionsEnabled
                  ? 'KNOWLEDGE_ONLY'
                  : property.defaultValue)
              "
              style="width: 100%"
              @update:model-value="updateNodeProperty(property.key, $event)"
            >
              <el-option v-for="item in property.options || []" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
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
            <template v-else-if="property.type === 'CUSTOM_VARIABLE_SELECT'">
              <el-select
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
              <el-button class="variable-manage-button" link type="primary" icon="Plus" @click="emit('manageVariables')">
                {{ customVariableOptions.length ? '管理记录内容' : '新建记录内容' }}
              </el-button>
            </template>
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
              @update:model-value="updateStructuredFields(property.key, $event, fieldOptions(property.key))"
            >
              <el-option v-for="item in fieldOptions(property.key)" :key="item.value" :label="item.label" :value="item.value" />
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
              v-else-if="property.type === 'MEDIA_SELECT'"
              :model-value="selectedNode.config[property.key]"
              filterable
              placeholder="请选择已发布的声音媒体"
              style="width: 100%"
              @update:model-value="updateNodeProperty(property.key, $event)"
            >
              <el-option v-for="item in mediaOptions" :key="item.id" :label="item.assetName" :value="String(item.id)">
                <span>{{ item.assetName }}</span
                ><span class="option-extra">{{ mediaOptionExtra(item) }}</span>
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
              :min="property.min ?? 1"
              :max="property.max"
              style="width: 100%"
              @update:model-value="updateNodeProperty(property.key, $event)"
            />
            <el-switch
              v-else-if="property.type === 'SWITCH'"
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
          <el-form-item v-if="sourceDefinition.type === 'DIALOGUE_STEP'" label="步骤结果" required>
            <el-select v-model="selectedEdge.condition" style="width: 100%" @change="updateSelectedEdge">
              <el-option v-for="outlet in dialogueOutletsFor(sourceNode)" :key="outlet.value" :label="outlet.label" :value="outlet.value" />
            </el-select>
          </el-form-item>
          <el-form-item v-else-if="sourceDefinition.type === 'CONDITION'" label="满足条件" required>
            <el-select v-model="selectedEdge.condition" style="width: 100%" placeholder="请选择分支" @change="updateSelectedEdge">
              <el-option label="条件成立" value="TRUE" />
              <el-option label="条件不成立" value="FALSE" />
            </el-select>
          </el-form-item>
          <el-form-item v-else-if="sourceDefinition.type === 'LOOP_LIMIT'" label="次数结果" required>
            <el-select v-model="selectedEdge.condition" style="width: 100%" placeholder="请选择分支" @change="updateSelectedEdge">
              <el-option label="继续循环" value="CONTINUE" />
              <el-option label="达到上限" value="LIMIT" />
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
              <el-option v-if="sourceFallbackBranches.includes('FALLBACK')" label="未命中任何意图" value="FALLBACK" />
              <el-option v-if="sourceFallbackBranches.includes('CONTINUE')" label="未命中后继续" value="CONTINUE" />
            </el-select>
          </el-form-item>
          <el-alert v-else type="info" :closable="false" title="这是顺序连线，不需要配置条件。" />
          <p v-if="sourceDefinition.branch" class="muted app-hint">同一个判断节点的每个分支只能配置一次。</p>
          <el-button class="mt-4" type="danger" plain style="width: 100%" @click="removeSelection">删除连线</el-button>
        </el-form>
      </template>
      <el-empty v-else description="请选择节点或连线" />
    </aside>
  </div>
</template>

<script setup lang="ts">
import LogicFlow, { RectNode, RectNodeModel, BezierEdge, BezierEdgeModel } from '@logicflow/core';
import '@logicflow/core/lib/index.css';
import type { AiIntentVO } from '@/api/callcenter/ai-knowledge/types';
import type { CallQueueVO } from '@/api/callcenter/call-queue/types';
import type { FormTemplate } from '@/api/callcenter/form-template/types';
import type { AiWorkflowMediaOptionVO } from '@/api/callcenter/ai-workflow/types';
import type { AiWorkflowDefinition, AiWorkflowEdge, AiWorkflowNode } from '@/api/callcenter/ai-workflow/types';
import { createLayeredFlowLayout } from '@/utils/logicflowLayout';
import { aiWorkflowNodeDefinitions, aiWorkflowPaletteDefinitions, getAiWorkflowNodeDefinition, type AiWorkflowNodeDefinition } from './nodeRegistry';
import { withGraphContent } from './graphContent';
import ConversationRulesForm from './ConversationRulesForm.vue';
import { propertySection, propertySections } from './propertySections';
import AnswerMatchFields from './AnswerMatchFields.vue';
import { createAnswerOptionCode, fillMissingAnswerOptionCodes } from './answerOptionCodes';
import { foldableNodeIds } from './branchVisibility';
import { buildWorkflowTree, initialTreeExpandedKeys, type WorkflowTreeEntry } from './workflowTree';
import { connectTreeStep } from './treeEditing';

const props = withDefaults(
  defineProps<{
    modelValue: AiWorkflowDefinition;
    intentOptions?: AiIntentVO[];
    queueOptions?: CallQueueVO[];
    customerTemplates?: FormTemplate[];
    mediaOptions?: AiWorkflowMediaOptionVO[];
  }>(),
  {
    intentOptions: () => [],
    queueOptions: () => [],
    customerTemplates: () => [],
    mediaOptions: () => []
  }
);
const emit = defineEmits<{
  (e: 'update:modelValue', value: AiWorkflowDefinition): void;
  (e: 'manageVariables'): void;
}>();
const containerRef = ref<HTMLElement>();
const selectedNode = ref<AiWorkflowNode>();
const activeNodeSection = ref('basic');
const navigationNode = ref<string>();
const treeAddVisible = ref(false);
const treeAddError = ref('');
const treeAdd = reactive({ source: '', condition: '', mode: 'new', type: 'TEMPLATE_REPLY', name: '', target: '', onward: '' });
const canAddTreeStep = (id: string) => {
  const node = props.modelValue.nodes.find((node) => node.id === id);
  return node && !getAiWorkflowNodeDefinition(node.type).terminal;
};
const treeOutlets = (node?: AiWorkflowNode): Array<{ value: string; label: string }> => {
  if (!node) return [];
  if (node.type === 'DIALOGUE_STEP') return dialogueOutletsFor(node);
  if (node.type === 'CONDITION')
    return [
      { value: 'TRUE', label: '条件成立' },
      { value: 'FALSE', label: '条件不成立' }
    ];
  if (node.type === 'LOOP_LIMIT')
    return [
      { value: 'CONTINUE', label: '继续循环' },
      { value: 'LIMIT', label: '达到上限' }
    ];
  if (node.type === 'INTENT_ROUTE') {
    const config = effectiveIntentFallback(node);
    const mode = String(config.fallbackMode || 'EDGE');
    const action = String(config.retryLimitAction || 'CONTINUE');
    const fallback = ['FIXED_RETRY', 'AI_RETRY'].includes(mode)
      ? ['EDGE', 'CONTINUE'].includes(action)
        ? [action === 'EDGE' ? 'FALLBACK' : 'CONTINUE']
        : []
      : [['FIXED_CONTINUE', 'AI_CONTINUE'].includes(mode) ? 'CONTINUE' : 'FALLBACK'];
    return [...normalizedIntentCodes(node.config.intentCodes), ...fallback].map((value) => ({ value, label: branchLabel(node.id, value) || value }));
  }
  return [{ value: '', label: '继续下一步' }];
};
const treeAddOutlets = computed(() => treeOutlets(props.modelValue.nodes.find((node) => node.id === treeAdd.source)));
const treeNewOutlets = computed(() => treeOutlets({ id: 'new', type: treeAdd.type, name: '', x: 0, y: 0, config: {} }));
const treeOldTarget = computed(
  () => props.modelValue.edges.find((edge) => edge.source === treeAdd.source && (edge.condition || '') === treeAdd.condition)?.target
);
const openTreeAdd = (id: string) => {
  Object.assign(treeAdd, { source: id, condition: '', mode: 'new', type: 'TEMPLATE_REPLY', name: '', target: '', onward: '' });
  treeAdd.condition = treeAddOutlets.value.length === 1 ? treeAddOutlets.value[0].value : '';
  treeAddError.value = '';
  treeAddVisible.value = true;
};
const confirmTreeAdd = async () => {
  if (!lf) return;
  treeAddError.value = '';
  try {
    if (!treeAddOutlets.value.some((outlet) => outlet.value === treeAdd.condition)) throw new Error('请先选择具体出口');
    const graph = readGraph();
    const source = graph.nodes.find((node) => node.id === treeAdd.source);
    if (!source || getAiWorkflowNodeDefinition(source.type).terminal) throw new Error('该节点不能添加后续');
    const definition = getAiWorkflowNodeDefinition(treeAdd.type);
    if (treeAdd.mode === 'new' && treeOldTarget.value && definition.branch && !treeNewOutlets.value.some((outlet) => outlet.value === treeAdd.onward))
      throw new Error('请选择原后续应连接的新节点出口');
    const id = () => createAnswerOptionCode([]);
    const config = Object.fromEntries(
      definition.properties
        .filter((property) => property.defaultValue !== undefined)
        .map((property) => [property.key, structuredClone(property.defaultValue)])
    );
    const node = { id: id(), type: definition.type, name: treeAdd.name.trim() || definition.label, x: source.x + 240, y: source.y + 80, config };
    const next = connectTreeStep(
      graph,
      source.id,
      treeAdd.condition,
      treeAdd.mode === 'new' ? node : treeAdd.target,
      definition.branch ? treeAdd.onward : '',
      Boolean(definition.terminal),
      id
    );
    restoreBranchView();
    lf.render(toLogicFlowData(next));
    syncGraph();
    treeAddVisible.value = false;
    await nextTick();
    next.edges.forEach((edge) => lf?.updateText(edge.id, branchLabel(edge.source, edge.condition)));
    focusNode(treeAdd.mode === 'new' ? node.id : treeAdd.target);
  } catch (error) {
    treeAddError.value = error instanceof Error ? error.message : '添加失败，请检查节点配置';
  }
};
const viewMode = ref('canvas');
const treeRef = ref<InstanceType<(typeof import('element-plus'))['ElTree']>>();
const treeContainer = ref<HTMLElement>();
const treeEntries = computed(() => buildWorkflowTree(props.modelValue, (source, condition) => (condition ? branchLabel(source, condition) : '继续')));
const treeExpansion = ref<Record<string, boolean>>({});
const treeExpandedKeys = computed(() => Object.keys(treeExpansion.value).filter((key) => treeExpansion.value[key]));
const setTreeExpanded = (key: string, expanded: boolean) => {
  treeExpansion.value[key] = expanded;
};
const treeNodeType = (id: string) => {
  const node = props.modelValue.nodes.find((item) => item.id === id);
  return node ? getAiWorkflowNodeDefinition(node.type).label : '';
};
const changeView = async () => {
  restoreBranchView();
  try {
    localStorage.setItem('callnexus.workflow.designer.view', viewMode.value);
  } catch {
    /* View preference is optional. */
  }
  await nextTick();
  if (viewMode.value === 'canvas') {
    lf?.resize();
    fitCanvas();
  }
  if (viewMode.value === 'tree' && selectedNode.value) void focusTreeEntry(selectedNode.value.id);
};
const selectTreeEntry = (entry: WorkflowTreeEntry) => focusNode(entry.nodeId);
const focusTreeEntry = async (id: string) => {
  await nextTick();
  const find = (entries: WorkflowTreeEntry[]): WorkflowTreeEntry | undefined => {
    for (const entry of entries) {
      if (entry.nodeId === id && !entry.reference) return entry;
      const found = find(entry.children);
      if (found) return found;
    }
  };
  const entry = find(treeEntries.value);
  if (!entry) return;
  treeRef.value?.setCurrentKey(entry.key);
  let parent = treeRef.value?.getNode(entry.key)?.parent;
  while (parent) {
    if (parent.key) setTreeExpanded(String(parent.key), true);
    parent.expanded = true;
    parent = parent.parent;
  }
  await nextTick();
  Array.from(treeContainer.value?.querySelectorAll<HTMLElement>('[data-tree-key]') || [])
    .find((element) => element.dataset.treeKey === entry.key)
    ?.scrollIntoView({ block: 'nearest' });
};
const hiddenNodeIds = ref(new Set<string>());
const foldedRootName = ref('');
const restoreBranchView = () => {
  lf?.graphModel.nodes.forEach((node) => {
    node.visible = true;
  });
  lf?.graphModel.edges.forEach((edge) => {
    edge.visible = true;
  });
  hiddenNodeIds.value = new Set();
  foldedRootName.value = '';
};
const foldSelectedBranch = () => {
  if (!lf || !selectedNode.value) return;
  const graph = readGraph();
  const root = selectedNode.value;
  restoreBranchView();
  hiddenNodeIds.value = foldableNodeIds(graph.nodes, graph.edges, root.id);
  foldedRootName.value = hiddenNodeIds.value.size ? root.name : '';
  lf.graphModel.nodes.forEach((node) => {
    node.visible = !hiddenNodeIds.value.has(node.id);
  });
  lf.graphModel.edges.forEach((edge) => {
    edge.visible = !hiddenNodeIds.value.has(edge.sourceNodeId) && !hiddenNodeIds.value.has(edge.targetNodeId);
  });
};
const navigateToNode = (id?: string) => {
  if (id) focusNode(id);
};
const visibleNodeSections = computed(() =>
  propertySections.filter(
    (section) =>
      selectedDefinition.value.properties.some((property) => propertySection(property.key) === section.name && isPropertyVisible(property.key)) ||
      (selectedNode.value?.type === 'DIALOGUE_STEP' && ['answers', 'routing'].includes(section.name))
  )
);
const selectedEdge = ref<AiWorkflowEdge>();
let lf: LogicFlow | undefined;
type ValidationMark = { nodeId?: string; edgeId?: string; message: string };
const validationMarks = ref<ValidationMark[]>([]);
const selectedValidationMessages = computed(() => [
  ...new Set(
    validationMarks.value
      .filter(
        (item) => (selectedNode.value && item.nodeId === selectedNode.value.id) || (selectedEdge.value && item.edgeId === selectedEdge.value.id)
      )
      .map((item) => item.message)
  )
]);

class WorkflowCardModel extends RectNodeModel {
  setAttributes() {
    this.width = 136;
    this.height = 48;
    this.radius = 6;
    this.sourceRules.push({
      message: '终止节点不能连接后续节点',
      validate: () => !getAiWorkflowNodeDefinition(String(this.properties.workflowType)).terminal
    });
    this.targetRules.push({ message: '开始节点不能作为连线目标', validate: () => this.properties.workflowType !== 'START' });
  }
  getTextStyle() {
    return { ...super.getTextStyle(), fontSize: 12, textWidth: 112, overflowMode: 'ellipsis' as const };
  }
  getNodeStyle() {
    const style = super.getNodeStyle();
    style.stroke = String(this.properties.color || '#0f4c81');
    style.strokeWidth = 2;
    style.fill = '#ffffff';
    if (this.properties.validationError) {
      style.stroke = '#dc2626';
      style.strokeWidth = 4;
      style.fill = '#fff1f2';
    }
    return style;
  }
}
class WorkflowBezierModel extends BezierEdgeModel {
  getEdgeStyle() {
    const style = super.getEdgeStyle();
    if (this.properties.validationError) {
      style.stroke = '#dc2626';
      style.strokeWidth = 4;
    }
    return style;
  }
  getTextStyle() {
    const style = super.getTextStyle();
    if (this.properties.validationError) style.color = '#dc2626';
    return style;
  }
  getArrowStyle() {
    const style = super.getArrowStyle();
    if (this.properties.validationError) {
      style.stroke = '#dc2626';
      style.fill = '#dc2626';
    }
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
  { label: '当前循环次数', value: 'workflow.loopCount' },
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
const mediaOptionExtra = (item: AiWorkflowMediaOptionVO) => {
  const duration = item.durationMs ? `${Math.ceil(item.durationMs / 1000)}秒` : '时长未知';
  return `${duration} / ${item.publishStatus === 'PARTIAL' ? '部分节点已同步' : '已发布'}`;
};
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
      .filter((field) => field.enabled !== false && field.aiFillEnabled !== false)
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
  return [...workflowVariables, ...customerFieldOptions.value, { label: '客户性别', value: 'customer.gender', type: 'STRING' }];
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
const effectiveIntentFallback = (node?: AiWorkflowNode) => {
  const local = node?.config || {};
  return String(local.fallbackMode || 'EDGE') === 'INHERIT' ? props.modelValue.settings?.intentFallback || { fallbackMode: 'EDGE' } : local;
};
const sourceIntentOptions = computed(() =>
  normalizedIntentCodes(sourceNode.value?.config?.intentCodes).map((code) => ({
    value: code,
    label: props.intentOptions.find((item) => item.intentCode === code)?.intentName || code
  }))
);
const sourceFallbackBranches = computed(() => {
  const config = effectiveIntentFallback(sourceNode.value);
  const mode = String(config.fallbackMode || 'EDGE');
  if (['FIXED_RETRY', 'AI_RETRY'].includes(mode)) {
    const action = String(config.retryLimitAction || 'CONTINUE');
    if (!['EDGE', 'CONTINUE'].includes(action)) return [];
    return [action === 'EDGE' ? 'FALLBACK' : 'CONTINUE'];
  }
  return [['FIXED_CONTINUE', 'AI_CONTINUE'].includes(mode) ? 'CONTINUE' : 'FALLBACK'];
});
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
const fieldOptions = (key: string) =>
  key === 'collectedFields'
    ? customVariableOptions.value.filter((item) => item.value.startsWith('workflow.custom_') && item.type === 'STRING')
    : slotTargetOptions.value;
const branchLabel = (sourceId: string, condition?: string) => {
  if (!condition) return '';
  const source = props.modelValue.nodes.find((node) => node.id === sourceId) || readGraph().nodes.find((node) => node.id === sourceId);
  if (source?.type === 'DIALOGUE_STEP') return dialogueOutletsFor(source).find((item) => item.value === condition)?.label || condition;
  if (source?.type === 'CONDITION') return condition === 'TRUE' ? '条件成立' : condition === 'FALSE' ? '条件不成立' : condition;
  if (source?.type === 'LOOP_LIMIT') return condition === 'CONTINUE' ? '继续循环' : condition === 'LIMIT' ? '达到上限' : condition;
  if (source?.type === 'INTENT_ROUTE') {
    if (condition === 'FALLBACK') return '未命中意图';
    if (condition === 'CONTINUE') return '未命中后继续';
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
  return withGraphContent(
    props.modelValue,
    raw.nodes.map((node: any) => ({
      id: node.id,
      type: node.properties.workflowType,
      name: node.properties.name || node.text?.value || node.text,
      x: node.x,
      y: node.y,
      config: node.properties.config || {}
    })),
    raw.edges.map((edge: any) => ({
      id: edge.id,
      source: edge.sourceNodeId || edge.sourceNode?.id || edge.source,
      target: edge.targetNodeId || edge.targetNode?.id || edge.target,
      condition: edge.properties?.condition || edge.text?.value || edge.text || ''
    }))
  );
};
const syncGraph = () => emit('update:modelValue', readGraph());
const selectNode = (id: string) => {
  if (selectedNode.value?.id !== id) activeNodeSection.value = 'basic';
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
  if (selectedNode.value.type === 'DIALOGUE_STEP' && selectedNode.value.config.answerOptions) {
    selectedNode.value.config.answerOptions = fillMissingAnswerOptionCodes(selectedNode.value.config.answerOptions);
  }
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
const dialogueOutletsFor = (node?: AiWorkflowNode) => [
  ...(node?.config?.answerOptions?.length
    ? node.config.answerOptions.map((option: { code: string; label: string }) => ({
        value: `OPTION_${option.code}`,
        label: option.label || option.code
      }))
    : [{ value: 'COMPLETE', label: '确认完成' }]),
  { value: 'DECLINED', label: '明确拒绝' },
  { value: 'LIMIT', label: '澄清上限' }
];
const dialogueOutlets = computed(() => dialogueOutletsFor(selectedNode.value));
const addDialogueOption = () => {
  if (!selectedNode.value) return;
  const options = selectedNode.value.config.answerOptions || [];
  if (options.length >= 10) return;
  updateNodeProperty('answerOptions', [
    ...options,
    { code: createAnswerOptionCode(options.map((option: { code: string }) => option.code)), label: '', answers: '' }
  ]);
};
const removeDialogueOption = (index: number) => {
  if (!selectedNode.value) return;
  const options = [...(selectedNode.value.config.answerOptions || [])];
  options.splice(index, 1);
  updateNodeProperty('answerOptions', options);
};
const dialogueTarget = (condition: string) =>
  props.modelValue.edges.find((edge) => edge.source === selectedNode.value?.id && edge.condition === condition)?.target;
const updateDialogueMatch = (option: Record<string, unknown>, key: string, value: unknown) => {
  option[key] = value;
  updateSelectedNode();
};
const setDialogueTarget = (condition: string, target?: string) => {
  const section = activeNodeSection.value;
  const source = selectedNode.value?.id;
  if (!lf || !source) return;
  if (target && !props.modelValue.nodes.some((node) => node.id === target && node.id !== source && node.type !== 'START')) return;
  readGraph()
    .edges.filter((edge) => edge.source === source && edge.condition === condition)
    .forEach((edge) => lf?.deleteEdge(edge.id));
  if (target)
    lf.addEdge({ type: 'bezier', sourceNodeId: source, targetNodeId: target, text: branchLabel(source, condition), properties: { condition } });
  syncGraph();
  selectNode(source);
  activeNodeSection.value = section;
};
const updateNodeProperty = (key: string, value: unknown) => {
  if (!selectedNode.value) return;
  selectedNode.value.config[key] = value;
  updateSelectedNode();
  if (selectedNode.value.type === 'INTENT_ROUTE' && ['fallbackMode', 'retryLimitAction'].includes(key)) {
    normalizeIntentFallbackEdge();
  }
};
const normalizeIntentFallbackEdge = () => {
  if (!lf || !selectedNode.value) return;
  const fallbackEdges = readGraph().edges.filter(
    (edge) => edge.source === selectedNode.value?.id && ['FALLBACK', 'CONTINUE'].includes(String(edge.condition))
  );
  if (fallbackEdges.length !== 1) return;
  const config = effectiveIntentFallback(selectedNode.value);
  const mode = String(config.fallbackMode || 'EDGE');
  if (['FIXED_RETRY', 'AI_RETRY'].includes(mode) && !['EDGE', 'CONTINUE'].includes(String(config.retryLimitAction || 'CONTINUE'))) {
    return;
  }
  const condition = ['FIXED_RETRY', 'AI_RETRY'].includes(mode)
    ? String(config.retryLimitAction || 'CONTINUE') === 'EDGE'
      ? 'FALLBACK'
      : 'CONTINUE'
    : ['FIXED_CONTINUE', 'AI_CONTINUE'].includes(mode)
      ? 'CONTINUE'
      : 'FALLBACK';
  const edge = fallbackEdges[0];
  if (edge.condition === condition) return;
  lf.updateText(edge.id, branchLabel(edge.source, condition));
  lf.setProperties(edge.id, { condition });
  syncGraph();
};
const isPropertyVisible = (key: string) => {
  if (selectedNode.value?.type === 'DIALOGUE_STEP') {
    for (const prefix of ['accepted', 'declined']) {
      if (!key.startsWith(prefix)) continue;
      if (prefix === 'accepted' && selectedNode.value.config.answerOptions?.length) return false;
      const mode = selectedNode.value.config[prefix + 'MatchMode'] || 'EXACT';
      if (key === prefix + 'IntentCodes') return mode === 'INTENT';
      if (key === prefix + 'Answers') return mode !== 'INTENT';
      if (key === prefix + 'KeywordMode' || key === prefix + 'ExcludedKeywords') return mode === 'KEYWORD';
    }
  }
  if (key === 'answerMode' && selectedNode.value?.type === 'TEMPLATE_REPLY')
    return Boolean(selectedNode.value.config.requiredDisclosure) && selectedNode.value.config.disclosureBargeInMode === 'REPLAY_AFTER_REPLY';
  if (['disclosureBargeInMode', 'disclosureMaxInterruptions'].includes(key)) return Boolean(selectedNode.value?.config.requiredDisclosure);
  if (key === 'nodeBargeInMode' && selectedNode.value?.config.requiredDisclosure) return false;
  if (
    selectedNode.value?.type === 'DIALOGUE_STEP' &&
    selectedNode.value.config.answerOptions?.length &&
    ['acceptedAnswers', 'reuseCollectedFields'].includes(key)
  )
    return false;
  if (['aiAutoAdvance', 'knowledgeQuestionsEnabled'].includes(key)) return Boolean(selectedNode.value?.config?.aiUnderstandingEnabled);
  if (key === 'playbackFailureQueueCode') return selectedNode.value?.config?.playbackFailureAction === 'TRANSFER_QUEUE';
  if (['nodeControlText', 'nodeControlMaxCount', 'nodeControlCooldownMs'].includes(key))
    return selectedNode.value?.config?.nodeBargeInMode === 'CONTROL_RESUME';
  if (key === 'compareValue') return !['EMPTY', 'NOT_EMPTY'].includes(String(selectedNode.value?.config?.operator || ''));
  if (selectedNode.value?.type !== 'INTENT_ROUTE') return true;
  const mode = String(selectedNode.value.config.fallbackMode || 'EDGE');
  if (mode === 'INHERIT')
    return !['fallbackText', 'fallbackPrompt', 'maxRetries', 'retryLimitAction', 'limitText', 'limitQueueCode', 'limitExtension'].includes(key);
  if (key === 'fallbackText') return ['FIXED_RETRY', 'FIXED_CONTINUE'].includes(mode);
  if (key === 'fallbackPrompt') return ['AI_RETRY', 'AI_CONTINUE'].includes(mode);
  if (['maxRetries', 'retryLimitAction', 'limitText'].includes(key)) return ['FIXED_RETRY', 'AI_RETRY'].includes(mode);
  if (key === 'limitQueueCode') return ['FIXED_RETRY', 'AI_RETRY'].includes(mode) && selectedNode.value.config.retryLimitAction === 'TRANSFER_QUEUE';
  if (key === 'limitExtension')
    return ['FIXED_RETRY', 'AI_RETRY'].includes(mode) && selectedNode.value.config.retryLimitAction === 'TRANSFER_EXTENSION';
  return true;
};
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
const organizeLayout = () => {
  if (!lf) return;
  const graph = readGraph();
  const nodes = createLayeredFlowLayout(graph.nodes, graph.edges, { direction: 'TB' });
  nodes.forEach((node) => lf?.graphModel.moveNode2Coordinate(node.id, node.x, node.y, true));
  // Recompute endpoints after rotation instead of retaining horizontal anchors.
  graph.edges.forEach(({ id }) => {
    const edge = lf?.getEdgeModelById(id);
    if (!edge) return;
    const source = edge.getBeginAnchor(edge.sourceNode, edge.targetNode);
    if (source) {
      edge.sourceAnchorId = source.id;
      edge.updateStartPoint(source);
    }
    const target = edge.getEndAnchor(edge.targetNode);
    if (target) {
      edge.targetAnchorId = target.id;
      edge.updateEndPoint(target);
    }
    edge.resetTextPosition();
  });
  syncGraph();
  nextTick(fitCanvas);
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
  lf.register({ type: 'bezier', view: BezierEdge, model: WorkflowBezierModel });
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
  lf.on('node:add,node:drop,node:delete,edge:delete,history:change', () => {
    restoreBranchView();
    syncGraph();
  });
  lf.on('edge:add', ({ data }: any) => {
    restoreBranchView();
    syncGraph();
    selectEdge(data);
  });
  lf.render(toLogicFlowData(props.modelValue));
  fitCanvas();
  try {
    if (localStorage.getItem('callnexus.workflow.designer.view') === 'tree') viewMode.value = 'tree';
  } catch {
    /* Use the default view. */
  }
};
const focusNode = (id: string) => {
  restoreBranchView();
  if (!lf || !readGraph().nodes.some((node) => node.id === id)) return;
  lf.selectElementById(id);
  lf.focusOn(id);
  selectNode(id);
  if (viewMode.value === 'tree') void focusTreeEntry(id);
  const messages = selectedValidationMessages.value.join(' ');
  const section = /业务答案/.test(messages)
    ? 'answers'
    : /分支|出口/.test(messages)
      ? 'routing'
      : /告知|打断|停播/.test(messages)
        ? 'voice'
        : /公共规则/.test(messages)
          ? 'rules'
          : 'basic';
  if (visibleNodeSections.value.some((item) => item.name === section)) activeNodeSection.value = section;
};
const focusEdge = (id: string) => {
  if (viewMode.value === 'tree') {
    viewMode.value = 'canvas';
    void changeView();
  }
  restoreBranchView();
  if (!lf) return;
  const edge = readGraph().edges.find((item) => item.id === id);
  if (!edge) return;
  lf.selectElementById(id);
  lf.focusOn(edge.source);
  selectEdge({ id });
};
const showValidation = (marks: ValidationMark[]) => {
  if (!lf) return;
  validationMarks.value = marks;
  const nodes = new Set(marks.map((item) => item.nodeId).filter(Boolean));
  const edges = new Set(marks.map((item) => item.edgeId).filter(Boolean));
  const graph = readGraph();
  graph.nodes.forEach((node) => lf?.setProperties(node.id, { validationError: nodes.has(node.id) }));
  graph.edges.forEach((edge) => lf?.setProperties(edge.id, { validationError: edges.has(edge.id) }));
};
watch(
  treeEntries,
  (entries) => {
    const initial = new Set(initialTreeExpandedKeys(entries));
    const state: Record<string, boolean> = {};
    const walk = (items: WorkflowTreeEntry[]) =>
      items.forEach((entry) => {
        state[entry.key] = treeExpansion.value[entry.key] ?? initial.has(entry.key);
        walk(entry.children);
      });
    walk(entries);
    treeExpansion.value = state;
  },
  { immediate: true }
);
defineExpose({ getGraph: readGraph, focusNode, focusEdge, showValidation });
onMounted(initialize);
onBeforeUnmount(() => lf?.destroy());
</script>

<style scoped>
.workflow-tree {
  height: calc(100% - 48px);
  overflow: auto;
  padding: 10px 12px;
  background: var(--el-bg-color);
}
.workflow-tree :deep(.el-tree-node__content) {
  height: 36px;
  padding-left: 0 !important;
  position: relative;
}
.workflow-tree :deep(.el-tree-node__children) {
  margin-left: 22px;
  border-left: 1px solid var(--el-border-color-lighter);
}
.workflow-tree :deep(.el-tree-node__children .el-tree-node__content)::before {
  content: '';
  position: absolute;
  left: -1px;
  top: 18px;
  width: 10px;
  border-top: 1px solid var(--el-border-color-lighter);
  pointer-events: none;
}
.workflow-tree :deep(.el-tree-node__expand-icon) {
  width: 22px;
  box-sizing: border-box;
  flex: 0 0 22px;
}
.workflow-tree :deep(.el-tree-node__content:hover) {
  background: var(--el-fill-color-light);
}
.workflow-tree :deep(.el-tree-node.is-current > .el-tree-node__content) {
  background: var(--el-color-primary-light-9);
}
.workflow-tree :deep(.el-tree-node__content:focus-visible),
.workflow-tree :deep(.el-tree-node:focus-visible > .el-tree-node__content) {
  outline: 1px solid var(--el-color-primary);
  outline-offset: -1px;
}
.workflow-tree :deep(.el-tree-node__content:hover) .tree-actions,
.workflow-tree :deep(.el-tree-node__content:focus-within) .tree-actions,
.workflow-tree :deep(.el-tree-node.is-current > .el-tree-node__content) .tree-actions {
  opacity: 1;
  pointer-events: auto;
}
.tree-actions {
  margin-left: auto;
  flex: 0 0 30px;
  opacity: 0;
  pointer-events: none;
}
.tree-actions .el-button {
  width: 28px;
  padding: 0;
  font-size: 17px;
}
.tree-condition {
  max-width: 140px;
  flex: 0 1 auto;
  padding: 0 5px;
  border: 1px solid var(--el-border-color);
  line-height: 19px;
  font-size: 12px;
  color: var(--el-text-color-regular);
}
.tree-node-name {
  min-width: 0;
  max-width: 480px;
  flex: 0 1 auto;
  font-weight: 500;
  color: var(--el-text-color-primary);
}
.tree-node-name,
.tree-condition,
.tree-reference,
.tree-node-type {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tree-reference {
  min-width: 0;
  max-width: 520px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--el-color-primary);
  cursor: pointer;
  text-align: left;
  font: inherit;
}
.tree-reference:focus-visible {
  outline: 1px solid var(--el-color-primary);
}
.tree-node-type {
  max-width: 110px;
  flex-shrink: 2;
}
.tree-step-count {
  flex: none;
}
.tree-error {
  flex: none;
  font-size: 12px;
  color: var(--el-color-danger);
}
.tree-actions:empty {
  flex-basis: 30px;
}
@media (hover: none) {
  .tree-actions {
    opacity: 1;
    pointer-events: auto;
  }
}
.workflow-tree-row small {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.workflow-tree-row {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  gap: 8px;
  padding-right: 6px;
  font-size: 13px;
}
.node-navigation {
  width: 220px;
  flex: 0 0 220px;
}
.navigation-id {
  float: right;
  margin-left: 12px;
  color: var(--el-text-color-secondary);
}
.dialogue-answer-option {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  margin-bottom: 16px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  background: var(--el-fill-color-blank);
}
.remove-answer-option {
  align-self: flex-end;
}
.node-section-tabs :deep(.el-tabs__item) {
  padding: 0 10px;
  font-size: 13px;
}
.node-identity :deep(.el-form-item) {
  margin-bottom: 8px;
}
.ai-workflow-designer {
  display: grid;
  grid-template-columns: 230px minmax(0, 1fr) 320px;
  height: calc(100vh - 122px);
  user-select: none;
}
.ai-workflow-designer.is-tree-view {
  grid-template-columns: minmax(0, 1fr) 320px;
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
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 36px;
  padding: 7px 10px;
  margin-bottom: 6px;
  border: 1px solid #dce3ec;
  border-radius: 4px;
  background: #fff;
  font: inherit;
  text-align: left;
  cursor: grab;
}
.palette-item:hover {
  border-color: #2563eb;
  background: #f8fafc;
}
.palette-item:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
.node-dot {
  flex: none;
  width: 10px;
  height: 10px;
  margin-top: 0;
  border-radius: 50%;
}
.palette-label {
  min-width: 0;
  overflow: hidden;
  color: #1f2937;
  font-size: 13px;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  gap: 8px;
  padding: 0 12px;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
  overflow-x: auto;
  white-space: nowrap;
}
.canvas-toolbar > .el-button-group {
  display: inline-flex;
  flex: none;
}
.canvas-toolbar > .el-button,
.canvas-toolbar > .el-tag {
  flex: none;
  margin-left: 0;
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
@media (max-width: 1200px) {
  .ai-workflow-designer {
    grid-template-columns: 168px minmax(0, 1fr) 290px;
  }
  .ai-workflow-designer.is-tree-view {
    grid-template-columns: minmax(0, 1fr) 290px;
  }
  .palette,
  .properties {
    padding: 12px;
  }
}
</style>
