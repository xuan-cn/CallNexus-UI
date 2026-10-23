<template>
  <div class="click-dial-page p-2">
    <div class="summary-grid">
      <button
        v-for="item in summaryItems"
        :key="item.value"
        type="button"
        class="summary-card"
        :class="{ active: query.workFilter === item.value }"
        @click="changeWorkFilter(item.value)"
      >
        <span>{{ item.label }}</span
        ><strong>{{ item.count }}</strong>
      </button>
    </div>

    <el-card shadow="never" class="filter-card">
      <el-form :model="query" inline @submit.prevent>
        <el-form-item label="客户"><el-input v-model="query.keyword" clearable placeholder="姓名或电话号码" @keyup.enter="search" /></el-form-item>
        <el-form-item label="客户类型"><el-input v-model="query.customerType" clearable /></el-form-item>
        <el-form-item label="来源渠道"><el-input v-model="query.sourceChannel" clearable /></el-form-item>
        <el-form-item label="客户标签"><el-input v-model="query.tags" clearable /></el-form-item>
        <el-form-item label="拨打结果">
          <el-select v-model="query.resultCode" clearable placeholder="全部" style="width: 132px">
            <el-option v-for="item in resultOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="最后拨打">
          <el-date-picker
            v-model="lastCalledRange"
            type="datetimerange"
            value-format="YYYY-MM-DD HH:mm:ss"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
          />
        </el-form-item>
        <el-form-item
          ><el-button type="primary" icon="Search" @click="search">查询</el-button
          ><el-button icon="Refresh" @click="reset">重置</el-button></el-form-item
        >
      </el-form>
    </el-card>

    <el-card shadow="never" class="list-card">
      <template #header>
        <div class="list-header">
          <div><strong>我的客户</strong><span>仅展示当前坐席有效归属的客户</span></div>
          <el-button icon="Refresh" :loading="loading" @click="loadData">刷新</el-button>
        </div>
      </template>
      <el-table v-loading="loading" :data="rows" empty-text="当前筛选条件下没有客户">
        <el-table-column label="客户" min-width="150"
          ><template #default="{ row }"
            ><el-button link type="primary" @click="showCustomer(row.customerId)">{{ row.customerName || '未提供姓名' }}</el-button></template
          ></el-table-column
        >
        <el-table-column label="电话号码" min-width="185">
          <template #default="{ row }">
            <div class="phone-actions">
              <el-button
                v-if="primaryPhone(row)"
                v-hasPermi="['callcenter:click-dial:execute']"
                link
                type="primary"
                :loading="dialingId === row.assignmentId"
                @click="dial(row, primaryPhoneId(row))"
                ><el-icon><Phone /></el-icon>{{ primaryPhone(row) }}</el-button
              >
              <el-dropdown v-if="additionalPhones(row).length" trigger="click" @command="(phoneId) => dial(row, phoneId)">
                <el-button link type="primary"
                  >其他号码（{{ additionalPhones(row).length }}）<el-icon><ArrowDown /></el-icon
                ></el-button>
                <template #dropdown
                  ><el-dropdown-menu
                    ><el-dropdown-item v-for="phone in additionalPhones(row)" :key="phone.id" :command="phone.id"
                      >{{ phone.phoneLabel || phone.phoneType || '号码' }}：{{ phone.phoneNumber }}</el-dropdown-item
                    ></el-dropdown-menu
                  ></template
                >
              </el-dropdown>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="客户信息" min-width="180" show-overflow-tooltip
          ><template #default="{ row }">{{
            [row.customerType, row.sourceChannel, row.tags].filter(Boolean).join(' · ') || '-'
          }}</template></el-table-column
        >
        <el-table-column label="状态" width="105"
          ><template #default="{ row }"
            ><el-tag :type="statusTag(row.dialStatus)">{{ statusLabel(row.dialStatus) }}</el-tag></template
          ></el-table-column
        >
        <el-table-column label="拨打次数" prop="attemptCount" width="88" align="center" />
        <el-table-column label="最后结果" width="110"
          ><template #default="{ row }">{{ resultLabel(row.lastResultCode) }}</template></el-table-column
        >
        <el-table-column label="最后拨打" prop="lastCalledAt" min-width="165"
          ><template #default="{ row }">{{ row.lastCalledAt || '-' }}</template></el-table-column
        >
        <el-table-column label="下次跟进" min-width="170"
          ><template #default="{ row }"
            ><span :class="{ overdue: isOverdue(row.nextFollowUpAt) }">{{ row.nextFollowUpAt || '-' }}</span></template
          ></el-table-column
        >
        <el-table-column label="备注" prop="lastResultRemark" min-width="160" show-overflow-tooltip />
        <el-table-column label="操作" width="190" fixed="right">
          <template #default="{ row }"
            ><el-button v-hasPermi="['callcenter:click-dial:result']" link type="primary" :disabled="!row.lastBusinessCallId" @click="openResult(row)"
              >登记结果</el-button
            ><el-button link type="primary" @click="openAttempts(row)">拨打记录</el-button></template
          >
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="query.pageNum"
        v-model:page-size="query.pageSize"
        class="pagination"
        background
        layout="total, sizes, prev, pager, next"
        :total="total"
        @current-change="loadRows"
        @size-change="search"
      />
    </el-card>

    <el-drawer v-model="resultDrawer.visible" title="登记拨打结果" size="440px" append-to-body>
      <el-descriptions v-if="resultDrawer.customer" :column="1" border>
        <el-descriptions-item label="客户">{{ resultDrawer.customer.customerName || '未提供姓名' }}</el-descriptions-item>
        <el-descriptions-item label="电话">{{ resultDrawer.phoneNumber || resultDrawer.customer.primaryPhone }}</el-descriptions-item>
        <el-descriptions-item label="通话ID">{{ resultForm.businessCallId }}</el-descriptions-item>
      </el-descriptions>
      <el-form ref="resultFormRef" :model="resultForm" :rules="resultRules" label-position="top" class="result-form">
        <el-form-item label="拨打结果" prop="resultCode"
          ><el-select v-model="resultForm.resultCode" style="width: 100%"
            ><el-option v-for="item in resultOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select
        ></el-form-item>
        <el-form-item label="处理状态" prop="dialStatus"
          ><el-radio-group v-model="resultForm.dialStatus"
            ><el-radio-button value="PROCESSING">待处理</el-radio-button><el-radio-button value="FOLLOW_UP">需要跟进</el-radio-button
            ><el-radio-button value="COMPLETED">已完成</el-radio-button></el-radio-group
          ></el-form-item
        >
        <el-form-item v-if="resultForm.dialStatus === 'FOLLOW_UP'" label="下次跟进" prop="nextFollowUpAt"
          ><el-date-picker v-model="resultForm.nextFollowUpAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%"
        /></el-form-item>
        <el-form-item label="结果备注"
          ><el-input v-model="resultForm.resultRemark" type="textarea" :rows="5" maxlength="1000" show-word-limit
        /></el-form-item>
      </el-form>
      <template #footer
        ><el-button @click="resultDrawer.visible = false">取消</el-button
        ><el-button type="primary" :loading="resultDrawer.saving" @click="saveResult">保存结果</el-button></template
      >
    </el-drawer>

    <el-drawer v-model="attemptDrawer.visible" :title="`${attemptDrawer.customerName} - 拨打记录`" size="720px" append-to-body>
      <el-table v-loading="attemptDrawer.loading" :data="attemptDrawer.rows">
        <el-table-column label="次数" prop="attemptNo" width="70" /><el-table-column
          label="电话号码"
          prop="phoneNumber"
          min-width="130"
        /><el-table-column label="拨打时间" prop="startedAt" min-width="165" />
        <el-table-column label="接通时长" width="100"
          ><template #default="{ row }">{{ row.billableSeconds || 0 }}秒</template></el-table-column
        >
        <el-table-column label="结果" width="105"
          ><template #default="{ row }">{{ resultLabel(row.resultCode || row.suggestedResultCode) }}</template></el-table-column
        >
        <el-table-column label="挂机原因" prop="hangupCause" min-width="145" /><el-table-column
          label="备注"
          prop="resultRemark"
          min-width="180"
          show-overflow-tooltip
        />
      </el-table>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ArrowDown, Phone } from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import { useRouter } from 'vue-router';
import {
  completeClickDialCustomer,
  dialAssignedCustomer,
  getClickDialSummary,
  listCustomerDialAttempts,
  pageClickDialCustomers
} from '@/api/callcenter/click-dial';
import type {
  ClickDialCustomerQuery,
  ClickDialCustomerVO,
  ClickDialResultCode,
  ClickDialStatus,
  ClickDialSummaryVO,
  ClickDialWorkFilter,
  CompleteClickDialForm,
  CustomerDialAttemptVO
} from '@/api/callcenter/click-dial/types';

const router = useRouter();
const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const loading = ref(false);
const dialingId = ref<string | number>();
const rows = ref<ClickDialCustomerVO[]>([]);
const total = ref(0);
const lastCalledRange = ref<[string, string]>();
const summary = reactive<ClickDialSummaryVO>({
  totalCount: 0,
  uncalledCount: 0,
  processingCount: 0,
  followUpCount: 0,
  dueFollowUpCount: 0,
  completedCount: 0,
  dialedCount: 0
});
const query = reactive<ClickDialCustomerQuery>({
  pageNum: 1,
  pageSize: 10,
  workFilter: 'UNCALLED',
  keyword: '',
  customerType: '',
  sourceChannel: '',
  tags: '',
  resultCode: ''
});
const resultOptions: Array<{ label: string; value: ClickDialResultCode }> = [
  { label: '已接通', value: 'CONNECTED' },
  { label: '无人接听', value: 'NO_ANSWER' },
  { label: '客户忙', value: 'BUSY' },
  { label: '号码无效', value: 'INVALID_NUMBER' },
  { label: '无意向', value: 'NOT_INTERESTED' },
  { label: '需要跟进', value: 'FOLLOW_UP' },
  { label: '其他', value: 'OTHER' }
];
const summaryItems = computed(() => [
  { label: '未拨打', value: 'UNCALLED' as ClickDialWorkFilter, count: summary.uncalledCount },
  { label: '待处理', value: 'PROCESSING' as ClickDialWorkFilter, count: summary.processingCount },
  { label: '需要跟进', value: 'FOLLOW_UP' as ClickDialWorkFilter, count: summary.followUpCount },
  { label: '今日待跟进', value: 'DUE_FOLLOW_UP' as ClickDialWorkFilter, count: summary.dueFollowUpCount },
  { label: '已拨打', value: 'DIALED' as ClickDialWorkFilter, count: summary.dialedCount },
  { label: '已完成', value: 'COMPLETED' as ClickDialWorkFilter, count: summary.completedCount },
  { label: '全部', value: 'ALL' as ClickDialWorkFilter, count: summary.totalCount }
]);

const resultFormRef = ref<FormInstance>();
const resultDrawer = reactive({ visible: false, saving: false, customer: undefined as ClickDialCustomerVO | undefined, phoneNumber: '' });
const resultForm = reactive<CompleteClickDialForm>({
  businessCallId: '',
  resultCode: 'CONNECTED',
  dialStatus: 'COMPLETED',
  resultRemark: '',
  nextFollowUpAt: undefined
});
const resultRules: FormRules = {
  resultCode: [{ required: true, message: '请选择拨打结果', trigger: 'change' }],
  dialStatus: [{ required: true, message: '请选择处理状态', trigger: 'change' }],
  nextFollowUpAt: [
    {
      validator: (_rule, value, callback) =>
        resultForm.dialStatus === 'FOLLOW_UP' && !value ? callback(new Error('请选择下次跟进时间')) : callback(),
      trigger: 'change'
    }
  ]
};
const attemptDrawer = reactive({ visible: false, loading: false, customerName: '', rows: [] as CustomerDialAttemptVO[] });

const loadRows = async () => {
  loading.value = true;
  try {
    query.lastCalledStart = lastCalledRange.value?.[0];
    query.lastCalledEnd = lastCalledRange.value?.[1];
    const response = await pageClickDialCustomers(query);
    rows.value = response.rows || [];
    total.value = response.total || 0;
  } finally {
    loading.value = false;
  }
};
const loadSummary = async () => Object.assign(summary, (await getClickDialSummary()).data || {});
const loadData = async () => Promise.all([loadRows(), loadSummary()]);
const search = async () => {
  query.pageNum = 1;
  await loadData();
};
const reset = async () => {
  Object.assign(query, {
    pageNum: 1,
    pageSize: 10,
    workFilter: 'UNCALLED',
    keyword: '',
    customerType: '',
    sourceChannel: '',
    tags: '',
    resultCode: '',
    lastCalledStart: undefined,
    lastCalledEnd: undefined
  });
  lastCalledRange.value = undefined;
  await loadData();
};
const changeWorkFilter = async (value: ClickDialWorkFilter) => {
  query.workFilter = value;
  query.pageNum = 1;
  await loadRows();
};
const primaryPhoneObject = (row: ClickDialCustomerVO) => row.phones?.find((phone) => phone.primaryFlag) || row.phones?.[0];
const primaryPhone = (row: ClickDialCustomerVO) => primaryPhoneObject(row)?.phoneNumber || row.primaryPhone || '';
const primaryPhoneId = (row: ClickDialCustomerVO) => primaryPhoneObject(row)?.id;
const additionalPhones = (row: ClickDialCustomerVO) => row.phones?.filter((phone) => String(phone.id) !== String(primaryPhoneId(row))) || [];
const dial = async (row: ClickDialCustomerVO, phoneId?: string | number) => {
  dialingId.value = row.assignmentId;
  try {
    const call = (await dialAssignedCustomer(row.assignmentId, phoneId)).data;
    proxy?.$modal.msgSuccess('已发起外呼');
    resultDrawer.customer = row;
    resultDrawer.phoneNumber = call.phoneNumber;
    Object.assign(resultForm, {
      businessCallId: call.businessCallId,
      resultCode: 'CONNECTED',
      dialStatus: 'COMPLETED',
      resultRemark: '',
      nextFollowUpAt: undefined
    });
    resultDrawer.visible = true;
    await loadData();
  } finally {
    dialingId.value = undefined;
  }
};
const openResult = (row: ClickDialCustomerVO) => {
  resultDrawer.customer = row;
  resultDrawer.phoneNumber = primaryPhone(row);
  Object.assign(resultForm, {
    businessCallId: row.lastBusinessCallId || '',
    resultCode: row.lastResultCode || 'CONNECTED',
    dialStatus: row.dialStatus === 'UNCALLED' ? 'PROCESSING' : row.dialStatus,
    resultRemark: row.lastResultRemark || '',
    nextFollowUpAt: row.nextFollowUpAt
  });
  resultDrawer.visible = true;
};
const saveResult = async () => {
  if (!resultDrawer.customer || !(await resultFormRef.value?.validate())) return;
  resultDrawer.saving = true;
  try {
    await completeClickDialCustomer(resultDrawer.customer.assignmentId, resultForm);
    proxy?.$modal.msgSuccess('拨打结果已保存');
    resultDrawer.visible = false;
    await loadData();
  } finally {
    resultDrawer.saving = false;
  }
};
const openAttempts = async (row: ClickDialCustomerVO) => {
  attemptDrawer.visible = true;
  attemptDrawer.loading = true;
  attemptDrawer.customerName = row.customerName || '客户';
  try {
    attemptDrawer.rows = (await listCustomerDialAttempts(row.assignmentId)).data || [];
  } finally {
    attemptDrawer.loading = false;
  }
};
const showCustomer = (customerId: string | number) =>
  void router.push({ name: 'CustomerDetailWorkspace', params: { customerId: String(customerId) } });
const statusLabel = (status: ClickDialStatus) =>
  ({ UNCALLED: '未拨打', PROCESSING: '待处理', FOLLOW_UP: '需要跟进', COMPLETED: '已完成' })[status] || status;
const statusTag = (status: ClickDialStatus) =>
  ({ UNCALLED: 'info', PROCESSING: 'warning', FOLLOW_UP: 'primary', COMPLETED: 'success' })[status] as any;
const resultLabel = (code?: ClickDialResultCode) => resultOptions.find((item) => item.value === code)?.label || '-';
const isOverdue = (value?: string) => Boolean(value && new Date(value).getTime() <= Date.now());
onMounted(loadData);
</script>

<style scoped lang="scss">
.click-dial-page {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.summary-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(110px, 1fr));
  gap: 10px;
}
.summary-card {
  min-height: 78px;
  padding: 12px 16px;
  text-align: left;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  cursor: pointer;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}
.summary-card:hover,
.summary-card.active {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 1px var(--el-color-primary-light-7);
}
.summary-card span,
.summary-card strong {
  display: block;
}
.summary-card span {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
.summary-card strong {
  margin-top: 7px;
  font-size: 24px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}
.filter-card :deep(.el-card__body) {
  padding-bottom: 4px;
}
.filter-card :deep(.el-form-item) {
  margin-bottom: 12px;
}
.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.list-header div {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.list-header span {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.phone-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.phone-actions .el-button {
  margin-left: 0;
}
.overdue {
  color: var(--el-color-danger);
  font-weight: 500;
}
.pagination {
  justify-content: flex-end;
  margin-top: 14px;
}
.result-form {
  margin-top: 18px;
}
@media (max-width: 1280px) {
  .summary-grid {
    grid-template-columns: repeat(4, minmax(120px, 1fr));
  }
}
@media (max-width: 760px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(120px, 1fr));
  }
}
</style>
