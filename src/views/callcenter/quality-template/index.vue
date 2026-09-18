<template>
  <div class="p-2 quality-page">
    <el-card shadow="never">
      <template #header>
        <div class="page-header">
          <div>
            <h3>评分模板</h3>
            <span>配置人工质检的评分维度、扣分项、致命项和合格线</span>
          </div>
          <el-button v-hasPermi="['callcenter:quality-template:create']" type="primary" icon="Plus" @click="openCreate">新增模板</el-button>
        </div>
      </template>
      <el-table v-loading="loading" :data="rows">
        <el-table-column label="模板名称" prop="templateName" min-width="170" />
        <el-table-column label="适用方向" width="100"
          ><template #default="{ row }">{{ directionLabel(row.directionScope) }}</template></el-table-column
        >
        <el-table-column label="评分规则" min-width="180"
          ><template #default="{ row }">总分 {{ row.totalScore }} / 合格 {{ row.qualifiedScore }}</template></el-table-column
        >
        <el-table-column label="评分项" width="90"
          ><template #default="{ row }">{{ row.items?.length || 0 }} 项</template></el-table-column
        >
        <el-table-column label="状态" width="105"
          ><template #default="{ row }"
            ><el-tag :type="row.status === 'PUBLISHED' ? 'success' : 'warning'">{{
              row.status === 'PUBLISHED' ? `已发布 V${row.currentVersionNo || 1}` : '草稿'
            }}</el-tag></template
          ></el-table-column
        >
        <el-table-column label="备注" prop="remark" min-width="180" show-overflow-tooltip />
        <el-table-column label="操作" width="210" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-hasPermi="['callcenter:quality-template:update']" link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button v-hasPermi="['callcenter:quality-template:publish']" link type="success" @click="publish(row)">发布</el-button>
            <el-button v-hasPermi="['callcenter:quality-template:delete']" link type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-drawer v-model="drawer.visible" :title="drawer.title" size="78%" append-to-body destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="92px" class="template-form">
        <el-card shadow="never" class="mb-3">
          <template #header><span>基础规则</span></template>
          <el-row :gutter="16">
            <el-col :span="8"
              ><el-form-item label="模板编码" prop="templateCode"
                ><el-input v-model="form.templateCode" :disabled="!!form.id" placeholder="如 SERVICE_STANDARD" /></el-form-item
            ></el-col>
            <el-col :span="8"
              ><el-form-item label="模板名称" prop="templateName"><el-input v-model="form.templateName" /></el-form-item
            ></el-col>
            <el-col :span="8"
              ><el-form-item label="适用方向" prop="directionScope"
                ><el-select v-model="form.directionScope" style="width: 100%"
                  ><el-option label="全部" value="ALL" /><el-option label="呼入" value="INBOUND" /><el-option
                    label="呼出"
                    value="OUTBOUND" /></el-select></el-form-item
            ></el-col>
            <el-col :span="8"
              ><el-form-item label="总分" prop="totalScore"><el-input-number v-model="form.totalScore" :min="1" :max="1000" /></el-form-item
            ></el-col>
            <el-col :span="8"
              ><el-form-item label="合格分" prop="qualifiedScore"
                ><el-input-number v-model="form.qualifiedScore" :min="0" :max="form.totalScore" /></el-form-item
            ></el-col>
            <el-col :span="8"
              ><el-form-item label="AI预审"
                ><el-switch v-model="form.aiReviewEnabled" /><span class="form-tip">任务创建后异步生成初审建议</span></el-form-item
              ></el-col
            >
            <el-col :span="24"
              ><el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="2" maxlength="500" show-word-limit /></el-form-item
            ></el-col>
          </el-row>
        </el-card>
        <el-card shadow="never">
          <template #header
            ><div class="score-header">
              <span>评分项</span><el-button type="primary" plain icon="Plus" @click="addItem">新增评分项</el-button>
            </div></template
          >
          <el-table :data="form.items" row-key="rowKey" max-height="520">
            <el-table-column label="维度" min-width="180"
              ><template #default="{ row }"
                ><div class="inline-pair">
                  <el-input v-model="row.dimensionCode" placeholder="编码" /><el-input
                    v-model="row.dimensionName"
                    placeholder="名称"
                  /></div></template
            ></el-table-column>
            <el-table-column label="评分项" min-width="230"
              ><template #default="{ row }"
                ><div class="inline-pair">
                  <el-input v-model="row.itemCode" placeholder="评分项编码" /><el-input
                    v-model="row.itemName"
                    placeholder="评分项名称"
                  /></div></template
            ></el-table-column>
            <el-table-column label="类型" width="125"
              ><template #default="{ row }"
                ><el-select v-model="row.itemType"
                  ><el-option label="扣分" value="DEDUCTION" /><el-option label="加分" value="AWARD" /><el-option
                    label="手工分"
                    value="MANUAL" /></el-select></template
            ></el-table-column>
            <el-table-column label="分值" width="105"
              ><template #default="{ row }"><el-input-number v-model="row.scoreValue" :min="0" :max="form.totalScore" :controls="false" /></template
            ></el-table-column>
            <el-table-column label="规则说明" min-width="220"
              ><template #default="{ row }"><el-input v-model="row.ruleDescription" placeholder="何时判定不通过" /></template
            ></el-table-column>
            <el-table-column label="属性" min-width="250"
              ><template #default="{ row }"
                ><el-checkbox v-model="row.fatalFlag">致命项</el-checkbox><el-checkbox v-model="row.allowNotApplicable">可不适用</el-checkbox
                ><el-checkbox v-model="row.evidenceRequired">需证据</el-checkbox><el-checkbox v-model="row.aiReviewEnabled">AI判断</el-checkbox>
                <div v-if="form.aiReviewEnabled && row.aiReviewEnabled" class="ai-item-config">
                  <span>置信度</span
                  ><el-input-number v-model="row.aiConfidenceThreshold" :min="0" :max="1" :step="0.05" :precision="2" size="small" />
                  <el-input v-model="row.aiPromptHint" size="small" placeholder="可选：补充 AI 判断口径" /></div></template
            ></el-table-column>
            <el-table-column label="操作" width="70"
              ><template #default="{ $index }"
                ><el-button link type="danger" @click="form.items.splice($index, 1)">删除</el-button></template
              ></el-table-column
            >
          </el-table>
        </el-card>
      </el-form>
      <template #footer
        ><el-button @click="drawer.visible = false">取消</el-button
        ><el-button type="primary" :loading="saving" @click="save">保存草稿</el-button></template
      >
    </el-drawer>
  </div>
</template>

<script setup name="QualityTemplate" lang="ts">
import {
  createQualityTemplate,
  deleteQualityTemplate,
  getQualityTemplate,
  listQualityTemplates,
  publishQualityTemplate,
  updateQualityTemplate
} from '@/api/callcenter/quality';
import type { QualityTemplateForm, QualityTemplateItemVO, QualityTemplateVO } from '@/api/callcenter/quality/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const loading = ref(false);
const saving = ref(false);
const rows = ref<QualityTemplateVO[]>([]);
const formRef = ref<ElFormInstance>();
const drawer = reactive({ visible: false, title: '' });
let rowSequence = 0;
const emptyItem = (): QualityTemplateItemVO & { rowKey: number } => ({
  rowKey: ++rowSequence,
  dimensionCode: '',
  dimensionName: '',
  itemCode: '',
  itemName: '',
  itemType: 'DEDUCTION',
  scoreValue: 5,
  fatalFlag: false,
  allowNotApplicable: false,
  evidenceRequired: false,
  aiReviewEnabled: true,
  aiConfidenceThreshold: 0.7,
  aiPromptHint: '',
  ruleDescription: '',
  sortOrder: rowSequence
});
const emptyForm = (): QualityTemplateForm => ({
  templateCode: '',
  templateName: '',
  directionScope: 'ALL',
  totalScore: 100,
  qualifiedScore: 80,
  aiReviewEnabled: false,
  remark: '',
  version: undefined,
  items: [emptyItem()]
});
const form = reactive<QualityTemplateForm>(emptyForm());
const rules = {
  templateCode: [
    { required: true, message: '请输入模板编码', trigger: 'blur' },
    { pattern: /^[A-Za-z0-9_.-]{1,32}$/, message: '仅支持字母、数字、点、下划线和横线', trigger: 'blur' }
  ],
  templateName: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  directionScope: [{ required: true, message: '请选择适用方向', trigger: 'change' }],
  totalScore: [{ required: true, message: '请输入总分', trigger: 'change' }],
  qualifiedScore: [{ required: true, message: '请输入合格分', trigger: 'change' }]
};
const directionLabel = (value: string) => ({ ALL: '全部', INBOUND: '呼入', OUTBOUND: '呼出' })[value] || value;
const resetForm = (value?: QualityTemplateVO) => {
  Object.assign(form, value ? { ...value, items: value.items.map((item) => ({ ...item, rowKey: ++rowSequence })) } : emptyForm());
};
const load = async () => {
  loading.value = true;
  try {
    rows.value = (await listQualityTemplates()).data || [];
  } finally {
    loading.value = false;
  }
};
const openCreate = () => {
  resetForm();
  drawer.title = '新增评分模板';
  drawer.visible = true;
};
const openEdit = async (row: QualityTemplateVO) => {
  const response = await getQualityTemplate(row.id);
  resetForm(response.data);
  drawer.title = `编辑评分模板 - ${row.templateName}`;
  drawer.visible = true;
};
const addItem = () => form.items.push(emptyItem());
const validateItems = () => {
  const invalid = form.items.some((item) => !item.dimensionCode || !item.dimensionName || !item.itemCode || !item.itemName);
  if (invalid) proxy?.$modal.msgError('请完整填写评分项的维度和评分项编码、名称');
  return !invalid;
};
const save = async () => {
  if (!(await formRef.value?.validate()) || !validateItems()) return;
  saving.value = true;
  try {
    const payload = { ...form, items: form.items.map((item, index) => ({ ...item, sortOrder: index + 1 })) };
    form.id ? await updateQualityTemplate(form.id, payload) : await createQualityTemplate(payload);
    proxy?.$modal.msgSuccess('评分模板草稿已保存');
    drawer.visible = false;
    await load();
  } finally {
    saving.value = false;
  }
};
const publish = async (row: QualityTemplateVO) => {
  await proxy?.$modal.confirm(`发布“${row.templateName}”后将生成不可变版本，确定继续吗？`);
  await publishQualityTemplate(row.id);
  proxy?.$modal.msgSuccess('评分模板已发布');
  await load();
};
const remove = async (row: QualityTemplateVO) => {
  await proxy?.$modal.confirm(`确定删除“${row.templateName}”吗？`);
  await deleteQualityTemplate(row.id);
  proxy?.$modal.msgSuccess('删除成功');
  await load();
};
onMounted(load);
</script>

<style scoped>
.ai-item-config {
  display: grid;
  grid-template-columns: auto 96px;
  gap: 6px;
  align-items: center;
  margin-top: 4px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}
.ai-item-config .el-input {
  grid-column: 1 / -1;
}
</style>

<style scoped lang="scss">
.quality-page {
  font-size: 12px;
}
.page-header,
.score-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.page-header h3 {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 500;
}
.page-header span,
.form-tip {
  color: var(--el-text-color-secondary);
  font-size: 11px;
}
.inline-pair {
  display: grid;
  grid-template-columns: 42% 58%;
  gap: 6px;
}
.template-form :deep(.el-card__header) {
  padding: 12px 16px;
}
.template-form :deep(.el-card__body) {
  padding: 14px 16px;
}
.template-form :deep(.el-checkbox) {
  margin-right: 8px;
  font-size: 11px;
}
</style>
