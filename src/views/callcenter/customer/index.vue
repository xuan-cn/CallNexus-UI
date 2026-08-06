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
      <div class="table-toolbar">
        <el-button v-hasPermi="['callcenter:customer:create']" type="primary" plain @click="createVisible = true">
          <el-icon><Plus /></el-icon>
          新增客户
        </el-button>
        <el-button v-hasPermi="['callcenter:customer:import']" type="success" plain @click="openImport">
          <el-icon><Upload /></el-icon>
          批量导入
        </el-button>
      </div>
      <el-table v-loading="loading" :data="rows">
        <el-table-column label="客户姓名" min-width="150">
          <template #default="{ row }">
            <el-button class="customer-detail-link" link type="primary" @click="showDetail(row)">
              {{ row.customerName || '未命名客户' }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column label="客户电话" min-width="260">
          <template #default="{ row }">
            <div class="customer-phone-summary">
              <template v-if="primaryPhone(row)">
                <el-button
                  v-if="primaryPhone(row)?.enabled"
                  class="phone-dial-link"
                  link
                  type="primary"
                  title="拨打主号码"
                  @click="requestDialPhone(row, primaryPhone(row)!)"
                >
                  <el-icon><Phone /></el-icon>
                  {{ primaryPhone(row)?.phoneNumber }}
                </el-button>
                <span v-else class="primary-phone is-disabled">{{ primaryPhone(row)?.phoneNumber }}</span>
                <el-tag size="small" type="primary" effect="plain">主号</el-tag>
              </template>
              <span v-else>-</span>
              <el-popover v-if="customerPhones(row).length > 1" placement="bottom-start" :width="360" trigger="click">
                <template #reference>
                  <el-button class="more-phone-count" link type="primary">全部 {{ customerPhones(row).length }} 个号码</el-button>
                </template>
                <div class="phone-popover-title">选择要拨打的号码</div>
                <div class="phone-popover-list">
                  <div v-for="phone in customerPhones(row)" :key="phone.id || phone.phoneNumber" class="phone-popover-item">
                    <el-button
                      v-if="phone.enabled"
                      class="phone-dial-link"
                      link
                      type="primary"
                      title="点击拨打"
                      @click="requestDialPhone(row, phone)"
                    >
                      <el-icon><Phone /></el-icon>
                      {{ phone.phoneNumber }}
                    </el-button>
                    <span v-else class="is-disabled">{{ phone.phoneNumber }}</span>
                    <div class="phone-popover-tags">
                      <el-tag v-if="phone.primaryFlag" size="small" type="primary" effect="plain">主号</el-tag>
                      <el-tag v-if="phone.phoneLabel" size="small" type="info" effect="plain">{{ phone.phoneLabel }}</el-tag>
                      <el-tag v-if="phone.enabled === false" size="small" type="danger" effect="plain">停用</el-tag>
                    </div>
                  </div>
                </div>
              </el-popover>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="来源通话" prop="sourceCallId" min-width="240" show-overflow-tooltip />
        <el-table-column label="创建时间" prop="createTime" min-width="170" />
      </el-table>
      <pagination v-show="total > 0" v-model:page="query.pageNum" v-model:limit="query.pageSize" :total="total" @pagination="load" />
    </el-card>
    <CallCenterBusinessDetail v-model="detailVisible" business-type="CUSTOMER" :business-id="detailId" />
    <DynamicBusinessFormDialog v-model="createVisible" business-type="CUSTOMER" @saved="handleCreated" />
    <el-dialog v-model="importDialog.visible" title="批量导入客户" width="860px" append-to-body @closed="resetImport">
      <el-alert type="info" :closable="false" show-icon>
        <template #title>已有号码不会被覆盖，对应客户整行将跳过。</template>
        <div class="import-help">
          <span>主号码必填；其他号码可使用逗号、分号或换行分隔。</span>
          <span>需要号码标签时填写为“号码|标签”，例如：15135921427|本人。</span>
        </div>
      </el-alert>
      <div class="import-actions">
        <el-upload
          v-model:file-list="importFileList"
          :auto-upload="false"
          :limit="1"
          accept=".xlsx,.xls"
          :on-change="handleImportFileChange"
          :on-remove="handleImportFileRemove"
        >
          <el-button plain>选择 Excel 文件</el-button>
        </el-upload>
        <el-button plain @click="downloadImportTemplate">
          <el-icon><Download /></el-icon>
          下载模板
        </el-button>
        <el-button type="primary" :disabled="!importDialog.file" :loading="importDialog.loading" @click="submitImport"> 开始导入 </el-button>
      </div>
      <template v-if="importDialog.result">
        <div class="import-summary">
          <el-tag>总计 {{ importDialog.result.totalCount }}</el-tag>
          <el-tag type="success">成功 {{ importDialog.result.importedCount }}</el-tag>
          <el-tag type="warning">跳过 {{ importDialog.result.skippedCount }}</el-tag>
          <el-tag type="danger">失败 {{ importDialog.result.failedCount }}</el-tag>
        </div>
        <el-table :data="importDialog.result.rows" max-height="420">
          <el-table-column label="行号" prop="rowNumber" width="72" />
          <el-table-column label="客户姓名" min-width="130">
            <template #default="{ row }">{{ row.customerName || '未命名客户' }}</template>
          </el-table-column>
          <el-table-column label="主号码" prop="primaryPhone" min-width="150" />
          <el-table-column label="结果" width="90">
            <template #default="{ row }">
              <el-tag :type="importStatusType(row.status)" effect="plain">{{ importStatusLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="说明" prop="message" min-width="260" show-overflow-tooltip />
        </el-table>
      </template>
      <template #footer>
        <el-button @click="importDialog.visible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="CustomerManagement" lang="ts">
import {
  CustomerImportResultVO,
  CustomerImportStatus,
  CustomerPhoneVO,
  CustomerQuery,
  CustomerVO,
  importCustomers,
  listCustomers
} from '@/api/callcenter/customer';
import CallCenterBusinessDetail from '@/components/CallCenterBusinessDetail/index.vue';
import DynamicBusinessFormDialog from '@/layout/components/DynamicBusinessFormDialog.vue';
import { ElMessageBox, type UploadFile, type UploadUserFile } from 'element-plus';
import { Phone } from '@element-plus/icons-vue';
import { useAgentDialBus } from '@/composables/useAgentDial';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const agentDialBus = useAgentDialBus();
const loading = ref(false);
const rows = ref<CustomerVO[]>([]);
const total = ref(0);
const createVisible = ref(false);
const detailVisible = ref(false);
const detailId = ref<string | number>();
const query = reactive<CustomerQuery>({ pageNum: 1, pageSize: 10 });
const importFileList = ref<UploadUserFile[]>([]);
const importDialog = reactive({
  visible: false,
  loading: false,
  file: undefined as File | undefined,
  result: undefined as CustomerImportResultVO | undefined
});
const customerPhones = (row: CustomerVO): CustomerPhoneVO[] => {
  if (row.phones?.length) {
    return row.phones;
  }
  if (!row.primaryPhone) {
    return [];
  }
  return [
    {
      id: `primary-${row.id}`,
      phoneNumber: row.primaryPhone,
      normalizedPhone: row.primaryPhone,
      primaryFlag: true,
      enabled: true,
      sortOrder: 0
    }
  ];
};
const primaryPhone = (row: CustomerVO) => {
  const phones = customerPhones(row);
  return phones.find((phone) => phone.primaryFlag) || phones.find((phone) => phone.phoneNumber === row.primaryPhone) || phones[0];
};
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
const requestDialPhone = async (customer: CustomerVO, phone: CustomerPhoneVO) => {
  if (!phone.enabled) return;
  try {
    await ElMessageBox.confirm(`确认拨打 ${phone.phoneNumber}？`, `拨打${customer.customerName ? ` ${customer.customerName}` : '客户'}电话`, {
      type: 'info',
      confirmButtonText: '立即拨打',
      cancelButtonText: '取消'
    });
  } catch {
    return;
  }
  agentDialBus.emit({
    destination: phone.phoneNumber,
    customerId: customer.id,
    source: 'CUSTOMER_LIST'
  });
};
const handleCreated = async () => {
  query.pageNum = 1;
  await load();
};
const openImport = () => {
  resetImport();
  importDialog.visible = true;
};
const resetImport = () => {
  importFileList.value = [];
  importDialog.file = undefined;
  importDialog.result = undefined;
  importDialog.loading = false;
};
const handleImportFileChange = (file: UploadFile) => {
  importDialog.file = file.raw;
  importDialog.result = undefined;
};
const handleImportFileRemove = () => {
  importDialog.file = undefined;
};
const downloadImportTemplate = () => proxy?.download('api/v1/customers/import-template', {}, `客户批量导入模板_${Date.now()}.xlsx`);
const submitImport = async () => {
  if (!importDialog.file) return;
  importDialog.loading = true;
  try {
    importDialog.result = (await importCustomers(importDialog.file)).data;
    if (importDialog.result.importedCount > 0) {
      proxy?.$modal.msgSuccess(`成功导入 ${importDialog.result.importedCount} 位客户`);
      query.pageNum = 1;
      await load();
    }
  } finally {
    importDialog.loading = false;
  }
};
const importStatusLabel = (status: CustomerImportStatus) => ({ IMPORTED: '成功', SKIPPED: '跳过', FAILED: '失败' })[status];
const importStatusType = (status: CustomerImportStatus) =>
  ({ IMPORTED: 'success', SKIPPED: 'warning', FAILED: 'danger' })[status] as 'success' | 'warning' | 'danger';
onMounted(load);
</script>

<style scoped>
.table-toolbar {
  display: flex;
  margin-bottom: 12px;
  gap: 8px;
}

.customer-phone-summary {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  white-space: nowrap;
}

.customer-detail-link,
.phone-dial-link {
  height: auto;
  padding: 0;
}

.customer-detail-link {
  font-weight: 500;
}

.phone-dial-link {
  gap: 4px;
}

.primary-phone {
  overflow: hidden;
  color: var(--el-color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.is-disabled {
  color: var(--el-text-color-placeholder);
  text-decoration: line-through;
}

.more-phone-count {
  flex: none;
  height: auto;
  padding: 0 2px;
  font-size: 12px;
}

.phone-popover-title {
  margin-bottom: 8px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.phone-popover-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.phone-popover-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 34px;
  padding: 5px 4px;
  gap: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.phone-popover-item:last-child {
  border-bottom: 0;
}

.phone-popover-tags {
  display: flex;
  flex: none;
  gap: 4px;
}

.import-help {
  display: flex;
  flex-direction: column;
  margin-top: 4px;
  line-height: 1.7;
}

.import-actions,
.import-summary {
  display: flex;
  gap: 10px;
}

.import-actions {
  align-items: flex-start;
  margin: 18px 0;
}

.import-actions :deep(.el-upload) {
  display: flex;
  align-items: flex-start;
}

.import-actions > .el-button,
.import-actions :deep(.el-upload .el-button) {
  height: 32px;
}

.import-summary {
  align-items: center;
  margin-bottom: 12px;
}
</style>
