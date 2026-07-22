<template>
  <div class="p-2">
    <el-card class="mb-2" shadow="hover">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true">
        <el-form-item label="国家码" prop="countryCode">
          <el-input v-model="queryParams.countryCode" clearable placeholder="默认 86" style="width: 120px" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="号段" prop="segmentPrefix">
          <el-input v-model="queryParams.segmentPrefix" clearable placeholder="1760247" style="width: 140px" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="省份" prop="province">
          <el-input v-model="queryParams.province" clearable placeholder="辽宁" style="width: 140px" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="城市" prop="city">
          <el-input v-model="queryParams.city" clearable placeholder="沈阳" style="width: 140px" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="运营商" prop="carrier">
          <el-input v-model="queryParams.carrier" clearable placeholder="联通" style="width: 120px" @keyup.enter="handleQuery" />
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

    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <div>
            <div class="card-title">手机号段维护</div>
            <div class="card-subtitle">手机号段用于识别手机号归属省市和运营商；手机号外呼不会自动加 0。</div>
          </div>
          <el-button v-hasPermi="['callcenter:mobile-segment:create']" type="primary" plain icon="Plus" @click="handleAdd">新增号段</el-button>
        </div>
      </template>

      <el-table v-loading="loading" :data="segmentList">
        <el-table-column label="国家码" prop="countryCode" width="90" />
        <el-table-column label="号段" prop="segmentPrefix" min-width="130" />
        <el-table-column label="省份" prop="province" min-width="120" />
        <el-table-column label="城市" prop="city" min-width="120" />
        <el-table-column label="运营商" prop="carrier" width="110" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" prop="createTime" min-width="160" />
        <el-table-column label="操作" width="140" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-hasPermi="['callcenter:mobile-segment:update']" link type="primary" icon="Edit" @click="handleUpdate(row)" />
            <el-button v-hasPermi="['callcenter:mobile-segment:delete']" link type="danger" icon="Delete" @click="handleDelete(row)" />
          </template>
        </el-table-column>
      </el-table>
      <pagination v-show="total > 0" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
    </el-card>

    <el-dialog v-model="dialog.visible" :title="dialog.title" width="520px" append-to-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="国家码" prop="countryCode">
          <el-input v-model="form.countryCode" placeholder="默认 86" />
        </el-form-item>
        <el-form-item label="号段" prop="segmentPrefix">
          <el-input v-model="form.segmentPrefix" placeholder="建议填写 7 位号段，例如 1760247" />
        </el-form-item>
        <el-form-item label="省份" prop="province">
          <el-input v-model="form.province" placeholder="例如 辽宁" />
        </el-form-item>
        <el-form-item label="城市" prop="city">
          <el-input v-model="form.city" placeholder="例如 沈阳" />
        </el-form-item>
        <el-form-item label="运营商" prop="carrier">
          <el-select v-model="form.carrier" filterable allow-create default-first-option style="width: 100%">
            <el-option label="移动" value="移动" />
            <el-option label="联通" value="联通" />
            <el-option label="电信" value="电信" />
            <el-option label="广电" value="广电" />
          </el-select>
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

<script setup name="MobileSegment" lang="ts">
import {
  createMobileNumberSegment,
  deleteMobileNumberSegment,
  getMobileNumberSegment,
  listMobileNumberSegments,
  updateMobileNumberSegment
} from '@/api/callcenter/mobile-segment';
import type { MobileNumberSegmentForm, MobileNumberSegmentQuery, MobileNumberSegmentVO } from '@/api/callcenter/mobile-segment/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;

const loading = ref(false);
const total = ref(0);
const segmentList = ref<MobileNumberSegmentVO[]>([]);
const queryFormRef = ref<ElFormInstance>();
const formRef = ref<ElFormInstance>();
const dialog = reactive<DialogOption>({ visible: false, title: '' });

const initialForm: MobileNumberSegmentForm = {
  countryCode: '86',
  segmentPrefix: '',
  province: '',
  city: '',
  carrier: '',
  enabled: true
};

const data = reactive<PageData<MobileNumberSegmentForm, MobileNumberSegmentQuery>>({
  form: { ...initialForm },
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    countryCode: '',
    segmentPrefix: '',
    province: '',
    city: '',
    carrier: '',
    enabled: undefined
  },
  rules: {
    segmentPrefix: [{ required: true, message: '号段不能为空', trigger: 'blur' }],
    province: [{ required: true, message: '省份不能为空', trigger: 'blur' }],
    city: [{ required: true, message: '城市不能为空', trigger: 'blur' }],
    carrier: [{ required: true, message: '运营商不能为空', trigger: 'blur' }]
  }
});

const { form, queryParams, rules } = toRefs(data);

const getList = async () => {
  loading.value = true;
  try {
    const res = await listMobileNumberSegments(queryParams.value);
    segmentList.value = res.rows;
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
  dialog.title = '新增手机号段';
  dialog.visible = true;
};

const handleUpdate = async (row: MobileNumberSegmentVO) => {
  reset();
  const res = await getMobileNumberSegment(row.id);
  Object.assign(form.value, res.data);
  dialog.title = '修改手机号段';
  dialog.visible = true;
};

const submitForm = () =>
  formRef.value?.validate(async (valid) => {
    if (!valid) return;
    form.value.id ? await updateMobileNumberSegment(form.value) : await createMobileNumberSegment(form.value);
    proxy?.$modal.msgSuccess('保存成功');
    dialog.visible = false;
    await getList();
  });

const handleDelete = async (row: MobileNumberSegmentVO) => {
  await proxy?.$modal.confirm(`确认删除号段 ${row.segmentPrefix}（${row.province}${row.city} / ${row.carrier}）吗？`);
  await deleteMobileNumberSegment(row.id);
  proxy?.$modal.msgSuccess('删除成功');
  await getList();
};

onMounted(getList);
</script>

<style scoped>
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
</style>
