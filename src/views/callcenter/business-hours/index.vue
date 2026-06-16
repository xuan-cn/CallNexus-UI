<template>
  <div class="p-2">
    <el-card shadow="hover">
      <template #header>
        <div style="display: flex; justify-content: space-between">
          <el-button type="primary" plain icon="Plus" @click="openCreate">新增工作时间</el-button>
          <el-date-picker v-model="testAt" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" placeholder="可选择指定测试时间" />
        </div>
      </template>
      <el-table v-loading="loading" :data="plans">
        <el-table-column label="方案编码" prop="planCode" min-width="140" />
        <el-table-column label="方案名称" prop="planName" min-width="180" />
        <el-table-column label="时区" prop="timezone" min-width="160" />
        <el-table-column label="周期数" width="90"><template #default="{ row }">{{ row.periods.length }}</template></el-table-column>
        <el-table-column label="特殊日期" width="100"><template #default="{ row }">{{ row.exceptions.length }}</template></el-table-column>
        <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="210">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">修改</el-button>
            <el-button link type="success" @click="testPlan(row)">测试</el-button>
            <el-button link type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="visible" :title="form.id ? '修改工作时间' : '新增工作时间'" width="900px" append-to-body>
      <el-form :model="form" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="方案编码" required><el-input v-model="form.planCode" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="方案名称" required><el-input v-model="form.planName" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="时区" required><el-input v-model="form.timezone" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="状态"><el-switch v-model="form.enabled" active-text="启用" inactive-text="停用" /></el-form-item></el-col>
        </el-row>
        <el-divider content-position="left">周工作时段</el-divider>
        <el-button plain icon="Plus" @click="form.periods.push({ dayOfWeek: 1, startTime: '09:00:00', endTime: '18:00:00' })">添加时段</el-button>
        <el-table :data="form.periods" class="mt-2">
          <el-table-column label="星期" width="180"><template #default="{ row }"><el-select v-model="row.dayOfWeek"><el-option v-for="item in weekOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></template></el-table-column>
          <el-table-column label="开始时间"><template #default="{ row }"><el-time-picker v-model="row.startTime" value-format="HH:mm:ss" /></template></el-table-column>
          <el-table-column label="结束时间"><template #default="{ row }"><el-time-picker v-model="row.endTime" value-format="HH:mm:ss" /></template></el-table-column>
          <el-table-column label="操作" width="80"><template #default="{ $index }"><el-button link type="danger" @click="form.periods.splice($index, 1)">删除</el-button></template></el-table-column>
        </el-table>
        <el-divider content-position="left">特殊日期</el-divider>
        <el-button plain icon="Plus" @click="form.exceptions.push({ exceptionDate: '', exceptionType: 'CLOSED' })">添加特殊日期</el-button>
        <el-table :data="form.exceptions" class="mt-2">
          <el-table-column label="日期" width="170"><template #default="{ row }"><el-date-picker v-model="row.exceptionDate" value-format="YYYY-MM-DD" /></template></el-table-column>
          <el-table-column label="类型" width="150"><template #default="{ row }"><el-select v-model="row.exceptionType"><el-option label="全天休息" value="CLOSED" /><el-option label="自定义时段" value="CUSTOM" /></el-select></template></el-table-column>
          <el-table-column label="开始"><template #default="{ row }"><el-time-picker v-if="row.exceptionType === 'CUSTOM'" v-model="row.startTime" value-format="HH:mm:ss" /></template></el-table-column>
          <el-table-column label="结束"><template #default="{ row }"><el-time-picker v-if="row.exceptionType === 'CUSTOM'" v-model="row.endTime" value-format="HH:mm:ss" /></template></el-table-column>
          <el-table-column label="说明"><template #default="{ row }"><el-input v-model="row.description" /></template></el-table-column>
          <el-table-column label="操作" width="80"><template #default="{ $index }"><el-button link type="danger" @click="form.exceptions.splice($index, 1)">删除</el-button></template></el-table-column>
        </el-table>
      </el-form>
      <template #footer><el-button @click="visible = false">取消</el-button><el-button type="primary" @click="save">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup name="BusinessHours" lang="ts">
import { createBusinessHoursPlan, deleteBusinessHoursPlan, evaluateBusinessHoursPlan, getBusinessHoursPlan, listBusinessHoursPlans, updateBusinessHoursPlan } from '@/api/callcenter/business-hours';
import type { BusinessHoursPlan } from '@/api/callcenter/business-hours/types';
const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const loading = ref(false);
const visible = ref(false);
const testAt = ref('');
const plans = ref<BusinessHoursPlan[]>([]);
const empty = (): BusinessHoursPlan => ({ planCode: '', planName: '', timezone: 'Asia/Shanghai', enabled: true, periods: [], exceptions: [] });
const form = ref<BusinessHoursPlan>(empty());
const weekOptions = ['一', '二', '三', '四', '五', '六', '日'].map((label, index) => ({ label: `星期${label}`, value: index + 1 }));
const load = async () => { loading.value = true; try { plans.value = (await listBusinessHoursPlans()).data; } finally { loading.value = false; } };
const openCreate = () => { form.value = empty(); visible.value = true; };
const openEdit = async (row: BusinessHoursPlan) => { form.value = (await getBusinessHoursPlan(row.id!)).data; visible.value = true; };
const save = async () => { form.value.id ? await updateBusinessHoursPlan(form.value) : await createBusinessHoursPlan(form.value); proxy?.$modal.msgSuccess('保存成功'); visible.value = false; await load(); };
const remove = async (row: BusinessHoursPlan) => { await proxy?.$modal.confirm(`确认删除工作时间方案 ${row.planName} 吗？`); await deleteBusinessHoursPlan(row.id!); await load(); };
const testPlan = async (row: BusinessHoursPlan) => { const result = (await evaluateBusinessHoursPlan(row.id!, testAt.value || undefined)).data; proxy?.$modal.msgSuccess(result.inBusinessHours ? `测试时间在工作时间内：${result.reason}` : `测试时间在工作时间外：${result.reason}`); };
onMounted(load);
</script>

<style scoped>
:deep(.el-table .el-date-editor.el-input),
:deep(.el-table .el-date-editor.el-input__wrapper),
:deep(.el-table .el-time-editor.el-input),
:deep(.el-table .el-time-editor.el-input__wrapper) {
  width: 100%;
  min-width: 0;
}
</style>
