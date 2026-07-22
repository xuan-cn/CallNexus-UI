<template>
  <div class="area-code-page p-2">
    <el-card class="mb-2" shadow="hover">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true">
        <el-form-item label="国家码" prop="countryCode">
          <el-input v-model="queryParams.countryCode" clearable placeholder="默认 86" style="width: 120px" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="省份" prop="province">
          <el-input v-model="queryParams.province" clearable placeholder="例如 广东" style="width: 140px" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="城市" prop="city">
          <el-input v-model="queryParams.city" clearable placeholder="例如 深圳" style="width: 140px" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="区号" prop="areaCode">
          <el-input v-model="queryParams.areaCode" clearable placeholder="0755" style="width: 120px" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="状态" prop="enabled">
          <el-select v-model="queryParams.enabled" clearable style="width: 120px">
            <el-option label="启用" :value="true" />
            <el-option label="停用" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">查询</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <div class="content-grid">
      <el-card shadow="hover">
        <template #header>
          <div class="card-header">
            <div>
              <div class="card-title">区号维护</div>
              <div class="card-subtitle">维护固话区号，用于座机号码识别、异地补 0 和后续按地区选线。</div>
            </div>
            <el-button v-hasPermi="['callcenter:area-code:create']" type="primary" plain icon="Plus" @click="handleAdd">新增区号</el-button>
          </div>
        </template>

        <el-table v-loading="loading" :data="areaCodeList">
          <el-table-column label="国家码" prop="countryCode" width="90" />
          <el-table-column label="省份" prop="province" min-width="120" />
          <el-table-column label="城市" prop="city" min-width="120" />
          <el-table-column label="区号" prop="areaCode" width="110" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="创建时间" prop="createTime" min-width="160" />
          <el-table-column label="操作" width="140" fixed="right" align="center">
            <template #default="{ row }">
              <el-button v-hasPermi="['callcenter:area-code:update']" link type="primary" icon="Edit" @click="handleUpdate(row)" />
              <el-button v-hasPermi="['callcenter:area-code:delete']" link type="danger" icon="Delete" @click="handleDelete(row)" />
            </template>
          </el-table-column>
        </el-table>
        <pagination v-show="total > 0" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
      </el-card>

      <el-card shadow="hover">
        <template #header>
          <div class="card-title">号码规范化测试</div>
          <div class="card-subtitle">验证外线号码进入 IVR 转外线号码组前，会被处理成什么拨号号码。</div>
        </template>
        <el-form :model="normalizeForm" label-width="120px" class="test-form">
          <el-form-item label="待拨号码" required>
            <el-input v-model="normalizeForm.rawNumber" placeholder="手机号、010座机、8888666 或 +86 手机号" />
          </el-form-item>
          <el-form-item label="本地区号">
            <el-input v-model="normalizeForm.localAreaCode" placeholder="例如 0451，留空则不补本地区号" />
          </el-form-item>
          <el-form-item label="出局前缀">
            <el-input v-model="normalizeForm.outboundPrefix" placeholder="例如 9，通常留空" />
          </el-form-item>
          <el-form-item label="本地固话补区号">
            <el-switch v-model="normalizeForm.addLocalAreaCode" />
          </el-form-item>
          <el-form-item label="+86 手机号">
            <el-switch v-model="normalizeForm.stripChinaCountryCode" active-text="转国内号码" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="normalizeLoading" @click="handleNormalizeTest">开始测试</el-button>
            <el-button @click="resetNormalize">清空</el-button>
          </el-form-item>
        </el-form>

        <el-empty v-if="!normalizeResult" description="输入号码后点击开始测试" :image-size="80" />
        <el-descriptions v-else class="normalize-result" :column="1" border>
          <el-descriptions-item label="清洗后号码">{{ normalizeResult.cleanedNumber }}</el-descriptions-item>
          <el-descriptions-item label="规范号码">{{ normalizeResult.normalizedNumber }}</el-descriptions-item>
          <el-descriptions-item label="最终拨号">{{ normalizeResult.dialNumber }}</el-descriptions-item>
          <el-descriptions-item label="号码类型">{{ numberTypeLabel(normalizeResult.numberType) }}</el-descriptions-item>
          <el-descriptions-item label="归属地区">
            {{ normalizeResult.province || '-' }} {{ normalizeResult.city || '' }}
            <span v-if="normalizeResult.areaCode">（{{ normalizeResult.areaCode }}）</span>
          </el-descriptions-item>
          <el-descriptions-item v-if="normalizeResult.mobileSegment || normalizeResult.carrier" label="手机号段">
            {{ normalizeResult.mobileSegment || '-' }}
            <span v-if="normalizeResult.carrier"> / {{ normalizeResult.carrier }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="处理原因">{{ reasonLabel(normalizeResult.reason) }}</el-descriptions-item>
          <el-descriptions-item label="是否变化">
            <el-tag :type="normalizeResult.changed ? 'warning' : 'success'">{{ normalizeResult.changed ? '已调整' : '未变化' }}</el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>
    </div>

    <el-dialog v-model="dialog.visible" :title="dialog.title" width="520px" append-to-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="国家码" prop="countryCode">
          <el-input v-model="form.countryCode" placeholder="默认 86" />
        </el-form-item>
        <el-form-item label="省份" prop="province">
          <el-input v-model="form.province" placeholder="例如 广东" />
        </el-form-item>
        <el-form-item label="城市" prop="city">
          <el-input v-model="form.city" placeholder="例如 深圳" />
        </el-form-item>
        <el-form-item label="区号" prop="areaCode">
          <el-input v-model="form.areaCode" placeholder="例如 0755，填写 755 也会自动补 0" />
        </el-form-item>
        <el-form-item label="状态" prop="enabled">
          <el-switch v-model="form.enabled" active-text="启用" inactive-text="停用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="AreaCode" lang="ts">
import { createAreaCode, deleteAreaCode, getAreaCode, listAreaCodes, testPhoneNumberNormalize, updateAreaCode } from '@/api/callcenter/area-code';
import type { AreaCodeForm, AreaCodeQuery, AreaCodeVO, PhoneNumberNormalizeForm, PhoneNumberNormalizeResult } from '@/api/callcenter/area-code/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;

const loading = ref(false);
const normalizeLoading = ref(false);
const total = ref(0);
const areaCodeList = ref<AreaCodeVO[]>([]);
const normalizeResult = ref<PhoneNumberNormalizeResult>();
const queryFormRef = ref<ElFormInstance>();
const formRef = ref<ElFormInstance>();
const dialog = reactive<DialogOption>({ visible: false, title: '' });

const initialForm: AreaCodeForm = {
  countryCode: '86',
  province: '',
  city: '',
  areaCode: '',
  enabled: true
};

const data = reactive<PageData<AreaCodeForm, AreaCodeQuery>>({
  form: { ...initialForm },
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    countryCode: '',
    province: '',
    city: '',
    areaCode: '',
    enabled: undefined
  },
  rules: {
    province: [{ required: true, message: '省份不能为空', trigger: 'blur' }],
    city: [{ required: true, message: '城市不能为空', trigger: 'blur' }],
    areaCode: [{ required: true, message: '区号不能为空', trigger: 'blur' }]
  }
});

const { form, queryParams, rules } = toRefs(data);

const normalizeForm = reactive<PhoneNumberNormalizeForm>({
  rawNumber: '',
  localAreaCode: '',
  outboundPrefix: '',
  addLocalAreaCode: false,
  stripChinaCountryCode: true
});

const getList = async () => {
  loading.value = true;
  try {
    const res = await listAreaCodes(queryParams.value);
    areaCodeList.value = res.rows;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
};

const handleQuery = () => {
  queryParams.value.pageNum = 1;
  getList();
};

const resetQuery = () => {
  queryFormRef.value?.resetFields();
  handleQuery();
};

const reset = () => {
  form.value = { ...initialForm };
  formRef.value?.resetFields();
};

const handleAdd = () => {
  reset();
  dialog.title = '新增区号';
  dialog.visible = true;
};

const handleUpdate = async (row: AreaCodeVO) => {
  reset();
  const res = await getAreaCode(row.id);
  Object.assign(form.value, res.data);
  dialog.title = '修改区号';
  dialog.visible = true;
};

const submitForm = () =>
  formRef.value?.validate(async (valid) => {
    if (!valid) return;
    form.value.id ? await updateAreaCode(form.value) : await createAreaCode(form.value);
    proxy?.$modal.msgSuccess('保存成功');
    dialog.visible = false;
    await getList();
  });

const handleDelete = async (row: AreaCodeVO) => {
  await proxy?.$modal.confirm(`确认删除区号 ${row.areaCode}（${row.province}${row.city}）吗？`);
  await deleteAreaCode(row.id);
  proxy?.$modal.msgSuccess('删除成功');
  await getList();
};

const handleNormalizeTest = async () => {
  if (!normalizeForm.rawNumber?.trim()) {
    proxy?.$modal.msgWarning('请先输入待拨号码');
    return;
  }
  normalizeLoading.value = true;
  try {
    const res = await testPhoneNumberNormalize(normalizeForm);
    normalizeResult.value = res.data;
  } finally {
    normalizeLoading.value = false;
  }
};

const resetNormalize = () => {
  normalizeForm.rawNumber = '';
  normalizeForm.localAreaCode = '';
  normalizeForm.outboundPrefix = '';
  normalizeForm.addLocalAreaCode = false;
  normalizeForm.stripChinaCountryCode = true;
  normalizeResult.value = undefined;
};

const numberTypeLabel = (type: string) => ({ MOBILE: '手机号', LANDLINE: '固话', INTERNATIONAL: '国际号码', UNKNOWN: '未知号码' })[type] || type;

const reasonLabel = (reason: string) =>
  ({
    MOBILE: '手机号，无需补区号',
    INTERNATIONAL_NUMBER: '国际号码，保持原号码',
    LANDLINE_WITH_AREA_CODE: '固话已带区号',
    LOCAL_LANDLINE: '本地固话，未补区号',
    LOCAL_LANDLINE_ADD_AREA_CODE: '本地固话，已补本地区号',
    LANDLINE_ADD_ZERO_PREFIX: '识别到区号，已补前导 0',
    UNKNOWN_WITH_ZERO_PREFIX: '带 0 但未命中区号',
    UNKNOWN: '未识别号码类型'
  })[reason] || reason;

onMounted(getList);
</script>

<style scoped>
.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 420px;
  gap: 12px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.card-title {
  color: #0b4278;
  font-size: 16px;
  font-weight: 700;
}

.card-subtitle {
  margin-top: 4px;
  color: #7b8aa0;
  font-size: 13px;
}

.test-form {
  padding-right: 8px;
}

.normalize-result {
  margin-top: 12px;
}

@media (max-width: 1280px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
