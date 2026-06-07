<template>
  <div class="p-2">
    <el-card class="mb-2" shadow="hover">
      <el-form :model="query" inline>
        <el-form-item label="客户电话"><el-input v-model="query.primaryPhone" clearable @keyup.enter="load" /></el-form-item>
        <el-form-item label="客户姓名"><el-input v-model="query.customerName" clearable @keyup.enter="load" /></el-form-item>
        <el-form-item><el-button type="primary" @click="load">查询</el-button></el-form-item>
      </el-form>
    </el-card>
    <el-card shadow="hover">
      <el-table v-loading="loading" :data="rows">
        <el-table-column label="客户姓名" min-width="150">
          <template #default="{ row }">{{ row.customerName || '未命名客户' }}</template>
        </el-table-column>
        <el-table-column label="客户电话" min-width="150">
          <template #default="{ row }"
            ><el-button link type="primary" @click="showDetail(row)">{{ row.primaryPhone }}</el-button></template
          >
        </el-table-column>
        <el-table-column label="来源通话" prop="sourceCallId" min-width="240" show-overflow-tooltip />
        <el-table-column label="创建时间" prop="createTime" min-width="170" />
      </el-table>
      <pagination v-show="total > 0" v-model:page="query.pageNum" v-model:limit="query.pageSize" :total="total" @pagination="load" />
    </el-card>
    <CallCenterBusinessDetail v-model="detailVisible" business-type="CUSTOMER" :business-id="detailId" />
  </div>
</template>

<script setup name="CustomerManagement" lang="ts">
import { CustomerQuery, CustomerVO, listCustomers } from '@/api/callcenter/customer';
import CallCenterBusinessDetail from '@/components/CallCenterBusinessDetail/index.vue';

const loading = ref(false);
const rows = ref<CustomerVO[]>([]);
const total = ref(0);
const detailVisible = ref(false);
const detailId = ref<string | number>();
const query = reactive<CustomerQuery>({ pageNum: 1, pageSize: 10 });
const load = async () => {
  loading.value = true;
  try {
    const response = await listCustomers(query);
    rows.value = response.rows;
    total.value = response.total;
  } finally {
    loading.value = false;
  }
};
const showDetail = (row: CustomerVO) => {
  detailId.value = row.id;
  detailVisible.value = true;
};
onMounted(load);
</script>
