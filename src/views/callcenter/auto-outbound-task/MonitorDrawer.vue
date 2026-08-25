<template>
  <el-drawer v-model="visible" title="运行监控" size="560px" @closed="reset">
    <div v-loading="loading" class="monitor-content">
      <template v-if="monitor">
        <div class="monitor-heading">
          <div>
            <div class="task-name">{{ task?.taskName }}</div>
            <div class="secondary">{{ task?.taskCode }}</div>
          </div>
          <el-tag :type="monitor.taskStatus === 'RUNNING' ? 'success' : 'info'">{{ statusLabel(monitor.taskStatus) }}</el-tag>
        </div>
        <div class="metric-grid">
          <div class="metric">
            <span>实时并发</span><strong>{{ monitor.activeConcurrency }}</strong>
          </div>
          <div class="metric">
            <span>排队等待</span><strong>{{ monitor.queuedCount }}</strong>
          </div>
          <div class="metric">
            <span>今日呼叫</span><strong>{{ monitor.todayCallCount }}</strong>
          </div>
          <div class="metric">
            <span>今日接通</span><strong>{{ monitor.todayAnsweredCount }}</strong>
          </div>
          <div class="metric">
            <span>接通率</span><strong>{{ monitor.todayAnswerRate.toFixed(2) }}%</strong>
          </div>
        </div>
        <div v-if="monitor.failureMetrics?.length" class="failure-panel">
          <div class="panel-title">今日失败分类</div>
          <div class="failure-list">
            <el-tag v-for="item in monitor.failureMetrics" :key="item.category" :type="item.retryable ? 'warning' : 'danger'" effect="plain">
              {{ item.categoryLabel }} {{ item.count }}{{ item.retryable ? ' · 可重试' : ' · 不重试' }}
            </el-tag>
          </div>
        </div>
        <el-descriptions :column="1" border class="scheduler-info">
          <el-descriptions-item label="调度实例">{{ monitor.schedulerOwner || '-' }}</el-descriptions-item>
          <el-descriptions-item label="租约到期">{{ monitor.schedulerLeaseUntil || '-' }}</el-descriptions-item>
          <el-descriptions-item label="最近心跳">{{ monitor.schedulerHeartbeatAt || '-' }}</el-descriptions-item>
          <el-descriptions-item label="最近调度">{{ monitor.lastScheduledAt || '-' }}</el-descriptions-item>
          <el-descriptions-item label="调度摘要">{{ monitor.lastScheduleSummary || '尚未执行调度' }}</el-descriptions-item>
        </el-descriptions>
        <el-alert
          title="调度器生成待拨任务，拨号执行器随后向 FreeSWITCH 发起呼叫；AI/IVR 通话结果会自动回写。"
          type="success"
          :closable="false"
          show-icon
        />
      </template>
    </div>
    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
      <el-button v-hasPermi="['callcenter:auto-outbound-task:execute']" type="primary" :loading="running" @click="runOnce"
        >立即执行一次调度</el-button
      >
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { getCurrentInstance, onBeforeUnmount, ref } from 'vue';
import { getAutoOutboundMonitor, runAutoOutboundScheduler } from '@/api/callcenter/auto-outbound-task';
import type { AutoOutboundMonitorVO, AutoOutboundStatus, AutoOutboundTaskVO } from '@/api/callcenter/auto-outbound-task/types';

const { proxy } = getCurrentInstance()!;
const visible = ref(false);
const loading = ref(false);
const running = ref(false);
const task = ref<AutoOutboundTaskVO>();
const monitor = ref<AutoOutboundMonitorVO>();
let refreshTimer: ReturnType<typeof setInterval> | undefined;

const stopRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = undefined;
  }
};

const load = async () => {
  if (!task.value) return;
  loading.value = true;
  try {
    monitor.value = (await getAutoOutboundMonitor(task.value.id)).data;
  } finally {
    loading.value = false;
  }
};

const open = async (row: AutoOutboundTaskVO) => {
  stopRefresh();
  task.value = row;
  visible.value = true;
  await load();
  refreshTimer = setInterval(() => {
    if (visible.value && !loading.value && !running.value) void load();
  }, 3000);
};

const runOnce = async () => {
  running.value = true;
  try {
    const { data } = await runAutoOutboundScheduler();
    proxy?.$modal.msgSuccess(`调度完成：生成 ${data.scheduledMemberCount} 条待拨任务`);
    await load();
  } finally {
    running.value = false;
  }
};

const reset = () => {
  stopRefresh();
  task.value = undefined;
  monitor.value = undefined;
};

const statusLabel = (status: AutoOutboundStatus) =>
  ({
    DRAFT: '草稿',
    RUNNING: '运行中',
    PAUSED: '已暂停',
    COMPLETED: '已完成',
    STOPPED: '已停止'
  })[status];

defineExpose({ open });
onBeforeUnmount(stopRefresh);
</script>

<style scoped>
.monitor-content {
  min-height: 320px;
}
.monitor-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}
.task-name {
  color: #12213a;
  font-size: 18px;
  font-weight: 700;
}
.secondary {
  margin-top: 4px;
  color: #8a97aa;
  font-size: 13px;
}
.metric-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  margin-bottom: 18px;
}
.metric {
  display: flex;
  min-width: 0;
  padding: 14px 8px;
  border: 1px solid #e6ebf2;
  border-radius: 10px;
  background: #f8fafc;
  flex-direction: column;
  align-items: center;
}
.metric span {
  color: #7d899b;
  font-size: 12px;
}
.metric strong {
  margin-top: 6px;
  color: #0b4c82;
  font-size: 22px;
}
.scheduler-info {
  margin-bottom: 18px;
}
.failure-panel {
  margin-bottom: 18px;
  padding: 14px;
  border: 1px solid #e6ebf2;
  border-radius: 10px;
}
.panel-title {
  margin-bottom: 10px;
  color: #34445c;
  font-size: 13px;
  font-weight: 600;
}
.failure-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
