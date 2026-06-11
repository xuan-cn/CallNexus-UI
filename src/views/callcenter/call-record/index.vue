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
        <el-table-column label="挂断原因" prop="hangupCause" min-width="160" show-overflow-tooltip />
        <el-table-column label="操作" width="80" align="center">
          <template #default="{ row }">
            <el-button v-hasPermi="['callcenter:call-record:query']" link type="primary" @click="handleDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      <pagination v-show="total > 0" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
    </el-card>

    <el-dialog v-model="detailVisible" title="通话记录详情" width="760px" append-to-body>
      <el-descriptions v-if="detail" :column="2" border>
        <el-descriptions-item label="Channel UUID" :span="2">{{ detail.channelUuid }}</el-descriptions-item>
        <el-descriptions-item label="Call UUID" :span="2">{{ detail.callUuid || '-' }}</el-descriptions-item>
        <el-descriptions-item label="呼叫方向">{{ directionLabel(detail.direction) }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ statusLabel(detail.callStatus) }}</el-descriptions-item>
        <el-descriptions-item label="主叫号码">{{ detail.callerNumber || '-' }}</el-descriptions-item>
        <el-descriptions-item label="被叫号码">{{ detail.calledNumber || '-' }}</el-descriptions-item>
        <el-descriptions-item label="坐席分机">{{ detail.agentExtension || '-' }}</el-descriptions-item>
        <el-descriptions-item label="挂断原因">{{ detail.hangupCause || '-' }}</el-descriptions-item>
        <el-descriptions-item label="开始时间">{{ detail.startedAt || '-' }}</el-descriptions-item>
        <el-descriptions-item label="振铃时间">{{ detail.ringingAt || '-' }}</el-descriptions-item>
        <el-descriptions-item label="接听时间">{{ detail.answeredAt || '-' }}</el-descriptions-item>
        <el-descriptions-item label="结束时间">{{ detail.endedAt || '-' }}</el-descriptions-item>
        <el-descriptions-item label="通话时长">{{ formatDuration(detail.billableSeconds) }}</el-descriptions-item>
        <el-descriptions-item label="总时长">{{ formatDuration(detail.durationSeconds) }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup name="CallRecord" lang="ts">
import { getCallRecord, listCallRecords } from '@/api/callcenter/call-record';
import { CallDirection, CallRecordQuery, CallRecordVO, CallStatus } from '@/api/callcenter/call-record/types';

const loading = ref(false);
const total = ref(0);
const detailVisible = ref(false);
const detail = ref<CallRecordVO>();
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
const directionTag = (value: CallDirection) => ({ INBOUND: 'success', OUTBOUND: 'primary', INTERNAL: 'warning', UNKNOWN: 'info' })[value] as any;
const formatDuration = (seconds?: number) => {
  const value = Math.max(0, seconds || 0);
  const minutes = Math.floor(value / 60);
  const remainSeconds = value % 60;
  return minutes > 0 ? `${minutes}分${remainSeconds}秒` : `${remainSeconds}秒`;
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
  detailVisible.value = true;
};
onMounted(getList);
</script>
