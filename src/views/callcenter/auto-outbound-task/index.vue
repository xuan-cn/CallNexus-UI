<template>
  <div class="app-container auto-outbound-page">
    <div class="page-heading">
      <div>
        <h2>自动外呼</h2>
        <p>统一管理任务配置、外呼名单、运行状态和呼叫统计。</p>
      </div>
      <el-button v-hasPermi="['callcenter:auto-outbound-task:create']" type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon>新增任务
      </el-button>
    </div>

    <div class="task-workspace">
      <aside class="task-sidebar">
        <div class="sidebar-heading">
          <div>
            <strong>外呼任务</strong>
            <span>共 {{ filteredTasks.length }} 项</span>
          </div>
          <el-button circle plain title="刷新任务" :loading="loading" @click="load"
            ><el-icon><Refresh /></el-icon
          ></el-button>
        </div>
        <el-input v-model="query.keyword" clearable placeholder="搜索任务名称或编码" @input="applyFilter">
          <template #prefix
            ><el-icon><Search /></el-icon
          ></template>
        </el-input>
        <div class="sidebar-filters">
          <el-select v-model="query.dialMode" clearable placeholder="全部模式" @change="applyFilter">
            <el-option v-for="item in dialModeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-select v-model="query.status" clearable placeholder="全部状态" @change="applyFilter">
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </div>
        <div v-loading="loading" class="task-list">
          <button
            v-for="task in filteredTasks"
            :key="task.id"
            type="button"
            class="task-item"
            :class="{ active: String(selectedTaskId) === String(task.id) }"
            @click="selectTask(task)"
          >
            <div class="task-item-top">
              <strong>{{ task.taskName }}</strong>
              <el-tag size="small" :type="statusType(task.status)">{{ statusLabel(task.status) }}</el-tag>
            </div>
            <div class="task-code">{{ task.taskCode }}</div>
            <el-progress :percentage="progress(task)" :stroke-width="6" :show-text="false" />
            <div class="task-progress">
              <span>{{ dialModeLabel(task.dialMode) }}</span>
              <span>{{ task.completedCount }}/{{ task.totalCount }}</span>
            </div>
          </button>
          <el-empty v-if="!loading && filteredTasks.length === 0" :image-size="74" description="暂无自动外呼任务" />
        </div>
      </aside>

      <main v-if="selectedTask" class="task-detail">
        <header class="detail-header">
          <div class="task-identity">
            <span class="task-avatar">{{ selectedTask.taskName.slice(0, 1) }}</span>
            <div>
              <div class="task-title-line">
                <h3>{{ selectedTask.taskName }}</h3>
                <el-tag :type="statusType(selectedTask.status)">{{ statusLabel(selectedTask.status) }}</el-tag>
              </div>
              <div class="task-meta">
                <span>{{ selectedTask.taskCode }}</span>
                <span>{{ dialModeLabel(selectedTask.dialMode) }}</span>
                <span>{{ callWindowSummary(selectedTask) }}</span>
              </div>
            </div>
          </div>
          <div class="detail-actions">
            <el-button v-hasPermi="['callcenter:auto-outbound-task:query']" type="primary" plain @click="memberDrawerRef?.open(selectedTask)"
              >名单管理</el-button
            >
            <el-tooltip :disabled="selectedTask.totalCount > 0 || selectedTask.status === 'RUNNING'" content="请先生成外呼名单">
              <span>
                <el-button
                  v-hasPermi="['callcenter:auto-outbound-task:execute']"
                  :type="primaryActionType(selectedTask)"
                  :disabled="selectedTask.totalCount === 0 && selectedTask.status !== 'RUNNING'"
                  @click="handlePrimaryAction(selectedTask)"
                  >{{ primaryActionLabel(selectedTask) }}</el-button
                >
              </span>
            </el-tooltip>
            <el-button
              v-hasPermi="['callcenter:auto-outbound-task:update']"
              :disabled="selectedTask.status === 'RUNNING'"
              @click="handleEdit(selectedTask)"
              >修改配置</el-button
            >
            <el-dropdown trigger="click" @command="(command) => handleMoreCommand(command, selectedTask)">
              <el-button
                >更多<el-icon class="more-arrow"><ArrowDown /></el-icon
              ></el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-hasPermi="['callcenter:auto-outbound-task:query']" command="monitor">详细调度监控</el-dropdown-item>
                  <el-dropdown-item
                    v-if="!['COMPLETED', 'STOPPED'].includes(selectedTask.status)"
                    v-hasPermi="['callcenter:auto-outbound-task:execute']"
                    command="stop"
                    divided
                    >停止任务</el-dropdown-item
                  >
                  <el-dropdown-item
                    v-hasPermi="['callcenter:auto-outbound-task:delete']"
                    command="delete"
                    :disabled="selectedTask.status === 'RUNNING'"
                    >删除任务</el-dropdown-item
                  >
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </header>

        <el-tabs v-model="detailTab" class="detail-tabs">
          <el-tab-pane label="概览" name="overview">
            <div v-loading="monitorLoading" class="overview-content">
              <div class="metric-grid">
                <div v-for="item in overviewMetrics" :key="item.label" class="metric-card" :class="item.tone">
                  <span class="metric-icon"
                    ><el-icon><component :is="item.icon" /></el-icon
                  ></span>
                  <div>
                    <span>{{ item.label }}</span
                    ><strong>{{ item.value }}</strong
                    ><small>{{ item.description }}</small>
                  </div>
                </div>
              </div>

              <div class="statistics-grid">
                <section class="statistics-panel">
                  <div class="panel-heading">
                    <div>
                      <h4>任务进度</h4>
                      <p>当前名单在各执行阶段的实时分布</p>
                    </div>
                    <strong>{{ progress(selectedTask) }}%</strong>
                  </div>
                  <div class="progress-overview">
                    <div v-for="item in executionDistribution" :key="item.label" class="progress-row">
                      <div class="progress-label">
                        <span>{{ item.label }}</span
                        ><strong>{{ item.value }}</strong>
                      </div>
                      <el-progress :percentage="item.percentage" :stroke-width="8" :show-text="false" :color="item.color" />
                    </div>
                  </div>
                </section>

                <section class="statistics-panel">
                  <div class="panel-heading">
                    <div>
                      <h4>失败原因分布</h4>
                      <p>今日未接通呼叫的分类统计</p>
                    </div>
                    <span class="panel-total">共 {{ todayFailedCount }} 次</span>
                  </div>
                  <div v-if="failureDistribution.length" class="failure-distribution">
                    <div v-for="item in failureDistribution" :key="item.category" class="failure-row">
                      <div class="failure-label">
                        <span>{{ item.categoryLabel }}</span>
                        <small>{{ item.retryable ? '允许重试' : '不再重试' }}</small>
                        <strong>{{ item.count }}</strong>
                      </div>
                      <el-progress
                        :percentage="item.percentage"
                        :stroke-width="8"
                        :show-text="false"
                        :color="item.retryable ? '#e6a23c' : '#ef6b73'"
                      />
                    </div>
                  </div>
                  <el-empty v-else :image-size="74" description="今日暂无失败呼叫" />
                </section>
              </div>

              <section class="runtime-panel">
                <div class="runtime-item">
                  <span>实时并发</span><strong>{{ monitor?.activeConcurrency || 0 }}</strong>
                </div>
                <div class="runtime-item">
                  <span>排队等待</span><strong>{{ monitor?.queuedCount || 0 }}</strong>
                </div>
                <div class="runtime-item">
                  <span>最近调度</span><strong class="runtime-text">{{ monitor?.lastScheduledAt || '尚未调度' }}</strong>
                </div>
                <div class="runtime-item runtime-summary">
                  <span>调度摘要</span><strong class="runtime-text">{{ monitor?.lastScheduleSummary || '暂无调度记录' }}</strong>
                </div>
              </section>
            </div>
          </el-tab-pane>
          <el-tab-pane label="任务数据" name="data">
            <div class="task-data-grid">
              <section>
                <h4>拨打策略</h4>
                <el-descriptions :column="2" border>
                  <el-descriptions-item label="接听目标">{{ targetLabel(selectedTask) }}</el-descriptions-item>
                  <el-descriptions-item label="任务时区">{{ selectedTask.scheduleTimezone }}</el-descriptions-item>
                  <el-descriptions-item label="任务并发">{{ selectedTask.concurrencyLimit }}</el-descriptions-item>
                  <el-descriptions-item label="每分钟呼叫">{{ selectedTask.callsPerMinute }}</el-descriptions-item>
                  <el-descriptions-item label="单客户每日上限">{{ selectedTask.maxCallsPerDay }}</el-descriptions-item>
                  <el-descriptions-item label="单客户累计上限">{{ selectedTask.maxCallsTotal }}</el-descriptions-item>
                </el-descriptions>
              </section>
              <section>
                <h4>名单数据</h4>
                <div class="member-summary">
                  <div>
                    <span>全部名单</span><strong>{{ selectedTask.totalCount }}</strong>
                  </div>
                  <div>
                    <span>待处理</span><strong>{{ selectedTask.pendingCount }}</strong>
                  </div>
                  <div>
                    <span>执行中</span><strong>{{ selectedTask.activeCount }}</strong>
                  </div>
                  <div>
                    <span>已完成</span><strong>{{ selectedTask.completedCount }}</strong>
                  </div>
                </div>
                <el-button type="primary" plain @click="memberDrawerRef?.open(selectedTask)">查看和管理外呼名单</el-button>
              </section>
            </div>
          </el-tab-pane>
        </el-tabs>
      </main>
      <main v-else class="task-detail empty-detail"><el-empty description="请选择或新建一个自动外呼任务" /></main>
    </div>

    <el-drawer v-model="drawer.visible" :title="drawer.title" size="760px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-tabs v-model="drawer.tab">
          <el-tab-pane label="基础设置" name="base">
            <el-row :gutter="18">
              <el-col :span="12"
                ><el-form-item label="任务编码" prop="taskCode"><el-input v-model="form.taskCode" maxlength="32" /></el-form-item
              ></el-col>
              <el-col :span="12"
                ><el-form-item label="任务名称" prop="taskName"><el-input v-model="form.taskName" maxlength="64" /></el-form-item
              ></el-col>
              <el-col :span="12"
                ><el-form-item label="拨打模式" prop="dialMode"
                  ><el-select v-model="form.dialMode" class="full" @change="handleModeChange"
                    ><el-option v-for="item in dialModeOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item
              ></el-col>
              <el-col :span="12"
                ><el-form-item :label="targetFieldLabel" prop="targetId"
                  ><el-select v-model="form.targetId" class="full" filterable
                    ><el-option
                      v-for="item in currentTargetOptions"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value" /></el-select></el-form-item
              ></el-col>
              <el-col :span="12"
                ><el-form-item label="执行节点" prop="nodeId"
                  ><el-select v-model="form.nodeId" class="full" filterable @change="handleNodeChange"
                    ><el-option v-for="item in nodeOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item
              ></el-col>
              <el-col :span="12"
                ><el-form-item label="指定外呼策略"
                  ><el-select
                    v-model="form.outboundLinePolicyId"
                    class="full"
                    clearable
                    filterable
                    placeholder="留空时使用技能组或节点默认策略"
                    @change="handlePolicyChange"
                    ><el-option
                      v-for="item in availablePolicyOptions"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value" /></el-select></el-form-item
              ></el-col>
              <el-col :span="12"
                ><el-form-item label="指定外显号码"
                  ><el-select
                    v-model="form.callerNumberId"
                    class="full"
                    clearable
                    filterable
                    placeholder="可选；选择后不再按策略选线"
                    @change="handleCallerNumberChange"
                    ><el-option
                      v-for="item in availableCallerNumberOptions"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value" /></el-select></el-form-item
              ></el-col>
              <el-col :span="12"
                ><el-form-item label="任务时区" prop="scheduleTimezone"
                  ><el-select v-model="form.scheduleTimezone" class="full"
                    ><el-option label="中国标准时间" value="Asia/Shanghai" /><el-option label="UTC" value="UTC" /></el-select></el-form-item
              ></el-col>
              <el-col :span="24"
                ><el-form-item label="任务说明"
                  ><el-input v-model="form.description" type="textarea" :rows="4" maxlength="500" show-word-limit /></el-form-item
              ></el-col>
            </el-row>
          </el-tab-pane>

          <el-tab-pane label="拨打策略" name="policy">
            <el-alert title="任务限制会与租户及线路容量共同生效，实际拨打采用其中最小值。" type="info" :closable="false" show-icon />
            <el-row :gutter="18" class="policy-grid">
              <el-col :span="12"
                ><el-form-item label="任务并发" prop="concurrencyLimit"
                  ><el-input-number v-model="form.concurrencyLimit" :min="1" :max="500" /></el-form-item
              ></el-col>
              <el-col :span="12"
                ><el-form-item label="每分钟呼叫" prop="callsPerMinute"
                  ><el-input-number v-model="form.callsPerMinute" :min="1" :max="3000" /></el-form-item
              ></el-col>
              <el-col :span="12"
                ><el-form-item label="每日最多" prop="maxCallsPerDay"
                  ><el-input-number v-model="form.maxCallsPerDay" :min="1" :max="100" /><span class="unit">次/客户</span></el-form-item
                ></el-col
              >
              <el-col :span="12"
                ><el-form-item label="任务累计最多" prop="maxCallsTotal"
                  ><el-input-number v-model="form.maxCallsTotal" :min="1" :max="1000" /><span class="unit">次/客户</span></el-form-item
                ></el-col
              >
              <el-col :span="12"
                ><el-form-item label="最小拨打间隔" prop="minCallIntervalMinutes"
                  ><el-input-number v-model="form.minCallIntervalMinutes" :min="1" :max="43200" /><span class="unit">分钟</span></el-form-item
                ></el-col
              >
            </el-row>
          </el-tab-pane>

          <el-tab-pane label="呼叫时段" name="windows">
            <div class="section-header">
              <span>只在下列启用时段内发起新呼叫</span
              ><el-button type="primary" plain @click="addCallWindow"
                ><el-icon><Plus /></el-icon>添加时段</el-button
              >
            </div>
            <div v-for="(window, index) in form.callWindows" :key="index" class="policy-row window-row">
              <el-switch v-model="window.enabled" />
              <el-select v-model="window.weekdays" multiple collapse-tags :max-collapse-tags="3" placeholder="选择星期" class="week-select">
                <el-option v-for="item in weekdayOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
              <el-time-picker v-model="window.startTime" value-format="HH:mm:ss" format="HH:mm" placeholder="开始" />
              <span>至</span>
              <el-time-picker v-model="window.endTime" value-format="HH:mm:ss" format="HH:mm" placeholder="结束" />
              <el-button link type="danger" :disabled="form.callWindows.length === 1" @click="form.callWindows.splice(index, 1)">删除</el-button>
            </div>
          </el-tab-pane>

          <el-tab-pane label="重试规则" name="retry">
            <el-alert title="达到单个客户的每日或累计呼叫上限后，即使规则允许也不会继续重试。" type="info" :closable="false" show-icon />
            <div class="retry-table">
              <div class="retry-head"><span>结果</span><span>启用</span><span>最大重试</span><span>间隔（分钟）</span></div>
              <div v-for="rule in form.retryRules" :key="rule.resultCode" class="retry-line">
                <span>{{ retryResultLabel(rule.resultCode) }}</span>
                <el-switch v-model="rule.retryEnabled" />
                <el-input-number v-model="rule.maxRetryCount" :min="0" :max="10" :disabled="!rule.retryEnabled" />
                <el-input-number v-model="rule.retryIntervalMinutes" :min="1" :max="10080" :disabled="!rule.retryEnabled" />
              </div>
            </div>
          </el-tab-pane>
          <el-tab-pane label="结果回写" name="writeback">
            <el-alert
              title="通话结束后自动生成客户跟进记录；标签只追加到客户当前有效归属，不覆盖已有标签。"
              type="info"
              :closable="false"
              show-icon
            />
            <el-row :gutter="18" class="policy-grid">
              <el-col :span="24"
                ><el-form-item label="写入跟进记录"><el-switch v-model="form.resultWritebackEnabled" /></el-form-item
              ></el-col>
              <el-col :span="12"
                ><el-form-item label="接通标签"
                  ><el-input
                    v-model="form.connectedTag"
                    :disabled="!form.resultWritebackEnabled"
                    maxlength="64"
                    placeholder="例如：自动外呼已接通" /></el-form-item
              ></el-col>
              <el-col :span="12"
                ><el-form-item label="未接通标签"
                  ><el-input
                    v-model="form.failedTag"
                    :disabled="!form.resultWritebackEnabled"
                    maxlength="64"
                    placeholder="例如：自动外呼待重试" /></el-form-item
              ></el-col>
            </el-row>
          </el-tab-pane>
        </el-tabs>
      </el-form>
      <template #footer>
        <el-button @click="drawer.visible = false">取消</el-button>
        <el-button type="primary" :loading="drawer.saving" @click="submit">保存任务</el-button>
      </template>
    </el-drawer>
    <MemberDrawer ref="memberDrawerRef" />
    <MonitorDrawer ref="monitorDrawerRef" />
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import { ArrowDown, Check, DataAnalysis, Phone, Plus, Refresh, Search, User } from '@element-plus/icons-vue';
import MemberDrawer from './MemberDrawer.vue';
import MonitorDrawer from './MonitorDrawer.vue';
import {
  createAutoOutboundTask,
  deleteAutoOutboundTask,
  getAutoOutboundTask,
  getAutoOutboundMonitor,
  listAutoOutboundTasks,
  pauseAutoOutboundTask,
  resumeAutoOutboundTask,
  rerunAutoOutboundTask,
  startAutoOutboundTask,
  stopAutoOutboundTask,
  updateAutoOutboundTask
} from '@/api/callcenter/auto-outbound-task';
import type {
  AutoOutboundDialMode,
  AutoOutboundMonitorVO,
  AutoOutboundRetryResult,
  AutoOutboundStatus,
  AutoOutboundTaskForm,
  AutoOutboundTaskVO
} from '@/api/callcenter/auto-outbound-task/types';
import { listAiAgents } from '@/api/callcenter/ai-knowledge';
import { listIvrFlows } from '@/api/callcenter/ivr-flow';
import { listSkillGroups } from '@/api/callcenter/skill-group';
import { listPhoneNumbers } from '@/api/callcenter/phone-number';
import { listFreeSwitchNodes } from '@/api/callcenter/freeswitch-node';
import { listOutboundLinePolicies } from '@/api/callcenter/outbound-line-policy';

const { proxy } = getCurrentInstance()!;
const loading = ref(false);
const tasks = ref<AutoOutboundTaskVO[]>([]);
const filteredTasks = ref<AutoOutboundTaskVO[]>([]);
const selectedTaskId = ref<string | number>();
const detailTab = ref('overview');
const monitorLoading = ref(false);
const monitor = ref<AutoOutboundMonitorVO>();
const formRef = ref<FormInstance>();
const memberDrawerRef = ref<InstanceType<typeof MemberDrawer>>();
const monitorDrawerRef = ref<InstanceType<typeof MonitorDrawer>>();
const query = reactive<{ keyword: string; dialMode?: AutoOutboundDialMode; status?: AutoOutboundStatus }>({ keyword: '' });
const drawer = reactive({ visible: false, saving: false, title: '', tab: 'base', id: undefined as string | number | undefined });
const aiOptions = ref<Array<{ label: string; value: string | number }>>([]);
const ivrOptions = ref<Array<{ label: string; value: string | number }>>([]);
const skillGroupOptions = ref<Array<{ label: string; value: string | number }>>([]);
const nodeOptions = ref<Array<{ label: string; value: string | number }>>([]);
const callerNumberOptions = ref<Array<{ label: string; value: string | number; nodeId: string | number }>>([]);
const policyOptions = ref<Array<{ label: string; value: string | number; nodeId: string | number }>>([]);

const dialModeOptions = [
  { label: 'AI 自动外呼', value: 'AGENTLESS_AI' as const },
  { label: 'IVR 自动外呼', value: 'AGENTLESS_IVR' as const },
  { label: '渐进式人工外呼', value: 'PROGRESSIVE' as const }
];
const statusOptions = [
  { label: '草稿', value: 'DRAFT' },
  { label: '运行中', value: 'RUNNING' },
  { label: '已暂停', value: 'PAUSED' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '已停止', value: 'STOPPED' }
];
const weekdayOptions = [
  { label: '周一', value: 1 },
  { label: '周二', value: 2 },
  { label: '周三', value: 3 },
  { label: '周四', value: 4 },
  { label: '周五', value: 5 },
  { label: '周六', value: 6 },
  { label: '周日', value: 7 }
];

const defaultRetryRules = () => [
  { resultCode: 'NO_ANSWER' as const, retryEnabled: true, maxRetryCount: 2, retryIntervalMinutes: 30 },
  { resultCode: 'BUSY' as const, retryEnabled: true, maxRetryCount: 2, retryIntervalMinutes: 15 },
  { resultCode: 'FAILED' as const, retryEnabled: true, maxRetryCount: 1, retryIntervalMinutes: 10 },
  { resultCode: 'OTHER' as const, retryEnabled: false, maxRetryCount: 0, retryIntervalMinutes: 30 }
];
const emptyForm = (): AutoOutboundTaskForm => ({
  taskCode: '',
  taskName: '',
  description: '',
  nodeId: undefined,
  callerNumberId: undefined,
  outboundLinePolicyId: undefined,
  dialMode: 'AGENTLESS_AI',
  targetType: 'AI_AGENT',
  targetId: undefined,
  skillGroupId: undefined,
  concurrencyLimit: 1,
  callsPerMinute: 10,
  maxCallsPerDay: 1,
  maxCallsTotal: 3,
  minCallIntervalMinutes: 30,
  scheduleTimezone: 'Asia/Shanghai',
  resultWritebackEnabled: true,
  connectedTag: '自动外呼已接通',
  failedTag: '自动外呼未接通',
  callWindows: [{ weekdays: [1, 2, 3, 4, 5], startTime: '09:00:00', endTime: '18:00:00', enabled: true }],
  retryRules: defaultRetryRules()
});
const form = reactive<AutoOutboundTaskForm>(emptyForm());
const rules: FormRules = {
  taskCode: [{ required: true, message: '请输入任务编码', trigger: 'blur' }],
  taskName: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  nodeId: [{ required: true, message: '请选择执行节点', trigger: 'change' }],
  dialMode: [{ required: true, message: '请选择拨打模式', trigger: 'change' }],
  targetId: [{ required: true, message: '请选择接听目标', trigger: 'change' }],
  scheduleTimezone: [{ required: true, message: '请选择任务时区', trigger: 'change' }]
};

const currentTargetOptions = computed(() =>
  form.dialMode === 'AGENTLESS_AI' ? aiOptions.value : form.dialMode === 'AGENTLESS_IVR' ? ivrOptions.value : skillGroupOptions.value
);
const targetFieldLabel = computed(() => (form.dialMode === 'AGENTLESS_AI' ? 'AI 助手' : form.dialMode === 'AGENTLESS_IVR' ? 'IVR 流程' : '技能组'));
const availableCallerNumberOptions = computed(() => callerNumberOptions.value.filter((item) => String(item.nodeId) === String(form.nodeId)));
const availablePolicyOptions = computed(() => policyOptions.value.filter((item) => String(item.nodeId) === String(form.nodeId)));
const selectedTask = computed(() => tasks.value.find((item) => String(item.id) === String(selectedTaskId.value)));
const overviewMetrics = computed(() => {
  const task = selectedTask.value;
  const data = monitor.value;
  return [
    { label: '未呼客户', value: task?.pendingCount || 0, description: '尚未进入拨打流程', tone: 'orange', icon: User },
    {
      label: '已呼客户',
      value: Math.max(0, (task?.totalCount || 0) - (task?.pendingCount || 0)),
      description: `全部名单 ${task?.totalCount || 0}`,
      tone: 'cyan',
      icon: Phone
    },
    { label: '今日接通', value: data?.todayAnsweredCount || 0, description: `今日呼叫 ${data?.todayCallCount || 0}`, tone: 'blue', icon: Check },
    {
      label: '今日接通率',
      value: `${(data?.todayAnswerRate || 0).toFixed(1)}%`,
      description: '按今日实际呼叫计算',
      tone: 'red',
      icon: DataAnalysis
    }
  ];
});
const executionDistribution = computed(() => {
  const task = selectedTask.value;
  const data = monitor.value;
  const total = Math.max(task?.totalCount || 0, 1);
  const rows = [
    { label: '待调度', value: data?.pendingCount ?? task?.pendingCount ?? 0, color: '#e6a23c' },
    { label: '已生成调度', value: data?.scheduledCount || 0, color: '#409eff' },
    { label: '处理中/拨打中', value: (data?.processingCount || 0) + (data?.dialingCount || 0), color: '#7c6ff0' },
    { label: '已完成', value: data?.completedCount ?? task?.completedCount ?? 0, color: '#20b486' }
  ];
  return rows.map((item) => ({ ...item, percentage: Math.min(100, Math.round((item.value * 100) / total)) }));
});
const failureDistribution = computed(() => {
  const rows = monitor.value?.failureMetrics || [];
  const total = Math.max(
    rows.reduce((sum, item) => sum + item.count, 0),
    1
  );
  return rows.map((item) => ({ ...item, percentage: Math.round((item.count * 100) / total) }));
});
const todayFailedCount = computed(() => Math.max(0, (monitor.value?.todayCallCount || 0) - (monitor.value?.todayAnsweredCount || 0)));
let monitorRefreshTimer: ReturnType<typeof setInterval> | undefined;

const loadSelectedMonitor = async () => {
  const task = selectedTask.value;
  if (!task) {
    monitor.value = undefined;
    return;
  }
  monitorLoading.value = true;
  try {
    monitor.value = (await getAutoOutboundMonitor(task.id)).data;
  } finally {
    monitorLoading.value = false;
  }
};

const selectTask = async (task: AutoOutboundTaskVO) => {
  if (String(selectedTaskId.value) === String(task.id) && monitor.value) return;
  selectedTaskId.value = task.id;
  detailTab.value = 'overview';
  await loadSelectedMonitor();
};

const load = async () => {
  loading.value = true;
  try {
    tasks.value = (await listAutoOutboundTasks()).data;
    applyFilter();
    await loadSelectedMonitor();
  } finally {
    loading.value = false;
  }
};
const loadOptions = async () => {
  const [agents, flows, groups, nodes, numbers, policies] = await Promise.all([
    listAiAgents(),
    listIvrFlows(),
    listSkillGroups(),
    listFreeSwitchNodes({ pageNum: 1, pageSize: 1000, enabled: true }),
    listPhoneNumbers({ pageNum: 1, pageSize: 1000, enabled: true }),
    listOutboundLinePolicies({ pageNum: 1, pageSize: 1000, enabled: true })
  ]);
  const agentRows = agents.data || [];
  const flowRows = flows.data || [];
  const groupRows = groups.data || [];
  const nodeRows = nodes.rows || [];
  const numberRows = numbers.rows || [];
  const policyRows = policies.rows || [];
  aiOptions.value = agentRows.filter((item) => item.enabled).map((item) => ({ label: item.agentName, value: item.id }));
  ivrOptions.value = flowRows
    .filter((item) => item.enabled && item.publishStatus === 'PUBLISHED')
    .map((item) => ({ label: item.flowName, value: item.id }));
  skillGroupOptions.value = groupRows.filter((item) => item.enabled).map((item) => ({ label: item.groupName, value: item.id }));
  nodeOptions.value = nodeRows.filter((item) => item.enabled).map((item) => ({ label: item.nodeName, value: item.id }));
  callerNumberOptions.value = numberRows
    .filter((item) => item.gatewayId && ['CALLER_ID', 'BOTH'].includes(item.numberType))
    .map((item) => ({
      label: `${item.number} - ${item.numberName || item.gatewayName || '外显号码'}`,
      value: item.id,
      nodeId: item.nodeId
    }));
  policyOptions.value = policyRows.map((item) => ({
    label: `${item.policyName}（${item.policyType === 'FIXED' ? '固定' : item.policyType === 'ROUND_ROBIN' ? '轮询' : '权重'}）`,
    value: item.id,
    nodeId: item.nodeId
  }));
};
const applyFilter = () => {
  const keyword = query.keyword.trim().toLowerCase();
  filteredTasks.value = tasks.value.filter(
    (item) =>
      (!keyword || item.taskName.toLowerCase().includes(keyword) || item.taskCode.toLowerCase().includes(keyword)) &&
      (!query.dialMode || item.dialMode === query.dialMode) &&
      (!query.status || item.status === query.status)
  );
  if (!filteredTasks.value.some((item) => String(item.id) === String(selectedTaskId.value))) {
    selectedTaskId.value = filteredTasks.value[0]?.id;
    monitor.value = undefined;
    void loadSelectedMonitor();
  }
};
const resetQuery = () => {
  query.keyword = '';
  query.dialMode = undefined;
  query.status = undefined;
  applyFilter();
};
const resetForm = () => Object.assign(form, emptyForm());
const handleAdd = async () => {
  resetForm();
  await loadOptions();
  drawer.id = undefined;
  drawer.title = '新增自动外呼任务';
  drawer.tab = 'base';
  drawer.visible = true;
};
const handleEdit = async (row: AutoOutboundTaskVO) => {
  resetForm();
  await loadOptions();
  Object.assign(form, (await getAutoOutboundTask(row.id)).data);
  drawer.id = row.id;
  drawer.title = '修改自动外呼任务';
  drawer.tab = 'base';
  drawer.visible = true;
};
const handleModeChange = (mode: AutoOutboundDialMode) => {
  form.targetId = undefined;
  form.targetType = mode === 'AGENTLESS_AI' ? 'AI_AGENT' : mode === 'AGENTLESS_IVR' ? 'IVR_FLOW' : 'SKILL_GROUP';
};
const handleNodeChange = () => {
  if (!availableCallerNumberOptions.value.some((item) => String(item.value) === String(form.callerNumberId))) {
    form.callerNumberId = undefined;
  }
  if (!availablePolicyOptions.value.some((item) => String(item.value) === String(form.outboundLinePolicyId))) {
    form.outboundLinePolicyId = undefined;
  }
};
const handlePolicyChange = (value?: string | number) => {
  if (value != null && value !== '') form.callerNumberId = undefined;
};
const handleCallerNumberChange = (value?: string | number) => {
  if (value != null && value !== '') form.outboundLinePolicyId = undefined;
};
const addCallWindow = () => form.callWindows.push({ weekdays: [1, 2, 3, 4, 5], startTime: '09:00:00', endTime: '18:00:00', enabled: true });
const submit = async () => {
  if (!(await formRef.value?.validate())) return;
  if (!form.callWindows.length || form.callWindows.some((item) => !item.weekdays.length || !item.startTime || !item.endTime)) {
    proxy?.$modal.msgWarning('请完整配置至少一个呼叫时段');
    return;
  }
  drawer.saving = true;
  try {
    drawer.id ? await updateAutoOutboundTask(drawer.id, form) : await createAutoOutboundTask(form);
    proxy?.$modal.msgSuccess('自动外呼任务保存成功');
    drawer.visible = false;
    await load();
  } finally {
    drawer.saving = false;
  }
};
const handleDelete = async (row: AutoOutboundTaskVO) => {
  await proxy?.$modal.confirm(`确认删除自动外呼任务“${row.taskName}”吗？任务名单和执行明细将一并删除，通话记录仍会保留。`);
  await deleteAutoOutboundTask(row.id);
  await load();
};
const handleStart = async (row: AutoOutboundTaskVO) => {
  if (['COMPLETED', 'STOPPED'].includes(row.status)) {
    await proxy?.$modal.confirm(`确认重新执行任务“${row.taskName}”吗？名单将从头开始拨打，历史拨打记录会保留。`);
    await rerunAutoOutboundTask(row.id);
  } else {
    row.status === 'PAUSED' ? await resumeAutoOutboundTask(row.id) : await startAutoOutboundTask(row.id);
  }
  await load();
};
const handlePause = async (row: AutoOutboundTaskVO) => {
  await pauseAutoOutboundTask(row.id);
  await load();
};
const handleStop = async (row: AutoOutboundTaskVO) => {
  await proxy?.$modal.confirm(`确认停止任务“${row.taskName}”吗？停止后可修改配置或重新启动。`);
  await stopAutoOutboundTask(row.id);
  await load();
};
const primaryActionLabel = (row: AutoOutboundTaskVO) =>
  row.status === 'RUNNING' ? '暂停' : row.status === 'PAUSED' ? '继续' : ['STOPPED', 'COMPLETED'].includes(row.status) ? '重新执行' : '启动';
const primaryActionType = (row: AutoOutboundTaskVO) => (row.status === 'RUNNING' ? 'warning' : 'success');
const handlePrimaryAction = async (row: AutoOutboundTaskVO) => (row.status === 'RUNNING' ? handlePause(row) : handleStart(row));
const handleMoreCommand = async (command: string, row: AutoOutboundTaskVO) => {
  if (command === 'monitor') monitorDrawerRef.value?.open(row);
  else if (command === 'edit') await handleEdit(row);
  else if (command === 'stop') await handleStop(row);
  else if (command === 'delete') await handleDelete(row);
};
const dialModeLabel = (mode: AutoOutboundDialMode) => dialModeOptions.find((item) => item.value === mode)?.label || mode;
const statusLabel = (status: AutoOutboundStatus) => statusOptions.find((item) => item.value === status)?.label || status;
const statusType = (status: AutoOutboundStatus) =>
  status === 'RUNNING' ? 'success' : status === 'PAUSED' ? 'warning' : status === 'STOPPED' ? 'danger' : 'info';
const retryResultLabel = (code: AutoOutboundRetryResult) => ({ NO_ANSWER: '无人接听', BUSY: '用户忙', FAILED: '呼叫失败', OTHER: '其他结果' })[code];
const progress = (row: AutoOutboundTaskVO) => (row.totalCount ? Math.round((row.completedCount * 100) / row.totalCount) : 0);
const targetLabel = (row: AutoOutboundTaskVO) => {
  const options = row.targetType === 'AI_AGENT' ? aiOptions.value : row.targetType === 'IVR_FLOW' ? ivrOptions.value : skillGroupOptions.value;
  return options.find((item) => String(item.value) === String(row.targetId))?.label || `${row.targetType} / ${row.targetId}`;
};
const callWindowSummary = (row: AutoOutboundTaskVO) => {
  const windows = row.callWindows?.filter((item) => item.enabled) || [];
  if (!windows.length) return '未配置呼叫时段';
  const first = windows[0];
  const days = first.weekdays.map((day) => weekdayOptions.find((item) => item.value === day)?.label || day).join('/');
  const summary = `${days} ${first.startTime.slice(0, 5)}-${first.endTime.slice(0, 5)}`;
  return windows.length > 1 ? `${summary} 等 ${windows.length} 个时段` : summary;
};

onMounted(async () => {
  await Promise.all([loadOptions(), load()]);
  monitorRefreshTimer = setInterval(() => {
    if (selectedTask.value?.status === 'RUNNING' && !monitorLoading.value) void loadSelectedMonitor();
  }, 5000);
});
onBeforeUnmount(() => {
  if (monitorRefreshTimer) clearInterval(monitorRefreshTimer);
});
</script>

<style scoped>
.auto-outbound-page {
  display: grid;
  min-height: calc(100vh - 116px);
  gap: 12px;
}
.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 4px 2px;
}
.page-heading h2 {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 20px;
}
.page-heading p {
  margin: 7px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
.task-workspace {
  display: grid;
  min-height: 680px;
  overflow: hidden;
  border: 1px solid var(--el-border-color-light);
  border-radius: 12px;
  background: var(--el-bg-color);
  grid-template-columns: 310px minmax(0, 1fr);
}
.task-sidebar {
  display: flex;
  min-width: 0;
  padding: 18px 14px;
  border-right: 1px solid var(--el-border-color-light);
  background: var(--el-fill-color-blank);
  flex-direction: column;
}
.sidebar-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.sidebar-heading > div {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.sidebar-heading strong {
  color: var(--el-text-color-primary);
  font-size: 17px;
}
.sidebar-heading span,
.task-code,
.task-progress {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.sidebar-filters {
  display: grid;
  margin-top: 10px;
  gap: 8px;
  grid-template-columns: 1fr 1fr;
}
.task-list {
  display: flex;
  min-height: 0;
  padding: 12px 2px 4px;
  overflow-y: auto;
  gap: 10px;
  flex: 1;
  flex-direction: column;
}
.task-item {
  position: relative;
  width: 100%;
  padding: 15px;
  border: 0;
  border-radius: 10px;
  background: var(--el-fill-color-lighter);
  color: inherit;
  cursor: pointer;
  text-align: left;
  transition:
    background-color 0.2s ease,
    box-shadow 0.2s ease;
}
.task-item:hover {
  background: var(--el-fill-color-light);
}
.task-item.active {
  background: #edf5ff;
  box-shadow: inset 3px 0 0 var(--el-color-primary);
}
.task-item-top,
.task-progress {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.task-item-top strong {
  overflow: hidden;
  color: var(--el-text-color-primary);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.task-code {
  margin: 5px 0 12px;
}
.task-progress {
  margin-top: 7px;
}
.task-detail {
  min-width: 0;
  padding: 20px 24px 24px;
}
.empty-detail {
  display: grid;
  place-items: center;
}
.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 16px;
}
.task-identity {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
}
.task-avatar {
  display: grid;
  width: 42px;
  height: 42px;
  border-radius: 11px;
  background: linear-gradient(145deg, #4f8df7, #2469d8);
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  place-items: center;
  flex: none;
}
.task-title-line {
  display: flex;
  align-items: center;
  gap: 10px;
}
.task-title-line h3 {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 18px;
}
.task-meta {
  display: flex;
  margin-top: 5px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  gap: 14px;
  flex-wrap: wrap;
}
.detail-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
.detail-actions :deep(.el-button) {
  margin-left: 0;
}
.more-arrow {
  margin-left: 3px;
}
.detail-tabs :deep(.el-tabs__header) {
  margin-bottom: 18px;
}
.overview-content {
  min-height: 510px;
}
.metric-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.metric-card {
  display: flex;
  min-width: 0;
  padding: 17px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: var(--el-bg-color);
  align-items: center;
  gap: 13px;
}
.metric-icon {
  display: grid;
  width: 42px;
  height: 42px;
  border-radius: 10px;
  font-size: 21px;
  place-items: center;
  flex: none;
}
.metric-card.orange .metric-icon {
  background: #fff2df;
  color: #e38a16;
}
.metric-card.cyan .metric-icon {
  background: #ddfaf5;
  color: #15a992;
}
.metric-card.blue .metric-icon {
  background: #e9f1ff;
  color: #3778e8;
}
.metric-card.red .metric-icon {
  background: #ffebed;
  color: #ed5964;
}
.metric-card > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
}
.metric-card span {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.metric-card strong {
  margin: 3px 0;
  color: var(--el-text-color-primary);
  font-size: 23px;
  line-height: 1.15;
}
.metric-card small {
  overflow: hidden;
  color: var(--el-text-color-placeholder);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.statistics-grid {
  display: grid;
  margin-top: 16px;
  gap: 16px;
  grid-template-columns: 1fr 1fr;
}
.statistics-panel {
  min-height: 310px;
  padding: 20px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
}
.panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.panel-heading h4,
.task-data-grid h4 {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 15px;
}
.panel-heading p {
  margin: 5px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.panel-heading > strong {
  color: var(--el-color-primary);
  font-size: 22px;
}
.panel-total {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.progress-overview,
.failure-distribution {
  display: flex;
  margin-top: 24px;
  gap: 20px;
  flex-direction: column;
}
.progress-label,
.failure-label {
  display: flex;
  align-items: center;
  margin-bottom: 7px;
  color: var(--el-text-color-regular);
  font-size: 12px;
}
.progress-label strong,
.failure-label strong {
  margin-left: auto;
  color: var(--el-text-color-primary);
  font-size: 13px;
}
.failure-label small {
  margin-left: 8px;
  color: var(--el-text-color-placeholder);
}
.runtime-panel {
  display: grid;
  margin-top: 16px;
  padding: 16px 20px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: var(--el-fill-color-extra-light);
  gap: 16px;
  grid-template-columns: 110px 110px 190px minmax(220px, 1fr);
}
.runtime-item {
  display: flex;
  flex-direction: column;
}
.runtime-item span {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.runtime-item strong {
  margin-top: 5px;
  color: var(--el-text-color-primary);
  font-size: 18px;
}
.runtime-item .runtime-text {
  overflow: hidden;
  font-size: 12px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.task-data-grid {
  display: grid;
  gap: 18px;
  grid-template-columns: 1.2fr 0.8fr;
}
.task-data-grid > section {
  padding: 20px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
}
.task-data-grid h4 {
  margin-bottom: 16px;
}
.member-summary {
  display: grid;
  margin-bottom: 20px;
  gap: 10px;
  grid-template-columns: repeat(2, 1fr);
}
.member-summary > div {
  display: flex;
  padding: 14px;
  border-radius: 8px;
  background: var(--el-fill-color-light);
  flex-direction: column;
}
.member-summary span {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.member-summary strong {
  margin-top: 5px;
  color: var(--el-text-color-primary);
  font-size: 20px;
}
.full {
  width: 100%;
}
.policy-grid {
  margin-top: 22px;
}
.unit {
  margin-left: 8px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  color: var(--el-text-color-secondary);
}
.policy-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  margin-bottom: 10px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
}
.week-select {
  width: 260px;
}
.window-row :deep(.el-date-editor) {
  width: 135px;
}
.retry-table {
  margin-top: 18px;
  overflow: hidden;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
}
.retry-head,
.retry-line {
  display: grid;
  grid-template-columns: 1.2fr 0.7fr 1fr 1.2fr;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
}
.retry-head {
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
  font-size: 12px;
}
.retry-line + .retry-line {
  border-top: 1px solid var(--el-border-color-lighter);
}
@media (max-width: 1100px) {
  .task-workspace {
    grid-template-columns: 260px minmax(0, 1fr);
  }
  .detail-header {
    align-items: flex-start;
    flex-direction: column;
  }
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .statistics-grid,
  .task-data-grid {
    grid-template-columns: 1fr;
  }
  .runtime-panel {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
