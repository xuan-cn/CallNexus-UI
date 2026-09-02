<template>
  <div class="p-2">
    <el-card shadow="never"
      ><div class="mb-3"><el-button type="primary" plain icon="Plus" @click="edit()">新增 AI 助手</el-button></div>
      <el-table :data="agents"
        ><el-table-column label="编码" prop="agentCode" min-width="130" /><el-table-column
          label="名称"
          prop="agentName"
          min-width="150"
        /><el-table-column label="Chat模型" prop="chatModelName" min-width="160" /><el-table-column label="绑定知识库" min-width="230"
          ><template #default="{ row }"
            ><el-tag v-for="name in row.knowledgeBaseNames" :key="name" class="mr-1">{{ name }}</el-tag
            ><span v-if="!row.knowledgeBaseNames.length">未绑定</span></template
          ></el-table-column
        ><el-table-column label="知识库回答" width="130"
          ><template #default="{ row }">{{ row.retrievalMode === 'DIRECT_RETRIEVAL' ? '极速原文' : '智能混合' }}</template></el-table-column
        ><el-table-column label="未命中策略" width="130"
          ><template #default="{ row }">{{ row.retrievalFailurePolicy === 'STRICT' ? '严格拒答' : '模型兜底' }}</template></el-table-column
        ><el-table-column label="系统助手" width="100"
          ><template #default="{ row }"
            ><el-tag v-if="row.systemAssistant" type="success">顶部助手</el-tag><span v-else>-</span></template
          ></el-table-column
        ><el-table-column label="状态" width="90"
          ><template #default="{ row }"
            ><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag></template
          ></el-table-column
        ><el-table-column label="操作" width="220" fixed="right"
          ><template #default="{ row }"
            ><el-button link type="success" @click="openTest(row)">测试</el-button><el-button link type="primary" @click="edit(row)">修改</el-button
            ><el-button link type="primary" @click="toggle(row)">{{ row.enabled ? '停用' : '启用' }}</el-button
            ><el-button link type="danger" @click="remove(row)">删除</el-button></template
          ></el-table-column
        ></el-table
      >
    </el-card>
    <el-drawer v-model="drawer" :title="form.id ? '修改 AI 助手' : '新增 AI 助手'" size="1080px" class="ai-agent-edit-drawer" destroy-on-close>
      <el-form :model="form" label-width="120px" class="agent-edit-form">
        <el-tabs v-model="activeTab" class="agent-config-tabs">
          <el-tab-pane label="基础信息" name="basic">
            <section class="edit-section">
              <div class="edit-section-title">身份信息</div>
              <el-row :gutter="16">
                <el-col :span="12">
                  <el-form-item label="助手编码"><el-input v-model="form.agentCode" /></el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="助手名称"><el-input v-model="form.agentName" /></el-form-item>
                </el-col>
              </el-row>
              <el-form-item label="说明"><el-input v-model="form.description" type="textarea" :rows="4" /></el-form-item>
            </section>
            <section class="edit-section">
              <div class="edit-section-title">状态与用途</div>
              <el-form-item label="系统内部助手">
                <div class="switch-block">
                  <el-switch v-model="form.systemAssistant" active-text="用于系统顶部 AI 助手" />
                  <p class="field-hint">每个租户只能指定一个；IVR 等业务助手不需要开启。</p>
                </div>
              </el-form-item>
              <el-form-item label="启用"><el-switch v-model="form.enabled" /></el-form-item>
            </section>
          </el-tab-pane>

          <el-tab-pane label="对话设置" name="conversation">
            <section class="edit-section">
              <div class="edit-section-title">模型与提示词</div>
              <el-form-item label="Chat模型">
                <el-select v-model="form.chatModelId" style="width: 100%">
                  <el-option v-for="m in chatModels" :key="m.id" :label="`${m.modelName}（${m.providerName}）`" :value="m.id" />
                </el-select>
              </el-form-item>
              <el-form-item label="系统提示词">
                <el-input v-model="form.systemPrompt" type="textarea" :rows="10" />
              </el-form-item>
              <el-form-item label="开场白">
                <el-input v-model="form.welcomeMessage" type="textarea" :rows="4" placeholder="创建新对话时，作为 AI 的第一条消息" />
                <p class="field-hint">开场白不参与知识检索，后续电话 AI 将复用该内容。</p>
              </el-form-item>
            </section>
            <section class="edit-section">
              <div class="edit-section-title">生成参数</div>
              <el-row :gutter="16">
                <el-col :span="8">
                  <el-form-item label="温度">
                    <el-input-number v-model="form.temperature" :min="0" :max="2" :step="0.1" style="width: 100%" />
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="输出Token">
                    <el-input-number v-model="form.maxOutputTokens" :min="1" style="width: 100%" />
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="历史消息数">
                    <el-input-number v-model="form.historyMessageLimit" :min="0" style="width: 100%" />
                  </el-form-item>
                </el-col>
              </el-row>
            </section>
          </el-tab-pane>

          <el-tab-pane label="知识库" name="knowledge">
            <section class="edit-section">
              <div class="edit-section-title">绑定与回答策略</div>
              <el-form-item label="绑定知识库">
                <el-select v-model="form.knowledgeBaseIds" multiple style="width: 100%">
                  <el-option v-for="k in bases" :key="k.id" :label="`${k.knowledgeName}（${k.embeddingModelName || ''}）`" :value="k.id" />
                </el-select>
              </el-form-item>
              <el-alert
                class="mb-4"
                type="info"
                :closable="false"
                title="同一助手只能绑定使用相同 Embedding 模型的知识库；选择顺序同时作为冲突时的优先级。"
              />
              <el-form-item label="知识库回答">
                <el-radio-group v-model="form.retrievalMode">
                  <el-radio value="RAG">智能混合：FAQ 直返，文档由模型整理</el-radio>
                  <el-radio value="DIRECT_RETRIEVAL">极速原文：直接返回最高相似度切片</el-radio>
                </el-radio-group>
                <p class="field-hint">普通文档切片包含上下文，建议使用智能混合；极速原文适合内容已经整理成独立答案的知识库。</p>
              </el-form-item>
            </section>
            <section class="edit-section">
              <div class="edit-section-title">检索参数</div>
              <el-row :gutter="16">
                <el-col :span="12">
                  <el-form-item label="未命中处理">
                    <el-select v-model="form.retrievalFailurePolicy" style="width: 100%">
                      <el-option label="STRICT：没有依据时拒答" value="STRICT" />
                      <el-option label="FALLBACK：允许模型通用回答" value="FALLBACK_MODEL" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="Top K">
                    <el-input-number v-model="form.topK" :min="1" :max="20" style="width: 100%" />
                  </el-form-item>
                </el-col>
              </el-row>
              <el-form-item label="文档阈值">
                <el-slider v-model="form.scoreThreshold" :min="0" :max="1" :step="0.01" show-input />
              </el-form-item>
              <el-form-item label="FAQ阈值">
                <el-slider v-model="form.faqScoreThreshold" :min="0" :max="1" :step="0.01" show-input />
              </el-form-item>
              <el-form-item v-if="form.retrievalFailurePolicy === 'FALLBACK_MODEL'" label="FAQ学习审核">
                <div class="switch-block">
                  <el-switch v-model="form.faqLearningEnabled" active-text="收集模型兜底问答" />
                  <p class="field-hint">仅收集没有命中 FAQ 或文档、最终由模型独立回答的问题，不会自动发布。</p>
                </div>
              </el-form-item>
              <el-form-item v-if="form.faqLearningEnabled" label="目标知识库">
                <el-select v-model="form.faqLearningKnowledgeBaseId" style="width: 100%" placeholder="选择审核通过后发布到的知识库">
                  <el-option
                    v-for="k in bases.filter((item) => form.knowledgeBaseIds.includes(item.id))"
                    :key="k.id"
                    :label="k.knowledgeName"
                    :value="k.id"
                  />
                </el-select>
              </el-form-item>
            </section>
          </el-tab-pane>

          <el-tab-pane label="语音交互" name="voice">
            <section class="edit-section">
              <div class="edit-section-title">传输方式</div>
              <el-form-item label="语音传输">
                <el-radio-group v-model="form.voiceTransport">
                  <el-radio value="HTTP">HTTP：整段合成后一次回传（兼容旧插件）</el-radio>
                  <el-radio value="WS">WS：按句流式回传（首字延迟更低，需 UniMRCP 插件支持）</el-radio>
                </el-radio-group>
                <el-input
                  v-if="form.voiceTransport === 'WS'"
                  v-model="form.voiceTransportWsUrl"
                  class="mt-2"
                  placeholder="ws://<callnexus-host>:8080/api/internal/ai/realtime/tts-stream（留空使用系统默认）"
                  maxlength="256"
                />
                <p class="field-hint">仅对话 AI 通话（callnexussynth 插件）生效；HTTP 兼容所有现网插件，WS 需要插件按新协议改造。</p>
              </el-form-item>
            </section>
            <section class="edit-section">
              <div class="edit-section-title">打断策略</div>
              <el-form-item label="语音打断">
                <div class="barge-in-setting">
                  <el-switch v-model="form.bargeInEnabled" active-text="允许用户在 AI 播报时插话" />
                  <p class="field-hint">开启后播放与 ASR 并行；检测到用户说话会停止当前播放并取消该轮剩余 TTS。默认关闭，不影响现有半双工流程。</p>
                </div>
              </el-form-item>
              <template v-if="form.bargeInEnabled">
                <el-row :gutter="16">
                  <el-col :span="8">
                    <el-form-item label="开场白打断">
                      <el-switch v-model="form.openingBargeInEnabled" active-text="允许" inactive-text="禁止" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="环境模式">
                      <el-select v-model="form.bargeInMode" style="width: 100%">
                        <el-option label="灵敏：安静环境" value="SENSITIVE" />
                        <el-option label="标准：普通办公环境" value="STANDARD" />
                        <el-option label="抗噪：嘈杂环境" value="NOISY" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="开播保护">
                      <el-input-number v-model="form.bargeInGraceMs" :min="0" :max="5000" :step="100" style="width: 100%" />
                      <p class="field-hint">毫秒；保护期内的 begin-speaking 不立即截断播放。</p>
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-alert
                  type="warning"
                  :closable="false"
                  title="打断识别依赖 UniMRCP VAD。嘈杂场景请使用“抗噪”，不要用关键词硬编码代替现有意图识别。"
                />
              </template>
            </section>
          </el-tab-pane>

          <el-tab-pane label="AI编排" name="workflow">
            <el-alert v-if="!form.id" type="info" :closable="false" title="请先保存 AI 助手，再绑定已发布的 AI 编排。" />
            <template v-else>
              <section class="edit-section">
                <div class="edit-section-title">场景编排</div>
                <el-alert
                  class="mb-4"
                  type="info"
                  :closable="false"
                  title="IVR 和自动外呼仍选择 AI 助手；进入 AI 后按场景启动这里绑定的编排。未绑定时继续使用普通 AI 对话。"
                />
                <div v-for="scene in workflowScenes" :key="scene.value" class="workflow-binding-row">
                  <div class="workflow-scene">
                    <strong>{{ scene.label }}</strong
                    ><span>{{ scene.description }}</span>
                  </div>
                  <el-select
                    v-model="workflowBindingForms[scene.value].workflowVersionId"
                    clearable
                    filterable
                    placeholder="使用普通 AI 对话"
                    style="min-width: 280px"
                  >
                    <el-option
                      v-for="item in workflowOptionsForScene(scene.value)"
                      :key="item.publishedVersionId"
                      :label="`${item.workflowName}（v${item.publishedVersionNo}）`"
                      :value="item.publishedVersionId!"
                    />
                  </el-select>
                  <el-select v-model="workflowBindingForms[scene.value].fallbackAction" style="width: 170px">
                    <el-option label="失败后普通对话" value="DEFAULT_CONVERSATION" />
                    <el-option label="失败后转人工" value="TRANSFER_AGENT" />
                    <el-option label="失败后结束" value="END_CONVERSATION" />
                  </el-select>
                  <el-switch v-model="workflowBindingForms[scene.value].enabled" active-text="启用" />
                  <el-button type="primary" plain :loading="workflowBindingSaving === scene.value" @click="saveWorkflowBinding(scene.value)"
                    >保存</el-button
                  >
                </div>
              </section>
            </template>
          </el-tab-pane>

          <el-tab-pane label="自动工单" name="ticket">
            <el-alert v-if="!form.id" type="info" :closable="false" title="请先保存 AI 助手，再配置自动工单策略和提示词。" />
            <template v-else>
              <section class="edit-section">
                <div class="edit-section-title ticket-section-title">
                  <span>生成策略</span><el-switch v-model="ticketPolicy.enabled" active-text="启用自动工单" />
                </div>
                <el-alert
                  class="mb-4"
                  :type="ticketPolicy.creationMode === 'AUTO_CREATE' ? 'warning' : 'info'"
                  :closable="false"
                  :title="
                    ticketPolicy.creationMode === 'AUTO_CREATE'
                      ? '只有置信度、必填字段、客户号码和重复检查全部通过时才自动建单；其他情况进入人工审核。'
                      : '通话结束后生成待人工审核草稿，不会自动创建正式工单。'
                  "
                />
                <el-row :gutter="16">
                  <el-col :span="8"
                    ><el-form-item label="建单模式">
                      <el-select v-model="ticketPolicy.creationMode" style="width: 100%">
                        <el-option label="生成草稿，人工审核" value="DRAFT_REVIEW" />
                        <el-option label="满足条件时自动建单" value="AUTO_CREATE" />
                      </el-select> </el-form-item
                  ></el-col>
                  <el-col :span="8"
                    ><el-form-item label="工单模板" required>
                      <el-select
                        v-model="ticketPolicy.ticketTemplateId"
                        clearable
                        filterable
                        style="width: 100%"
                        placeholder="选择用于字段提取的工单模板"
                      >
                        <el-option v-for="item in ticketTemplates" :key="item.id" :label="item.templateName" :value="item.id!" />
                      </el-select> </el-form-item
                  ></el-col>
                  <el-col :span="8"
                    ><el-form-item label="生成时机">
                      <el-select v-model="ticketPolicy.triggerTypes" multiple style="width: 100%">
                        <el-option label="通话结束后" value="CALL_ENDED" /><el-option label="AI 转人工时" value="TRANSFER_TO_AGENT" />
                      </el-select> </el-form-item
                  ></el-col>
                  <el-col :span="8"
                    ><el-form-item label="置信度阈值"
                      ><el-input-number v-model="ticketPolicy.confidenceThreshold" :min="0" :max="1" :step="0.05" style="width: 100%" /></el-form-item
                  ></el-col>
                  <el-col :span="8"
                    ><el-form-item label="必填项缺失"
                      ><el-select v-model="ticketPolicy.missingRequiredAction" style="width: 100%"
                        ><el-option label="保留草稿并标记缺失" value="KEEP_DRAFT" /><el-option
                          label="不生成草稿"
                          value="REJECT_DRAFT" /></el-select></el-form-item
                  ></el-col>
                  <el-col :span="8"
                    ><el-form-item label="重复工单"
                      ><el-select v-model="ticketPolicy.duplicatePolicy" style="width: 100%"
                        ><el-option label="转人工审核" value="MERGE_PENDING" /><el-option label="允许重复" value="ALLOW" /><el-option
                          label="阻止自动建单"
                          value="SKIP" /></el-select></el-form-item
                  ></el-col>
                  <template v-if="ticketPolicy.creationMode === 'AUTO_CREATE'">
                    <el-col :span="8"
                      ><el-form-item label="重复判断窗口（小时）"
                        ><el-input-number v-model="ticketPolicy.duplicateWindowHours" :min="1" :max="720" style="width: 100%" /></el-form-item
                    ></el-col>
                    <el-col :span="8"
                      ><el-form-item label="建单后动作"
                        ><el-select v-model="ticketPolicy.afterCreateAction" style="width: 100%"
                          ><el-option label="仅创建工单" value="CREATE_ONLY" /><el-option label="提交工作流" value="SUBMIT" /><el-option
                            label="直接办结"
                            value="RESOLVE" /></el-select></el-form-item
                    ></el-col>
                    <el-col :span="8"
                      ><el-form-item label="默认归属技能组"
                        ><el-select
                          v-model="ticketPolicy.defaultSkillGroupId"
                          clearable
                          filterable
                          style="width: 100%"
                          placeholder="不选择则保持未分配"
                          ><el-option
                            v-for="group in ticketSkillGroups"
                            :key="group.id"
                            :label="group.groupName"
                            :value="group.id" /></el-select></el-form-item
                    ></el-col>
                  </template>
                </el-row>
                <div class="section-actions"><el-button type="primary" :loading="ticketSaving" @click="saveTicketPolicy">保存策略</el-button></div>
              </section>

              <section class="edit-section">
                <div class="edit-section-title ticket-section-title">
                  <span>业务提示词</span
                  ><el-tag :type="ticketPrompt.status === 'PUBLISHED' ? 'success' : ticketPrompt.status === 'DRAFT' ? 'warning' : 'info'">{{
                    promptStatusLabel(ticketPrompt.status)
                  }}</el-tag>
                </div>
                <el-form-item label="版本说明"
                  ><el-input v-model="promptVersionName" maxlength="128" placeholder="例如：售后工单提取规则 v1"
                /></el-form-item>
                <el-form-item label="完整提示词"
                  ><div class="prompt-editor-wrap">
                    <el-input v-model="ticketPrompt.promptContent" type="textarea" :rows="20" maxlength="30000" show-word-limit />
                    <div class="prompt-variable-list">
                      <span class="field-hint">可用变量（点击插入）：</span>
                      <el-tooltip
                        v-for="variable in ticketPrompt.availableVariables"
                        :key="variable"
                        :content="promptVariableDescriptions[variable] || variable"
                        placement="top"
                      >
                        <el-tag
                          class="variable-tag"
                          :type="ticketPrompt.requiredVariables.includes(variable) ? 'danger' : 'info'"
                          @click="insertPromptVariable(variable)"
                        >
                          {{ formatPromptVariable(variable) }}{{ ticketPrompt.requiredVariables.includes(variable) ? ' 必需' : '' }}
                        </el-tag>
                      </el-tooltip>
                    </div>
                    <div class="prompt-variable-help">
                      <div v-for="variable in ticketPrompt.availableVariables" :key="`${variable}-help`" class="prompt-variable-help-item">
                        <code>{{ formatPromptVariable(variable) }}</code>
                        <span>{{ promptVariableDescriptions[variable] || '-' }}</span>
                        <el-tag v-if="ticketPrompt.requiredVariables.includes(variable)" size="small" type="danger">必需</el-tag>
                      </div>
                    </div>
                  </div></el-form-item
                >
                <div class="section-actions">
                  <el-button @click="restoreTicketPrompt">恢复默认</el-button><el-button @click="validateTicketPrompt">校验与预览</el-button
                  ><el-button type="primary" plain :loading="promptSaving" @click="saveTicketPrompt">保存草稿</el-button
                  ><el-button type="success" :loading="promptPublishing" @click="publishTicketPrompt">发布版本</el-button>
                </div>
              </section>

              <section class="edit-section">
                <div class="edit-section-title">系统输出协议（只读）</div>
                <el-alert
                  class="mb-3"
                  type="warning"
                  :closable="false"
                  title="业务提示词可以修改；JSON Schema 与安全约束由系统固定追加，前端仅展示，不能编辑。"
                />
                <el-collapse>
                  <el-collapse-item title="JSON Schema" name="schema">
                    <pre class="readonly-protocol">{{ ticketPrompt.jsonSchema }}</pre>
                  </el-collapse-item>
                  <el-collapse-item title="安全字段约束" name="safety">
                    <pre class="readonly-protocol">{{ ticketPrompt.safetyConstraints }}</pre>
                  </el-collapse-item>
                  <el-collapse-item title="历史版本" name="versions"
                    ><el-table :data="promptVersions" size="small" max-height="260"
                      ><el-table-column label="版本" prop="versionNo" width="80" /><el-table-column
                        label="说明"
                        prop="versionName"
                        min-width="180" /><el-table-column label="状态" width="100"
                        ><template #default="{ row }">{{ promptStatusLabel(row.status) }}</template></el-table-column
                      ><el-table-column label="发布时间" prop="publishedAt" min-width="170" /></el-table
                  ></el-collapse-item>
                </el-collapse>
              </section>
            </template>
          </el-tab-pane>
        </el-tabs>
      </el-form>
      <template #footer>
        <el-button @click="drawer = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-drawer>
    <el-dialog v-model="promptPreviewVisible" title="提示词编译预览" width="860px" append-to-body>
      <el-input v-model="promptPreview" type="textarea" :rows="24" readonly />
      <template #footer><el-button type="primary" @click="promptPreviewVisible = false">关闭</el-button></template>
    </el-dialog>
    <AiAgentTestDialog v-model="testVisible" :agent="testAgent" @saved="testSaved" />
  </div>
</template>
<script setup lang="ts">
import {
  createAiAgent,
  deleteAiAgent,
  getAiTicketPolicy,
  getAiTicketPrompt,
  listAiAgents,
  listAiTicketPromptVersions,
  listAiModels,
  listKnowledgeBases,
  publishAiTicketPrompt,
  restoreDefaultAiTicketPrompt,
  saveAiTicketPolicy,
  saveAiTicketPromptDraft,
  setAiAgentEnabled,
  updateAiAgent,
  validateAiTicketPrompt
} from '@/api/callcenter/ai-knowledge';
import type {
  AiAgentForm,
  AiAgentVO,
  AiModelVO,
  AiTicketPolicyVO,
  AiTicketPromptVO,
  AiTicketPromptVersionVO,
  Id,
  KnowledgeBaseVO
} from '@/api/callcenter/ai-knowledge/types';
import { listFormTemplates } from '@/api/callcenter/form-template';
import type { FormTemplate } from '@/api/callcenter/form-template/types';
import { listSkillGroups } from '@/api/callcenter/skill-group';
import type { SkillGroupVO } from '@/api/callcenter/skill-group/types';
import { deleteAiAgentWorkflowBinding, listAiAgentWorkflowBindings, listAiWorkflows, saveAiAgentWorkflowBinding } from '@/api/callcenter/ai-workflow';
import type { AiAgentWorkflowBindingForm, AiWorkflowScene, AiWorkflowVO } from '@/api/callcenter/ai-workflow/types';
import AiAgentTestDialog from './AiAgentTestDialog.vue';
const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const agents = ref<AiAgentVO[]>([]),
  chatModels = ref<AiModelVO[]>([]),
  bases = ref<KnowledgeBaseVO[]>([]),
  drawer = ref(false);
const activeTab = ref('basic');
const testVisible = ref(false);
const testAgent = ref<AiAgentVO>();
const ticketTemplates = ref<FormTemplate[]>([]);
const ticketSkillGroups = ref<SkillGroupVO[]>([]);
const ticketSaving = ref(false);
const promptSaving = ref(false);
const promptPublishing = ref(false);
const promptVersionName = ref('');
const promptVersions = ref<AiTicketPromptVersionVO[]>([]);
const promptPreviewVisible = ref(false);
const promptPreview = ref('');
type BindingScene = Exclude<AiWorkflowScene, 'COMMON'>;
const workflowOptions = ref<AiWorkflowVO[]>([]);
const workflowBindingSaving = ref<BindingScene>();
const workflowScenes: Array<{ label: string; value: BindingScene; description: string }> = [
  { label: '呼入语音', value: 'VOICE_INBOUND', description: 'DID/IVR 进入 AI 助手时使用' },
  { label: '外呼语音', value: 'VOICE_OUTBOUND', description: '自动外呼客户接听后使用' },
  { label: '在线客服', value: 'ONLINE_CHAT', description: 'AI 在线接待会话使用' }
];
const emptyWorkflowBinding = (sceneType: BindingScene): AiAgentWorkflowBindingForm => ({
  sceneType,
  workflowVersionId: '',
  fallbackAction: 'DEFAULT_CONVERSATION',
  enabled: true
});
const workflowBindingForms = reactive<Record<BindingScene, AiAgentWorkflowBindingForm>>({
  VOICE_INBOUND: emptyWorkflowBinding('VOICE_INBOUND'),
  VOICE_OUTBOUND: emptyWorkflowBinding('VOICE_OUTBOUND'),
  ONLINE_CHAT: emptyWorkflowBinding('ONLINE_CHAT')
});
const ticketPolicyDefaults = (agentId: Id = ''): AiTicketPolicyVO => ({
  aiAgentId: agentId,
  enabled: false,
  creationMode: 'DRAFT_REVIEW',
  ticketTemplateId: undefined,
  triggerTypes: ['CALL_ENDED'],
  includeIntents: [],
  excludeIntents: [],
  confidenceThreshold: 0.8,
  missingRequiredAction: 'KEEP_DRAFT',
  duplicatePolicy: 'MERGE_PENDING',
  duplicateWindowHours: 24,
  afterCreateAction: 'CREATE_ONLY',
  defaultValues: {}
});
const ticketPromptDefaults = (): AiTicketPromptVO => ({
  status: 'DEFAULT',
  promptContent: '',
  protocolVersion: 'AI_TICKET_JSON_V1',
  jsonSchema: '',
  safetyConstraints: '',
  availableVariables: [],
  requiredVariables: [],
  customPrompt: false
});
const ticketPolicy = ref<AiTicketPolicyVO>(ticketPolicyDefaults());
const ticketPrompt = ref<AiTicketPromptVO>(ticketPromptDefaults());
const promptVariableDescriptions: Record<string, string> = {
  agentName: '当前 AI 助手名称，例如“售后服务助手”。',
  conversation: '本次通话的完整转写对话，包含客户与 AI 的发言。',
  intent: '本次识别到的业务意图，例如“申请退款”或“产品咨询”。',
  customerProfile: '系统中已有的客户姓名、电话、客户类型及自定义资料。',
  ticketTemplateSchema: '所选工单模板的字段编码、名称、类型、选项及必填规则。',
  policyDefaults: '自动工单策略配置的默认字段值和业务默认项。',
  callContext: '通话 ID、呼入呼出方向、号码、时间、时长、线路及转人工情况。'
};
const defaults = (): AiAgentForm => ({
  agentCode: '',
  agentName: '',
  description: '',
  chatModelId: '',
  systemPrompt: `你是 CallNexus AI助手。请依据知识库准确回答，不要编造。
工作规则：
1. 优先根据系统提供的知识库内容回答。
2. 先归纳知识内容再回答用户问题，不要展示归纳或思考过程。
3. 直接回答，不要出现“根据知识库回答”等字眼。
4. 知识库中没有时，友善地回答用户问题，不要体现任何知识库字眼。
5. 已经发送了固定开场白：“您好，我是 CallNexus AI 助手，请问有什么可以帮您？”
6. 纯文本输出，不要使用 Markdown、加粗、列表符号。`,
  welcomeMessage: '您好，我是 CallNexus AI 助手，请问有什么可以帮您？',
  retrievalMode: 'RAG',
  retrievalFailurePolicy: 'FALLBACK_MODEL',
  faqLearningEnabled: false,
  faqLearningKnowledgeBaseId: undefined,
  topK: 5,
  scoreThreshold: 0.5,
  faqScoreThreshold: 0.8,
  temperature: 0.2,
  maxOutputTokens: 2048,
  historyMessageLimit: 10,
  systemAssistant: false,
  enabled: true,
  voiceTransport: 'HTTP',
  voiceTransportWsUrl: '',
  bargeInEnabled: false,
  openingBargeInEnabled: false,
  bargeInMode: 'STANDARD',
  bargeInGraceMs: 500,
  knowledgeBaseIds: []
});
const form = ref(defaults());
const numericValue = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const load = async () => {
  const [a, m, k, w] = await Promise.all([listAiAgents(), listAiModels('CHAT'), listKnowledgeBases(), listAiWorkflows()]);
  agents.value = a.data || [];
  chatModels.value = m.data || [];
  bases.value = (k.data || []).filter((item) => item.enabled);
  workflowOptions.value = (w.data || []).filter((item) => item.enabled && item.publishedVersionId);
};
const edit = async (row?: AiAgentVO) => {
  activeTab.value = 'basic';
  form.value = row
    ? {
        ...row,
        scoreThreshold: numericValue(row.scoreThreshold, 0.5),
        faqScoreThreshold: numericValue(row.faqScoreThreshold, 0.8),
        temperature: numericValue(row.temperature, 0.2),
        bargeInEnabled: Boolean(row.bargeInEnabled),
        openingBargeInEnabled: Boolean(row.openingBargeInEnabled),
        bargeInMode: row.bargeInMode || 'STANDARD',
        bargeInGraceMs: numericValue(row.bargeInGraceMs, 500),
        knowledgeBaseIds: [...row.knowledgeBaseIds]
      }
    : defaults();
  drawer.value = true;
  ticketPolicy.value = ticketPolicyDefaults(row?.id);
  ticketPrompt.value = ticketPromptDefaults();
  promptVersions.value = [];
  promptVersionName.value = '';
  resetWorkflowBindings();
  if (row?.id) await Promise.all([loadTicketConfiguration(row.id), loadWorkflowBindings(row.id)]);
};
const resetWorkflowBindings = () =>
  workflowScenes.forEach((scene) => Object.assign(workflowBindingForms[scene.value], emptyWorkflowBinding(scene.value)));
const loadWorkflowBindings = async (agentId: Id) => {
  resetWorkflowBindings();
  const bindings = (await listAiAgentWorkflowBindings(agentId)).data || [];
  bindings.forEach((binding) =>
    Object.assign(workflowBindingForms[binding.sceneType], {
      sceneType: binding.sceneType,
      workflowVersionId: binding.workflowVersionId,
      fallbackAction: binding.fallbackAction,
      enabled: binding.enabled
    })
  );
};
const workflowOptionsForScene = (scene: BindingScene) =>
  workflowOptions.value.filter((item) => item.sceneType === 'COMMON' || item.sceneType === scene);
const saveWorkflowBinding = async (scene: BindingScene) => {
  if (!form.value.id) return;
  workflowBindingSaving.value = scene;
  try {
    const binding = workflowBindingForms[scene];
    if (binding.workflowVersionId) await saveAiAgentWorkflowBinding(form.value.id, binding);
    else await deleteAiAgentWorkflowBinding(form.value.id, scene);
    proxy?.$modal.msgSuccess(binding.workflowVersionId ? 'AI 编排绑定已保存' : '已恢复普通 AI 对话');
    await loadWorkflowBindings(form.value.id);
  } finally {
    workflowBindingSaving.value = undefined;
  }
};
const loadTicketConfiguration = async (agentId: Id) => {
  const [policyResult, promptResult, versionsResult, templatesResult, skillGroupsResult] = await Promise.all([
    getAiTicketPolicy(agentId),
    getAiTicketPrompt(agentId),
    listAiTicketPromptVersions(agentId),
    listFormTemplates('TICKET'),
    listSkillGroups()
  ]);
  ticketPolicy.value = { ...ticketPolicyDefaults(agentId), ...(policyResult.data || {}) };
  ticketPrompt.value = { ...ticketPromptDefaults(), ...(promptResult.data || {}) };
  promptVersionName.value = ticketPrompt.value.versionName || '';
  promptVersions.value = versionsResult.data || [];
  ticketTemplates.value = (templatesResult.data || []).filter((item) => item.enabled);
  ticketSkillGroups.value = (skillGroupsResult.data || []).filter((item) => item.enabled);
};
const saveTicketPolicy = async () => {
  if (!form.value.id) return;
  ticketSaving.value = true;
  try {
    const { id, aiAgentId, activePromptVersionId, version, ...payload } = ticketPolicy.value;
    await saveAiTicketPolicy(form.value.id, payload);
    proxy?.$modal.msgSuccess('自动工单策略已保存');
    await loadTicketConfiguration(form.value.id);
  } finally {
    ticketSaving.value = false;
  }
};
const saveTicketPrompt = async () => {
  if (!form.value.id) return;
  promptSaving.value = true;
  try {
    await saveAiTicketPromptDraft(form.value.id, { promptContent: ticketPrompt.value.promptContent, versionName: promptVersionName.value });
    proxy?.$modal.msgSuccess('提示词草稿已保存');
    await loadTicketConfiguration(form.value.id);
  } finally {
    promptSaving.value = false;
  }
};
const validateTicketPrompt = async () => {
  if (!form.value.id) return;
  const result = await validateAiTicketPrompt(form.value.id, {
    promptContent: ticketPrompt.value.promptContent,
    versionName: promptVersionName.value
  });
  if (!result.data.valid) {
    proxy?.$modal.msgError(result.data.errors.join('；'));
    return;
  }
  promptPreview.value = result.data.compiledPreview || '';
  promptPreviewVisible.value = true;
};
const publishTicketPrompt = async () => {
  if (!form.value.id) return;
  await proxy?.$modal.confirm('发布后，新生成的工单草稿将使用该版本。确认发布吗？');
  promptPublishing.value = true;
  try {
    await saveAiTicketPromptDraft(form.value.id, { promptContent: ticketPrompt.value.promptContent, versionName: promptVersionName.value });
    await publishAiTicketPrompt(form.value.id);
    proxy?.$modal.msgSuccess('提示词版本已发布');
    await loadTicketConfiguration(form.value.id);
  } finally {
    promptPublishing.value = false;
  }
};
const restoreTicketPrompt = async () => {
  if (!form.value.id) return;
  await proxy?.$modal.confirm('确认使用系统默认提示词覆盖当前未发布草稿吗？');
  await restoreDefaultAiTicketPrompt(form.value.id);
  await loadTicketConfiguration(form.value.id);
};
const insertPromptVariable = (variable: string) => {
  const token = `{{${variable}}}`;
  ticketPrompt.value.promptContent = `${ticketPrompt.value.promptContent}${ticketPrompt.value.promptContent.endsWith('\n') ? '' : '\n'}${token}`;
};
const formatPromptVariable = (variable: string) => `{{${variable}}}`;
const promptStatusLabel = (status: string) =>
  ({ DEFAULT: '系统默认', DRAFT: '未发布草稿', PUBLISHED: '已发布', ARCHIVED: '历史版本' })[status] || status;
const openTest = (row: AiAgentVO) => {
  testAgent.value = row;
  testVisible.value = true;
};
const testSaved = async (savedAgent: AiAgentVO) => {
  testAgent.value = savedAgent;
  await load();
};
const save = async () => {
  const payload: AiAgentForm = {
    ...form.value,
    scoreThreshold: numericValue(form.value.scoreThreshold, 0.5),
    faqScoreThreshold: numericValue(form.value.faqScoreThreshold, 0.8),
    temperature: numericValue(form.value.temperature, 0.2),
    bargeInGraceMs: numericValue(form.value.bargeInGraceMs, 500)
  };
  if (payload.retrievalFailurePolicy !== 'FALLBACK_MODEL') {
    payload.faqLearningEnabled = false;
    payload.faqLearningKnowledgeBaseId = undefined;
  }
  payload.id ? await updateAiAgent(payload.id, payload) : await createAiAgent(payload);
  drawer.value = false;
  proxy?.$modal.msgSuccess('保存成功');
  await load();
};
const toggle = async (row: AiAgentVO) => {
  await setAiAgentEnabled(row.id, !row.enabled);
  await load();
};
const remove = async (row: AiAgentVO) => {
  await proxy?.$modal.confirm(`确认删除助手“${row.agentName}”吗？`);
  await deleteAiAgent(row.id);
  await load();
};
onMounted(load);
</script>
<style scoped lang="scss">
:global(.ai-agent-edit-drawer .el-drawer__body) {
  padding: 16px 20px 8px;
  background: #f5f8fc;
}

.agent-edit-form {
  min-height: 100%;
}

.agent-config-tabs {
  :deep(.el-tabs__header) {
    margin: 0 0 16px;
    padding: 0 4px;
  }

  :deep(.el-tabs__nav-wrap::after) {
    height: 1px;
    background: #e8eef6;
  }

  :deep(.el-tabs__item) {
    height: 42px;
    color: #5b6b82;
    font-weight: 600;
  }

  :deep(.el-tabs__item.is-active) {
    color: #1d4ed8;
  }

  :deep(.el-tabs__content) {
    padding: 0 2px 8px;
  }
}

.edit-section {
  margin-bottom: 14px;
  padding: 16px 18px 6px;
  border: 1px solid #e4ecf6;
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff, #f8fbff);
}

.edit-section-title {
  margin-bottom: 12px;
  color: #15233d;
  font-size: 14px;
  font-weight: 700;
}

.switch-block,
.barge-in-setting {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
}

.field-hint {
  margin: 8px 0 0;
  color: #7b8798;
  font-size: 12px;
  line-height: 1.65;
}

.workflow-binding-row {
  display: grid;
  grid-template-columns: 180px minmax(260px, 1fr) 170px 90px 72px;
  gap: 12px;
  align-items: center;
  padding: 14px 0;
  border-bottom: 1px solid #e8eef6;
}

.workflow-binding-row:last-child {
  border-bottom: 0;
}

.workflow-scene {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.workflow-scene span {
  color: #7b8798;
  font-size: 12px;
}

.ticket-section-title,
.section-actions,
.prompt-variable-list {
  display: flex;
  align-items: center;
}

.prompt-variable-help {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 14px;
  margin-top: 12px;
  padding: 12px 14px;
  border: 1px solid #e4eaf2;
  border-radius: 10px;
  background: #f8fafc;
}

.prompt-variable-help-item {
  display: grid;
  grid-template-columns: max-content 1fr max-content;
  gap: 8px;
  align-items: start;
  color: #68758a;
  font-size: 12px;
  line-height: 1.55;

  code {
    color: #1d4ed8;
    font-family: Consolas, monospace;
  }
}

@media (max-width: 900px) {
  .prompt-variable-help {
    grid-template-columns: 1fr;
  }
}

.ticket-section-title {
  justify-content: space-between;
}

.section-actions {
  justify-content: flex-end;
  gap: 8px;
  margin: 4px 0 12px;
}

.prompt-editor-wrap {
  width: 100%;
}

.prompt-variable-list {
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.variable-tag {
  cursor: pointer;
  font-family: Consolas, monospace;
}

.readonly-protocol {
  max-height: 360px;
  margin: 0;
  padding: 14px;
  overflow: auto;
  border: 1px solid #e4eaf2;
  border-radius: 8px;
  background: #f7f9fc;
  color: #44546a;
  font:
    12px/1.65 Consolas,
    monospace;
  white-space: pre-wrap;
}
</style>
