<template>
  <div class="p-2">
    <el-card class="mb-2" shadow="hover">
      <el-form :model="query" inline>
        <el-form-item label="工单编号"><el-input v-model="query.ticketNo" clearable @keyup.enter="load" /></el-form-item>
        <el-form-item label="来电号码"><el-input v-model="query.callerNumber" clearable @keyup.enter="load" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.ticketStatus" clearable style="width: 140px">
            <el-option label="待处理" value="OPEN" /><el-option label="处理中" value="PROCESSING" />
            <el-option label="已解决" value="RESOLVED" /><el-option label="已关闭" value="CLOSED" />
          </el-select>
        </el-form-item>
        <el-form-item><el-button type="primary" @click="load">查询</el-button></el-form-item>
      </el-form>
    </el-card>
    <el-card shadow="hover">
      <el-table v-loading="loading" :data="rows">
        <el-table-column label="工单编号" min-width="190">
          <template #default="{ row }"
            ><el-button link type="primary" @click="showDetail(row)">{{ row.ticketNo }}</el-button></template
          >
        </el-table-column>
        <el-table-column label="状态" prop="ticketStatus" width="110" />
        <el-table-column label="来电号码" prop="callerNumber" min-width="140" />
        <el-table-column label="来源通话" prop="sourceCallId" min-width="240" show-overflow-tooltip />
        <el-table-column label="创建时间" prop="createTime" min-width="170" />
      </el-table>
      <pagination v-show="total > 0" v-model:page="query.pageNum" v-model:limit="query.pageSize" :total="total" @pagination="load" />
    </el-card>
    <CallCenterBusinessDetail v-model="detailVisible" business-type="TICKET" :business-id="detailId" />
  </div>
</template>

<script setup name="TicketManagement" lang="ts">
import { listTickets, TicketQuery, TicketVO } from '@/api/callcenter/ticket';
import CallCenterBusinessDetail from '@/components/CallCenterBusinessDetail/index.vue';

const loading = ref(false);
const rows = ref<TicketVO[]>([]);
const total = ref(0);
const detailVisible = ref(false);
const detailId = ref<string | number>();
const query = reactive<TicketQuery>({ pageNum: 1, pageSize: 10 });
const load = async () => {
  loading.value = true;
  try {
    const response = await listTickets(query);
    rows.value = response.rows;
    total.value = response.total;
  } finally {
    loading.value = false;
  }
};
const showDetail = (row: TicketVO) => {
  detailId.value = row.id;
  detailVisible.value = true;
};
onMounted(load);
</script>
