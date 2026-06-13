<template>
  <div class="p-2">
    <el-card class="mb-2" shadow="hover">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true">
        <el-form-item label="主叫号码" prop="callerNumber">
          <el-input v-model="queryParams.callerNumber" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="被叫号码" prop="calledNumber">
          <el-input v-model="queryParams.calledNumber" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="呼叫方向" prop="direction">
          <el-select v-model="queryParams.direction" clearable style="width: 130px">
            <el-option v-for="item in directionOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="callStatus">
          <el-select v-model="queryParams.callStatus" clearable style="width: 130px">
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="hover">
      <el-table v-loading="loading" :data="recordList">
        <el-table-column label="呼叫方向" width="100">
          <template #default="{ row }">
            <el-tag :type="directionTag(row.direction)">{{ directionLabel(row.direction) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="主叫号码" prop="callerNumber" min-width="130" />
        <el-table-column label="被叫号码" prop="calledNumber" min-width="130" />
        <el-table-column label="坐席分机" prop="agentExtension" width="110" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">{{ statusLabel(row.callStatus) }}</template>
        </el-table-column>
        <el-table-column label="开始时间" prop="startedAt" min-width="170" />
        <el-table-column label="通话时长" width="110">
          <template #default="{ row }">{{ formatDuration(row.billableSeconds) }}</template>
        </el-table-column>
        <el-table-column label="总时长" width="110">
          <template #default="{ row }">{{ formatDuration(row.durationSeconds) }}</template>
        </el-table-column>
        <el-table-column label="挂断原因" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">{{ hangupCauseLabel(row.hangupCause) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="80" align="center">
          <template #default="{ row }">
            <el-button v-hasPermi="['callcenter:call-record:query']" link type="primary" @click="handleDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      <pagination v-show="total > 0" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
    </el-card>

    <el-dialog v-model="detailVisible" title="通话记录详情" width="1280px" append-to-body>
      <el-tabs v-if="detail" v-model="detailTab" class="detail-tabs">
        <el-tab-pane label="基本信息" name="basic">
          <el-descriptions :column="3" border>
            <el-descriptions-item label="业务通话ID" :span="3">{{ detail.businessCallId || '-' }}</el-descriptions-item>
            <el-descriptions-item label="呼叫方向">{{ directionLabel(detail.direction) }}</el-descriptions-item>
            <el-descriptions-item label="状态">{{ statusLabel(detail.callStatus) }}</el-descriptions-item>
            <el-descriptions-item label="坐席分机">{{ detail.agentExtension || '-' }}</el-descriptions-item>
            <el-descriptions-item label="主叫号码">{{ detail.callerNumber || '-' }}</el-descriptions-item>
            <el-descriptions-item label="被叫号码">{{ detail.calledNumber || '-' }}</el-descriptions-item>
            <el-descriptions-item label="挂断原因">{{ hangupCauseLabel(detail.hangupCause) }}</el-descriptions-item>
            <el-descriptions-item label="关联客户ID">{{ detail.customerId || '-' }}</el-descriptions-item>
            <el-descriptions-item label="关联工单ID">{{ detail.ticketId || '-' }}</el-descriptions-item>
            <el-descriptions-item label="开始时间">{{ detail.startedAt || '-' }}</el-descriptions-item>
            <el-descriptions-item label="振铃时间">{{ detail.ringingAt || '-' }}</el-descriptions-item>
            <el-descriptions-item label="接听时间">{{ detail.answeredAt || '-' }}</el-descriptions-item>
            <el-descriptions-item label="结束时间">{{ detail.endedAt || '-' }}</el-descriptions-item>
          </el-descriptions>
          <div class="metric-grid">
            <div v-for="item in summaryMetrics" :key="item.label" class="metric-item">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="通话录音" name="recording">
          <div v-if="detail.recordingUrl" class="recording-player">
            <AudioWaveform :src="detail.recordingUrl" />
          </div>
          <el-empty v-else :description="recordingStatusLabel(detail.recordingStatus)" :image-size="70" />
        </el-tab-pane>
        <el-tab-pane label="处理时间线" name="timeline">
          <div v-if="timelineEvents.length" class="timeline-layout">
            <div class="timeline-list">
              <div v-for="event in timelineEvents" :key="String(event.id)" class="timeline-row">
                <time>{{ formatClock(event.occurredAt) }}</time>
                <div class="timeline-marker" :class="eventTone(event.eventType)"></div>
                <div class="timeline-content">
                  <strong>{{ eventLabel(event.eventType) }}</strong>
                  <span>{{ event.fromTarget || '-' }} → {{ event.toTarget || '-' }}</span>
                </div>
              </div>
            </div>
            <div class="flow-panel">
              <h4>通话流程图</h4>
              <div v-for="event in flowEvents" :key="`flow-${String(event.id)}`" class="flow-step" :class="eventTone(event.eventType)">
                <strong>{{ eventLabel(event.eventType) }}</strong>
                <span>{{ event.fromTarget || '-' }} → {{ event.toTarget || '-' }}</span>
              </div>
            </div>
          </div>
          <el-empty v-else description="暂无处理时间线" :image-size="70" />
          <div class="metric-grid timeline-metrics">
            <div v-for="item in summaryMetrics" :key="`timeline-${item.label}`" class="metric-item">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="底层通话腿" name="legs">
          <el-table :data="detail.legs || []" size="small">
            <el-table-column label="主叫" prop="callerNumber" min-width="120" />
            <el-table-column label="被叫" prop="calledNumber" min-width="120" />
            <el-table-column label="坐席分机" prop="agentExtension" width="100" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">{{ statusLabel(row.callStatus) }}</template>
            </el-table-column>
            <el-table-column label="开始时间" prop="startedAt" min-width="165" />
            <el-table-column label="通话时长" width="100">
              <template #default="{ row }">{{ formatDuration(row.billableSeconds) }}</template>
            </el-table-column>
            <el-table-column label="挂断原因" min-width="210" show-overflow-tooltip>
              <template #default="{ row }">{{ hangupCauseLabel(row.hangupCause) }}</template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>
  </div>
</template>

<script setup name="CallRecord" lang="ts">
import { getCallRecord, listCallRecords } from '@/api/callcenter/call-record';
import { hangupCauseLabel } from '@/api/callcenter/call-record/display';
import { CallDirection, CallRecordQuery, CallRecordVO, CallStatus } from '@/api/callcenter/call-record/types';

const loading = ref(false);
const total = ref(0);
const detailVisible = ref(false);
const detail = ref<CallRecordVO>();
const detailTab = ref('basic');
const recordList = ref<CallRecordVO[]>([]);
const queryFormRef = ref<ElFormInstance>();
const directionOptions: Array<{ label: string; value: CallDirection }> = [
  { label: '呼入', value: 'INBOUND' },
  { label: '呼出', value: 'OUTBOUND' },
  { label: '内部通话', value: 'INTERNAL' },
  { label: '未知', value: 'UNKNOWN' }
];
const statusOptions: Array<{ label: string; value: CallStatus }> = [
  { label: '已创建', value: 'CREATED' },
  { label: '振铃中', value: 'RINGING' },
  { label: '已接听', value: 'ANSWERED' },
  { label: '已桥接', value: 'BRIDGED' },
  { label: '已结束', value: 'ENDED' }
];
const queryParams = reactive<CallRecordQuery>({
  pageNum: 1,
  pageSize: 10,
  callerNumber: '',
  calledNumber: '',
  direction: undefined,
  callStatus: undefined,
  hangupCause: ''
});

const directionLabel = (value: CallDirection) => directionOptions.find((item) => item.value === value)?.label || value;
const statusLabel = (value: CallStatus) => statusOptions.find((item) => item.value === value)?.label || value;
const recordingStatusLabel = (value?: CallRecordVO['recordingStatus']) =>
  ({ NONE: '暂无录音', PENDING: '录音正在上传', UPLOADED: '录音已上传', FAILED: '录音上传失败' })[value || 'NONE'];
const directionTag = (value: CallDirection) => ({ INBOUND: 'success', OUTBOUND: 'primary', INTERNAL: 'warning', UNKNOWN: 'info' })[value] as any;
const eventLabel = (eventType: string) =>
  ({
    CALL_LEG_CREATED: '创建通话环节',
    RINGING: '开始振铃',
    ANSWERED: '接听通话',
    BRIDGED: '桥接通话',
    TRANSFERRED: '转接通话',
    UNBRIDGED: '解除桥接',
    HELD: '通话保持',
    UNHELD: '恢复通话',
    CALL_LEG_ENDED: '结束通话环节'
  })[eventType] || eventType;
const formatDuration = (seconds?: number) => {
  const value = Math.max(0, seconds || 0);
  const minutes = Math.floor(value / 60);
  const remainSeconds = value % 60;
  return minutes > 0 ? `${minutes}分${remainSeconds}秒` : `${remainSeconds}秒`;
};
const secondsBetween = (start?: string, end?: string) => {
  if (!start || !end) return 0;
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000));
};
const summaryMetrics = computed(() => [
  { label: '通话总时长', value: formatDuration(detail.value?.durationSeconds) },
  { label: '振铃时长', value: formatDuration(secondsBetween(detail.value?.ringingAt, detail.value?.answeredAt || detail.value?.endedAt)) },
  { label: '接通时长', value: formatDuration(detail.value?.billableSeconds) },
  { label: '等待时长', value: formatDuration(secondsBetween(detail.value?.startedAt, detail.value?.answeredAt || detail.value?.endedAt)) },
  { label: '挂断原因', value: hangupCauseLabel(detail.value?.hangupCause) }
]);
const timelineEvents = computed(() => detail.value?.events || []);
const flowEvents = computed(() =>
  timelineEvents.value.filter((event) =>
    ['CALL_LEG_CREATED', 'RINGING', 'ANSWERED', 'BRIDGED', 'TRANSFERRED', 'CALL_LEG_ENDED'].includes(event.eventType)
  )
);
const formatClock = (value?: string) => value?.split(' ')[1] || value || '-';
const eventTone = (eventType: string) => {
  if (eventType === 'ANSWERED' || eventType === 'BRIDGED') return 'success';
  if (eventType === 'CALL_LEG_ENDED') return 'danger';
  if (eventType === 'RINGING') return 'warning';
  return 'primary';
};
const getList = async () => {
  loading.value = true;
  try {
    const res = await listCallRecords(queryParams);
    recordList.value = res.rows;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
};
const handleQuery = () => {
  queryParams.pageNum = 1;
  getList();
};
const resetQuery = () => {
  queryFormRef.value?.resetFields();
  handleQuery();
};
const handleDetail = async (row: CallRecordVO) => {
  const res = await getCallRecord(row.id);
  detail.value = res.data;
  detailTab.value = 'basic';
  detailVisible.value = true;
};
onMounted(getList);
</script>

<style scoped>
.detail-tabs {
  min-height: 560px;
}
.metric-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  padding: 16px;
  margin-top: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
}
.metric-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #909399;
}
.metric-item strong {
  color: #303133;
}
.timeline-layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  gap: 16px;
}
.timeline-list,
.flow-panel {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
}
.timeline-row {
  display: grid;
  grid-template-columns: 105px 20px 1fr;
  gap: 14px;
  align-items: center;
  min-height: 76px;
  padding: 0 20px;
  border-bottom: 1px solid #ebeef5;
}
.timeline-row:last-child {
  border-bottom: 0;
}
.timeline-row time {
  color: #606266;
}
.timeline-marker {
  width: 14px;
  height: 14px;
  border: 4px solid #d9e7ff;
  border-radius: 50%;
  background: #409eff;
}
.timeline-marker.success {
  border-color: #d9f3e7;
  background: #20b26b;
}
.timeline-marker.warning {
  border-color: #fdf0d5;
  background: #e6a23c;
}
.timeline-marker.danger {
  border-color: #fde2e2;
  background: #f56c6c;
}
.timeline-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.timeline-content span,
.flow-step span {
  color: #606266;
  font-size: 13px;
}
.flow-panel {
  padding: 16px;
}
.flow-panel h4 {
  margin: 0 0 16px;
}
.flow-step {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  margin-bottom: 24px;
  border: 1px solid #b7d2ff;
  border-radius: 6px;
  background: #f5f9ff;
  text-align: center;
}
.flow-step:not(:last-child)::after {
  position: absolute;
  bottom: -20px;
  left: 50%;
  color: #909399;
  content: '↓';
  transform: translateX(-50%);
}
.flow-step.success {
  border-color: #a8e5c8;
  background: #f0fbf6;
}
.flow-step.warning {
  border-color: #f5d49b;
  background: #fffaf0;
}
.flow-step.danger {
  border-color: #f7b2b2;
  background: #fff5f5;
}
.timeline-metrics {
  margin-top: 16px;
}
.recording-player {
  padding: 20px 0;
}
.recording-file {
  margin-top: 12px;
  color: #606266;
  font-size: 13px;
}
</style>
