<template>
  <div class="p-2 customer-page">
    <el-card class="mb-2 filter-card" shadow="hover">
      <el-form :model="query" class="filter-panel">
        <el-form-item label="客户电话">
          <el-input v-model="query.primaryPhone" clearable placeholder="请输入客户电话" @keyup.enter="load" />
        </el-form-item>
        <el-form-item label="客户姓名">
          <el-input v-model="query.customerName" clearable placeholder="请输入客户姓名" @keyup.enter="load" />
        </el-form-item>
        <el-form-item label="客户类型">
          <el-input v-model="query.customerType" clearable placeholder="例如：意向客户" @keyup.enter="load" />
        </el-form-item>
        <el-form-item label="归属技能组">
          <el-select v-model="query.skillGroupId" clearable filterable placeholder="请选择">
            <el-option v-for="group in skillGroups" :key="group.id" :label="group.groupName" :value="group.id" />
          </el-select>
        </el-form-item>
        <el-form-item class="filter-actions">
          <el-button type="primary" @click="load">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="hover">
      <div class="table-toolbar">
        <div class="table-toolbar-left">
          <el-button v-hasPermi="['callcenter:customer:create']" type="primary" plain @click="openCreateCustomer">
            <el-icon><Plus /></el-icon>
            新增客户
          </el-button>
          <el-button v-hasPermi="['callcenter:customer:assign']" type="warning" plain :disabled="!selectedCustomers.length" @click="openAssign">
            资料分配
          </el-button>
        </div>
        <el-popover placement="bottom-end" :width="260" trigger="click">
          <template #reference>
            <el-button plain>列设置</el-button>
          </template>
          <div class="column-setting-title">固定字段显示</div>
          <el-checkbox-group v-model="visibleFixedColumns" class="column-setting-list">
            <el-checkbox v-for="column in configurableFixedColumns" :key="column.key" :label="column.key">
              {{ column.label }}
            </el-checkbox>
          </el-checkbox-group>
          <div class="column-setting-tip">自定义字段请在客户表单模板中打开“列表显示”。</div>
        </el-popover>
      </div>

      <el-table v-loading="loading" :data="rows" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="48" />
        <el-table-column label="客户姓名" min-width="150">
          <template #default="{ row }">
            <el-button class="customer-detail-link" link type="primary" @click="showDetail(row)">
              {{ row.customerName || '未命名客户' }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column label="客户电话" min-width="280">
          <template #default="{ row }">
            <div class="customer-phone-summary">
              <template v-if="primaryPhone(row)">
                <el-button
                  v-if="primaryPhone(row)?.enabled"
                  class="phone-dial-link"
                  link
                  type="primary"
                  title="点击拨打主号码"
                  @click="requestDialPhone(row, primaryPhone(row)!)"
                >
                  <el-icon><Phone /></el-icon>
                  {{ primaryPhone(row)?.phoneNumber }}
                </el-button>
                <span v-else class="primary-phone is-disabled">{{ primaryPhone(row)?.phoneNumber }}</span>
                <el-tag size="small" type="primary" effect="plain">主号</el-tag>
              </template>
              <span v-else>-</span>
              <el-popover v-if="customerPhones(row).length > 1" placement="bottom-start" :width="380" trigger="click">
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
        <el-table-column v-if="isFixedColumnVisible('sourceCallId')" label="来源通话" prop="sourceCallId" min-width="240" show-overflow-tooltip />
        <el-table-column v-if="isFixedColumnVisible('customerType')" label="客户类型" prop="customerType" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row.customerType || '-' }}</template>
        </el-table-column>
        <el-table-column v-if="isFixedColumnVisible('skillGroupId')" label="归属技能组" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ skillGroupName(row.skillGroupId) }}</template>
        </el-table-column>
        <el-table-column v-if="isFixedColumnVisible('agentId')" label="归属坐席" prop="agentId" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row.agentId || '-' }}</template>
        </el-table-column>
        <el-table-column v-if="isFixedColumnVisible('tags')" label="标签" prop="tags" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ row.tags || '-' }}</template>
        </el-table-column>
        <el-table-column v-for="field in listVisibleCustomerFields" :key="field.fieldCode" :label="field.fieldName" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ displayFormFieldValue(row.formData?.[field.fieldCode], field) }}</template>
        </el-table-column>
        <el-table-column label="创建时间" prop="createTime" min-width="170" />
        <el-table-column label="操作" width="110" fixed="right">
          <template #default="{ row }">
            <el-button v-hasPermi="['callcenter:customer:edit']" link type="primary" @click="openEditCustomer(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
      <pagination v-show="total > 0" v-model:page="query.pageNum" v-model:limit="query.pageSize" :total="total" @pagination="load" />
    </el-card>

    <CallCenterBusinessDetail v-model="detailVisible" business-type="CUSTOMER" :business-id="detailId" />
    <DynamicBusinessFormDialog v-model="createVisible" business-type="CUSTOMER" :phone-number="customerDialogPhone" @saved="handleCreated" />

    <el-drawer v-model="assignmentDialog.visible" title="资料分配" size="520px" append-to-body @closed="resetAssign">
      <el-alert type="info" :closable="false" show-icon title="分配后，客户会归属到指定坐席或技能组；普通坐席只能看到分配给自己或所在技能组的客户。" />
      <el-form class="assignment-form" :model="assignmentDialog.form" label-width="96px">
        <el-form-item label="已选客户">
          <el-tag>{{ selectedCustomers.length }} 个客户</el-tag>
        </el-form-item>
        <el-form-item label="技能组">
          <el-select v-model="assignmentDialog.form.skillGroupId" clearable filterable placeholder="请选择技能组" class="w-full">
            <el-option v-for="group in skillGroups" :key="group.id" :label="group.groupName" :value="group.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="坐席ID">
          <el-input v-model="assignmentDialog.form.agentId" clearable placeholder="可选，填写坐席ID" />
        </el-form-item>
        <el-form-item label="客户类型">
          <el-input v-model="assignmentDialog.form.customerType" clearable placeholder="例如：意向客户、售后客户" />
        </el-form-item>
        <el-form-item label="来源渠道">
          <el-input v-model="assignmentDialog.form.sourceChannel" clearable placeholder="例如：批量导入、微信客服" />
        </el-form-item>
        <el-form-item label="标签">
          <el-input v-model="assignmentDialog.form.tags" clearable placeholder="多个标签用逗号分隔" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="assignmentDialog.form.remark" type="textarea" :rows="3" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="drawer-footer">
          <el-button @click="assignmentDialog.visible = false">取消</el-button>
          <el-button type="primary" :loading="assignmentDialog.loading" @click="submitAssign">保存分配</el-button>
        </div>
      </template>
    </el-drawer>

    <template v-if="false">
      <el-drawer v-model="importDialog.visible" title="批量导入客户" size="82%" append-to-body @closed="resetImport">
        <div class="import-drawer">
        <el-alert type="info" :closable="false" show-icon>
          <template #title>先上传 Excel 分析字段，再确认字段映射和分配规则，最后执行导入。</template>
          <div class="import-help">
            <span>Excel 可以只有姓名和手机号；字段名不标准时，在“字段映射”里手动指定。</span>
            <span>需要按客户类型分配时，在“分配规则”里配置，例如：客户类型=意向客户 -> 售前组。</span>
          </div>
        </el-alert>

        <el-card class="import-section" shadow="never">
          <template #header>
            <div class="import-section-title">
              <span>1. 上传并分析</span>
              <el-tag v-if="importDialog.analysis" type="success" effect="plain">已识别 {{ importDialog.analysis.totalRows }} 行</el-tag>
            </div>
          </template>
          <div class="import-upload-layout">
            <el-upload
              v-model:file-list="importFileList"
              class="import-uploader"
              drag
              :auto-upload="false"
              :limit="1"
              accept=".xlsx,.xls"
              :on-change="handleImportFileChange"
              :on-remove="handleImportFileRemove"
            >
              <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
              <div class="el-upload__text">拖拽 Excel 文件到这里，或 <em>点击选择</em></div>
              <template #tip>
                <div class="el-upload__tip">仅支持 .xlsx / .xls，选择后点击“分析字段”。</div>
              </template>
            </el-upload>
            <div class="import-upload-actions">
              <el-button plain @click="downloadImportTemplate">
                <el-icon><Download /></el-icon>
                下载模板
              </el-button>
              <el-button type="primary" :disabled="!importDialog.file" :loading="importDialog.analyzing" @click="analyzeImportFile">分析字段</el-button>
            </div>
          </div>
        </el-card>

        <el-card v-if="importDialog.analysis" class="import-section" shadow="never">
          <template #header>
            <div class="import-section-title">
              <span>2. 字段映射</span>
              <span class="muted">左侧是 Excel 表头，右侧选择固定客户字段或表单模板字段</span>
            </div>
          </template>
          <el-form class="import-template-selector" label-width="96px">
            <el-form-item label="表单模板">
              <el-select
                v-model="importDialog.form.formTemplateId"
                clearable
                filterable
                class="template-select"
                placeholder="不写入自定义表单"
                @change="applyTemplateFieldSuggestions"
              >
                <el-option v-for="template in customerFormTemplates" :key="template.id" :label="template.templateName" :value="template.id" />
              </el-select>
              <span class="muted">选择后，可把 Excel 列映射到该客户表单模板的自定义字段。</span>
            </el-form-item>
          </el-form>
          <el-table :data="importDialog.mappings" max-height="260">
            <el-table-column label="Excel 表头" prop="header" min-width="180" show-overflow-tooltip />
            <el-table-column label="系统字段" min-width="220">
              <template #default="{ row }">
                <el-select v-model="row.field" clearable placeholder="忽略该列" class="w-full">
                  <el-option-group label="客户固定字段">
                    <el-option v-for="field in fixedImportFields" :key="field.value" :label="field.label" :value="field.value" />
                  </el-option-group>
                  <el-option-group v-if="templateImportFields.length" label="客户表单字段">
                    <el-option v-for="field in templateImportFields" :key="field.value" :label="field.label" :value="field.value" />
                  </el-option-group>
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="样例" min-width="280" show-overflow-tooltip>
              <template #default="{ row }">{{ sampleValue(row.header) || '-' }}</template>
            </el-table-column>
          </el-table>
        </el-card>

        <el-card class="import-section" shadow="never">
          <template #header>
            <div class="import-section-title">
              <span>3. 导入策略与分配</span>
            </div>
          </template>
          <el-form class="import-options" :model="importDialog.form" label-width="96px">
            <el-row :gutter="14">
              <el-col :span="8">
                <el-form-item label="重复号码">
                  <el-select v-model="importDialog.form.duplicateStrategy" class="w-full">
                    <el-option label="跳过已有客户" value="SKIP" />
                    <el-option label="更新归属信息" value="UPDATE_ASSIGNMENT" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="默认技能组">
                  <el-select v-model="importDialog.form.defaultSkillGroupId" class="w-full" clearable filterable placeholder="不分配">
                    <el-option v-for="group in skillGroups" :key="group.id" :label="group.groupName" :value="group.id" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="来源渠道">
                  <el-input v-model="importDialog.form.defaultSourceChannel" clearable placeholder="例如：批量导入" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="客户类型">
                  <el-input v-model="importDialog.form.defaultCustomerType" clearable placeholder="例如：意向客户" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="默认标签">
                  <el-input v-model="importDialog.form.defaultTags" clearable placeholder="多个标签用逗号" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="备注">
                  <el-input v-model="importDialog.form.defaultRemark" clearable placeholder="本批次导入说明" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>

          <div class="rule-toolbar">
            <span class="rule-title">分配规则</span>
            <el-button plain size="small" @click="addAssignmentRule">添加规则</el-button>
          </div>
          <el-table v-if="importDialog.rules.length" :data="importDialog.rules" class="rule-table" max-height="220">
            <el-table-column label="匹配字段" min-width="160">
              <template #default="{ row }">
                <el-select v-model="row.field" class="w-full">
                  <el-option label="客户类型" value="customerType" />
                  <el-option label="来源渠道" value="sourceChannel" />
                  <el-option label="标签包含" value="tags" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="匹配值" min-width="180">
              <template #default="{ row }">
                <el-input v-model="row.value" placeholder="例如：意向客户" />
              </template>
            </el-table-column>
            <el-table-column label="分配技能组" min-width="220">
              <template #default="{ row }">
                <el-select v-model="row.skillGroupId" class="w-full" clearable filterable placeholder="请选择技能组">
                  <el-option v-for="group in skillGroups" :key="group.id" :label="group.groupName" :value="group.id" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="90">
              <template #default="{ $index }">
                <el-button link type="danger" @click="removeAssignmentRule($index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-else description="未配置规则，导入时使用默认技能组" :image-size="60" />
        </el-card>

        <el-card v-if="importDialog.result || importDialog.batches.length" class="import-section" shadow="never">
          <template #header>
            <div class="import-section-title">
              <span>4. 导入任务</span>
              <el-button v-if="importDialog.result?.batchId && hasErrorRows" plain type="warning" size="small" @click="downloadImportErrors">下载失败明细</el-button>
            </div>
          </template>
          <div v-if="importDialog.result" class="import-task-panel">
            <div class="import-task-title">
              <span>{{ importDialog.result.fileName || '当前导入任务' }}</span>
              <el-tag :type="importBatchStatusType(importDialog.result.status)" effect="plain">
                {{ importBatchStatusLabel(importDialog.result.status) }}
              </el-tag>
            </div>
            <el-progress :percentage="importProgress" :status="importProgressStatus" />
            <div class="import-summary">
              <el-tag>总计 {{ importDialog.result.totalCount }}</el-tag>
              <el-tag type="success">成功 {{ importDialog.result.importedCount }}</el-tag>
              <el-tag type="warning">跳过 {{ importDialog.result.skippedCount }}</el-tag>
              <el-tag type="danger">失败 {{ importDialog.result.failedCount }}</el-tag>
              <el-button v-if="importDialog.result.failedCount" link type="primary" :loading="importDialog.loading" @click="retryImportRows()">重试全部失败行</el-button>
            </div>
            <el-alert v-if="importDialog.result.failureReason" class="mt-2" type="error" :closable="false" :title="importDialog.result.failureReason" />
          </div>
          <el-table v-if="importDialog.result?.rows?.length" :data="importDialog.result.rows" max-height="300">
            <el-table-column label="行号" prop="rowNumber" width="72" />
            <el-table-column label="客户姓名" min-width="130">
              <template #default="{ row }">
                <el-input v-if="importRowEditingId === row.id" v-model="importRowEditForm.customerName" size="small" />
                <span v-else>{{ row.customerName || '未命名客户' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="号码" min-width="150">
              <template #default="{ row }">
                <el-input v-if="importRowEditingId === row.id" v-model="importRowEditForm.originalPhone" size="small" />
                <span v-else>{{ row.normalizedPhone || row.primaryPhone || row.originalPhone || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="客户类型" min-width="120" show-overflow-tooltip>
              <template #default="{ row }">
                <el-input v-if="importRowEditingId === row.id" v-model="importRowEditForm.customerType" size="small" />
                <span v-else>{{ row.customerType || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="来源" min-width="120" show-overflow-tooltip>
              <template #default="{ row }">
                <el-input v-if="importRowEditingId === row.id" v-model="importRowEditForm.sourceChannel" size="small" />
                <span v-else>{{ row.sourceChannel || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="技能组" min-width="150" show-overflow-tooltip>
              <template #default="{ row }">
                <el-select v-if="importRowEditingId === row.id" v-model="importRowEditForm.skillGroupId" clearable filterable size="small" class="w-full">
                  <el-option v-for="group in skillGroups" :key="group.id" :label="group.groupName" :value="group.id" />
                </el-select>
                <span v-else>{{ skillGroupName(row.skillGroupId) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="结果" width="90">
              <template #default="{ row }">
                <el-tag :type="importStatusType(row.status)" effect="plain">{{ importStatusLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="说明" min-width="260" show-overflow-tooltip>
              <template #default="{ row }">{{ row.errorMessage || row.message || '-' }}</template>
            </el-table-column>
            <el-table-column label="操作" width="150" fixed="right">
              <template #default="{ row }">
                <template v-if="importRowEditingId === row.id">
                  <el-button link type="primary" @click="saveImportRow">保存</el-button>
                  <el-button link @click="cancelEditImportRow">取消</el-button>
                </template>
                <template v-else-if="row.status === 'FAILED'">
                  <el-button link type="primary" @click="startEditImportRow(row)">修正</el-button>
                  <el-button link type="success" :loading="importDialog.loading" @click="retryImportRows(row.id)">重试</el-button>
                </template>
                <span v-else>-</span>
              </template>
            </el-table-column>
          </el-table>
          <div class="import-batch-filter">
            <el-input v-model="importBatchQuery.fileName" clearable placeholder="文件名" />
            <el-select v-model="importBatchQuery.status" clearable placeholder="状态">
              <el-option label="等待中" value="PENDING" />
              <el-option label="处理中" value="PROCESSING" />
              <el-option label="成功" value="SUCCESS" />
              <el-option label="部分成功" value="PARTIAL_SUCCESS" />
              <el-option label="失败" value="FAILED" />
            </el-select>
            <el-button type="primary" @click="searchImportBatches">查询任务</el-button>
          </div>
          <el-table v-if="importDialog.batches.length" :data="importDialog.batches" class="import-batch-table" max-height="220">
            <el-table-column label="最近导入批次" min-width="220" show-overflow-tooltip>
              <template #default="{ row }">
                <el-button link type="primary" @click="selectImportBatch(row.batchId)">{{ row.fileName || row.batchId }}</el-button>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="110">
              <template #default="{ row }">
                <el-tag :type="importBatchStatusType(row.status)" effect="plain">{{ importBatchStatusLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="进度" width="180">
              <template #default="{ row }">{{ processedCount(row) }} / {{ row.totalCount }}</template>
            </el-table-column>
            <el-table-column label="成功/跳过/失败" width="180">
              <template #default="{ row }">{{ row.importedCount }} / {{ row.skippedCount }} / {{ row.failedCount }}</template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-if="importBatchTotal > 0"
            v-model:current-page="importBatchQuery.pageNum"
            v-model:page-size="importBatchQuery.pageSize"
            class="import-batch-pagination"
            background
            layout="total, prev, pager, next"
            :total="importBatchTotal"
            @current-change="loadImportBatches"
          />
        </el-card>
        </div>

      <template #footer>
        <div class="drawer-footer">
          <el-button @click="importDialog.visible = false">关闭</el-button>
          <el-button type="primary" :disabled="!canSubmitImport || importRunning" :loading="importDialog.loading" @click="submitImport">确认导入</el-button>
        </div>
      </template>
      </el-drawer>
    </template>
  </div>
</template>

<script setup name="CustomerManagement" lang="ts">
import {
  analyzeCustomerImportFile,
  assignCustomers,
  CustomerAssignmentForm,
  CustomerImportBatchStatus,
  CustomerImportAnalysisVO,
  CustomerImportBatchQuery,
  CustomerImportForm,
  CustomerImportResultVO,
  CustomerImportRowUpdateForm,
  CustomerImportStatus,
  CustomerPhoneVO,
  CustomerQuery,
  CustomerVO,
  getCustomerImportBatch,
  pageCustomerImportBatches,
  retryCustomerImportRows,
  startCustomerImport,
  updateCustomerImportRow,
  listCustomers
} from '@/api/callcenter/customer';
import { listSkillGroups } from '@/api/callcenter/skill-group';
import { SkillGroupVO } from '@/api/callcenter/skill-group/types';
import { listFormTemplates } from '@/api/callcenter/form-template';
import { FormTemplate } from '@/api/callcenter/form-template/types';
import CallCenterBusinessDetail from '@/components/CallCenterBusinessDetail/index.vue';
import DynamicBusinessFormDialog from '@/layout/components/DynamicBusinessFormDialog.vue';
import { useAgentDialBus } from '@/composables/useAgentDial';
import { Phone } from '@element-plus/icons-vue';
import { ElMessageBox, type UploadFile, type UploadUserFile } from 'element-plus';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const agentDialBus = useAgentDialBus();
const loading = ref(false);
const rows = ref<CustomerVO[]>([]);
const total = ref(0);
const createVisible = ref(false);
const customerDialogPhone = ref('');
const detailVisible = ref(false);
const detailId = ref<string | number>();
const query = reactive<CustomerQuery>({ pageNum: 1, pageSize: 10 });
const selectedCustomers = ref<CustomerVO[]>([]);
const defaultAssignmentForm = (): CustomerAssignmentForm => ({
  customerIds: [],
  customerType: '',
  sourceChannel: '',
  tags: '',
  skillGroupId: undefined,
  agentId: undefined,
  remark: ''
});
const assignmentDialog = reactive({
  visible: false,
  loading: false,
  form: defaultAssignmentForm()
});
const importFileList = ref<UploadUserFile[]>([]);
const skillGroups = ref<SkillGroupVO[]>([]);
const customerFormTemplates = ref<FormTemplate[]>([]);
const configurableFixedColumns = [
  { key: 'sourceCallId', label: '来源通话' },
  { key: 'customerType', label: '客户类型' },
  { key: 'skillGroupId', label: '归属技能组' },
  { key: 'agentId', label: '归属坐席' },
  { key: 'tags', label: '标签' }
];
const visibleFixedColumns = ref<string[]>([]);
const defaultImportForm = (): CustomerImportForm => ({
  duplicateStrategy: 'SKIP',
  defaultCustomerType: '',
  defaultSourceChannel: '批量导入',
  defaultTags: '',
  defaultSkillGroupId: undefined,
  defaultAgentId: undefined,
  defaultRemark: '',
  formTemplateId: undefined
});
const importDialog = reactive({
  visible: false,
  loading: false,
  analyzing: false,
  polling: false,
  file: undefined as File | undefined,
  form: defaultImportForm(),
  analysis: undefined as CustomerImportAnalysisVO | undefined,
  mappings: [] as Array<{ header: string; field?: string }>,
  rules: [] as Array<{ field: string; value: string; skillGroupId?: string | number }>,
  result: undefined as CustomerImportResultVO | undefined,
  batches: [] as CustomerImportResultVO[]
});
const importBatchQuery = reactive<CustomerImportBatchQuery>({ pageNum: 1, pageSize: 10, fileName: '', status: '' });
const importBatchTotal = ref(0);
const importRowEditingId = ref<string | number>();
const importRowEditForm = reactive<CustomerImportRowUpdateForm>({});
let importPollTimer: number | undefined;

const fixedImportFields = [
  { label: '客户姓名', value: 'name' },
  { label: '主号码', value: 'phone' },
  { label: '其他号码', value: 'additionalPhones' },
  { label: '客户类型', value: 'customerType' },
  { label: '来源渠道', value: 'sourceChannel' },
  { label: '标签', value: 'tags' },
  { label: '技能组ID', value: 'skillGroupId' },
  { label: '坐席ID', value: 'agentId' },
  { label: '备注', value: 'remark' }
];

const normalizeImportHeader = (value?: string) => (value || '').trim().toLowerCase().replace(/\s|_|-|\/|\\/g, '');
const selectedFormTemplate = computed(() => customerFormTemplates.value.find((item) => String(item.id) === String(importDialog.form.formTemplateId)));
const listVisibleCustomerFields = computed(() =>
  customerFormTemplates.value
    .filter((template) => template.enabled && template.businessType === 'CUSTOMER')
    .flatMap((template) => template.fields || [])
    .filter((field) => field.listVisible)
    .filter((field, index, fields) => fields.findIndex((item) => item.fieldCode === field.fieldCode) === index)
    .sort((first, second) => (first.sortOrder || 0) - (second.sortOrder || 0))
);
const templateImportFields = computed(() =>
  (selectedFormTemplate.value?.fields || [])
    .filter((field) => field.fieldType !== 'FILE')
    .map((field) => ({
      label: `${field.fieldName}（表单）`,
      value: `form:${field.fieldCode}`
    }))
);

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

const skillGroupName = (skillGroupId?: string | number) => {
  if (!skillGroupId) return '-';
  const group = skillGroups.value.find((item) => String(item.id) === String(skillGroupId));
  return group?.groupName || skillGroupId;
};

const isFixedColumnVisible = (key: string) => visibleFixedColumns.value.includes(key);

const displayFormFieldValue = (value: unknown, field: FormTemplate['fields'][number]) => {
  if (value === undefined || value === null || value === '') return '-';
  if (Array.isArray(value)) {
    return value.length ? value.join('，') : '-';
  }
  if (field.options?.length) {
    const values = String(value).split(',');
    const labels = values.map((item) => field.options.find((option) => option.value === item)?.label || item);
    return labels.join('，');
  }
  return String(value);
};

const hasErrorRows = computed(() => (importDialog.result?.failedCount || 0) > 0 || (importDialog.result?.skippedCount || 0) > 0);
const canSubmitImport = computed(() => !!importDialog.file && !!importDialog.analysis && importDialog.mappings.some((item) => item.field === 'phone'));
const importRunning = computed(() => isImportRunning(importDialog.result?.status));
const importProgress = computed(() => {
  const result = importDialog.result;
  if (!result || !result.totalCount) return 0;
  return Math.min(100, Math.round((processedCount(result) / result.totalCount) * 100));
});
const importProgressStatus = computed(() => {
  if (importDialog.result?.status === 'FAILED') return 'exception';
  if (isImportFinished(importDialog.result?.status)) return 'success';
  return undefined;
});

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

const resetQuery = () => {
  query.pageNum = 1;
  query.primaryPhone = '';
  query.customerName = '';
  query.customerType = '';
  query.skillGroupId = undefined;
  load();
};

const loadSkillGroups = async () => {
  const response = await listSkillGroups();
  skillGroups.value = response.data || [];
};

const loadCustomerFormTemplates = async () => {
  const response = await listFormTemplates('CUSTOMER');
  customerFormTemplates.value = (response.data || []).filter((item) => item.enabled);
};

const showDetail = (row: CustomerVO) => {
  detailId.value = row.id;
  detailVisible.value = true;
};

const openCreateCustomer = () => {
  customerDialogPhone.value = '';
  createVisible.value = true;
};

const openEditCustomer = (row: CustomerVO) => {
  const phone = primaryPhone(row)?.phoneNumber || row.primaryPhone;
  if (!phone) {
    proxy?.$modal.msgWarning('该客户没有可编辑的主号码');
    return;
  }
  customerDialogPhone.value = phone;
  createVisible.value = true;
};

const handleSelectionChange = (selection: CustomerVO[]) => {
  selectedCustomers.value = selection;
};

const openAssign = async () => {
  if (!selectedCustomers.value.length) {
    proxy?.$modal.msgWarning('请先选择客户');
    return;
  }
  if (!skillGroups.value.length) {
    await loadSkillGroups();
  }
  assignmentDialog.form = {
    ...defaultAssignmentForm(),
    customerIds: selectedCustomers.value.map((item) => item.id)
  };
  assignmentDialog.visible = true;
};

const resetAssign = () => {
  assignmentDialog.loading = false;
  assignmentDialog.form = defaultAssignmentForm();
};

const submitAssign = async () => {
  if (!selectedCustomers.value.length) {
    proxy?.$modal.msgWarning('请先选择客户');
    return;
  }
  assignmentDialog.loading = true;
  try {
    await assignCustomers({
      ...assignmentDialog.form,
      customerIds: selectedCustomers.value.map((item) => item.id)
    });
    proxy?.$modal.msgSuccess('客户资料已分配');
    assignmentDialog.visible = false;
    await load();
  } finally {
    assignmentDialog.loading = false;
  }
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

const openImport = async () => {
  resetImport();
  importDialog.visible = true;
  await Promise.all([loadSkillGroups(), loadCustomerFormTemplates(), loadImportBatches()]);
};

const resetImport = () => {
  stopImportPolling();
  importFileList.value = [];
  importDialog.file = undefined;
  importDialog.result = undefined;
  importDialog.analysis = undefined;
  importDialog.mappings = [];
  importDialog.rules = [];
  importDialog.batches = [];
  importDialog.loading = false;
  importDialog.analyzing = false;
  importDialog.polling = false;
  importDialog.form = defaultImportForm();
  importBatchQuery.pageNum = 1;
  importBatchQuery.pageSize = 10;
  importBatchQuery.fileName = '';
  importBatchQuery.status = '';
  importBatchTotal.value = 0;
  importRowEditingId.value = undefined;
};

const handleImportFileChange = (file: UploadFile) => {
  importDialog.file = file.raw;
  importDialog.result = undefined;
  importDialog.analysis = undefined;
  importDialog.mappings = [];
};

const handleImportFileRemove = () => {
  importDialog.file = undefined;
};

const downloadImportTemplate = () => proxy?.download('api/v1/customers/import-template', {}, `客户批量导入模板_${Date.now()}.xlsx`);

const downloadImportErrors = () => {
  if (!importDialog.result?.batchId) return;
  proxy?.download(`api/v1/customers/import-batches/${importDialog.result.batchId}/errors`, {}, `客户导入失败明细_${Date.now()}.xlsx`);
};

const analyzeImportFile = async () => {
  if (!importDialog.file) return;
  importDialog.analyzing = true;
  try {
    const response = await analyzeCustomerImportFile(importDialog.file);
    importDialog.analysis = response.data;
    importDialog.mappings = response.data.columns.map((item) => ({ header: item.header, field: item.suggestedField || undefined }));
    applyTemplateFieldSuggestions();
    importDialog.result = undefined;
  } finally {
    importDialog.analyzing = false;
  }
};

const applyTemplateFieldSuggestions = () => {
  if (!importDialog.mappings.length) return;
  const templateFields = selectedFormTemplate.value?.fields || [];
  const templateFieldByName = new Map<string, string>();
  templateFields.forEach((field) => {
    if (field.fieldType === 'FILE') return;
    templateFieldByName.set(normalizeImportHeader(field.fieldName), `form:${field.fieldCode}`);
    templateFieldByName.set(normalizeImportHeader(field.fieldCode), `form:${field.fieldCode}`);
  });
  importDialog.mappings.forEach((item) => {
    if (item.field && !item.field.startsWith('form:')) return;
    item.field = templateFieldByName.get(normalizeImportHeader(item.header)) || (item.field?.startsWith('form:') ? undefined : item.field);
  });
};

const sampleValue = (header: string) => importDialog.analysis?.sampleRows?.find((row) => row[header])?.[header];

const addAssignmentRule = () => {
  importDialog.rules.push({ field: 'customerType', value: '', skillGroupId: undefined });
};

const removeAssignmentRule = (index: number) => {
  importDialog.rules.splice(index, 1);
};

const buildImportForm = (): CustomerImportForm => {
  const mapping: Record<string, string> = {};
  importDialog.mappings.forEach((item) => {
    if (item.field) {
      mapping[item.header] = item.field;
    }
  });
  const rules = importDialog.rules.filter((item) => item.field && item.value && item.skillGroupId);
  return {
    ...importDialog.form,
    fieldMappingJson: JSON.stringify(mapping),
    assignmentRulesJson: JSON.stringify(rules)
  };
};

const submitImport = async () => {
  if (!canSubmitImport.value || !importDialog.file) {
    proxy?.$modal.msgWarning('请先上传并分析文件，且至少映射一个主号码字段');
    return;
  }
  importDialog.loading = true;
  try {
    importDialog.result = (await startCustomerImport(importDialog.file, buildImportForm())).data;
    proxy?.$modal.msgSuccess('导入任务已提交，正在后台处理');
    await loadImportBatches();
    startImportPolling(importDialog.result.batchId);
  } finally {
    importDialog.loading = false;
  }
};

const loadImportBatches = async () => {
  const response = await pageCustomerImportBatches(importBatchQuery);
  importDialog.batches = response.rows || [];
  importBatchTotal.value = response.total || 0;
};

const selectImportBatch = async (batchId?: string | number) => {
  if (!batchId) return;
  importDialog.result = (await getCustomerImportBatch(batchId)).data;
  if (isImportRunning(importDialog.result.status)) {
    startImportPolling(batchId);
  } else {
    stopImportPolling();
  }
};

const searchImportBatches = async () => {
  importBatchQuery.pageNum = 1;
  await loadImportBatches();
};

const startEditImportRow = (row: any) => {
  importRowEditingId.value = row.id;
  importRowEditForm.customerName = row.customerName;
  importRowEditForm.originalPhone = row.originalPhone || row.normalizedPhone || row.primaryPhone;
  importRowEditForm.customerType = row.customerType;
  importRowEditForm.sourceChannel = row.sourceChannel;
  importRowEditForm.tags = row.tags;
  importRowEditForm.skillGroupId = row.skillGroupId;
  importRowEditForm.agentId = row.agentId;
};

const cancelEditImportRow = () => {
  importRowEditingId.value = undefined;
};

const saveImportRow = async () => {
  if (!importDialog.result?.batchId || !importRowEditingId.value) return;
  importDialog.result = (await updateCustomerImportRow(importDialog.result.batchId, importRowEditingId.value, { ...importRowEditForm })).data;
  importRowEditingId.value = undefined;
  await loadImportBatches();
};

const retryImportRows = async (rowId?: string | number) => {
  if (!importDialog.result?.batchId) return;
  importDialog.loading = true;
  try {
    importDialog.result = (await retryCustomerImportRows(importDialog.result.batchId, rowId ? { rowIds: [rowId] } : {})).data;
    await Promise.all([loadImportBatches(), load()]);
    proxy?.$modal.msgSuccess('重试完成');
  } finally {
    importDialog.loading = false;
  }
};

const startImportPolling = (batchId?: string | number) => {
  if (!batchId) return;
  stopImportPolling();
  importDialog.polling = true;
  importPollTimer = window.setInterval(async () => {
    await refreshImportBatch(batchId);
  }, 1500);
  refreshImportBatch(batchId);
};

const refreshImportBatch = async (batchId: string | number) => {
  const result = (await getCustomerImportBatch(batchId)).data;
  importDialog.result = result;
  await loadImportBatches();
  if (!isImportRunning(result.status)) {
    stopImportPolling();
    if (result.importedCount > 0) {
      query.pageNum = 1;
      await load();
    }
  }
};

const stopImportPolling = () => {
  if (importPollTimer !== undefined) {
    window.clearInterval(importPollTimer);
    importPollTimer = undefined;
  }
  importDialog.polling = false;
};

const importStatusLabel = (status: CustomerImportStatus) => ({ IMPORTED: '成功', SKIPPED: '跳过', FAILED: '失败' })[status] || status;
const importStatusType = (status: CustomerImportStatus) =>
  ({ IMPORTED: 'success', SKIPPED: 'warning', FAILED: 'danger' })[status] as 'success' | 'warning' | 'danger';
const importBatchStatusLabel = (status?: CustomerImportBatchStatus) =>
  ({ PENDING: '等待中', IMPORTING: '导入中', PROCESSING: '处理中', SUCCESS: '成功', PARTIAL_SUCCESS: '部分成功', FAILED: '失败' })[status || 'PENDING'] || status;
const importBatchStatusType = (status?: CustomerImportBatchStatus) =>
  ({ PENDING: 'info', IMPORTING: 'primary', PROCESSING: 'primary', SUCCESS: 'success', PARTIAL_SUCCESS: 'warning', FAILED: 'danger' })[status || 'PENDING'] as
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'primary';
const processedCount = (result: CustomerImportResultVO) => (result.importedCount || 0) + (result.skippedCount || 0) + (result.failedCount || 0);
const isImportRunning = (status?: CustomerImportBatchStatus) => status === 'PENDING' || status === 'IMPORTING' || status === 'PROCESSING';
const isImportFinished = (status?: CustomerImportBatchStatus) => status === 'SUCCESS' || status === 'PARTIAL_SUCCESS';

onMounted(() => {
  load();
  loadSkillGroups();
  loadCustomerFormTemplates();
});
onBeforeUnmount(stopImportPolling);
</script>

<style scoped>
.filter-card :deep(.el-card__body) {
  padding: 16px 18px 8px;
}

.filter-panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)) auto;
  align-items: start;
  column-gap: 18px;
  row-gap: 10px;
}

.filter-panel :deep(.el-form-item) {
  margin-right: 0;
  margin-bottom: 10px;
}

.filter-panel :deep(.el-form-item__label) {
  width: 78px;
  justify-content: flex-start;
  color: var(--el-text-color-regular);
  font-weight: 600;
}

.filter-panel :deep(.el-form-item__content),
.filter-panel :deep(.el-input),
.filter-panel :deep(.el-select) {
  width: 100%;
}

.filter-actions {
  justify-self: end;
  white-space: nowrap;
}

.filter-actions :deep(.el-form-item__content) {
  width: auto;
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  gap: 8px;
}

.table-toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.column-setting-title {
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.column-setting-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.column-setting-tip {
  padding-top: 8px;
  margin-top: 8px;
  border-top: 1px solid var(--el-border-color-lighter);
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.assignment-form {
  margin-top: 18px;
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

.import-drawer {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-right: 4px;
}

.import-section {
  border-radius: 12px;
}

.import-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-weight: 600;
}

.muted {
  color: var(--el-text-color-secondary);
  font-size: 13px;
  font-weight: 400;
}

.import-template-selector {
  margin-bottom: 12px;
}

.template-select {
  width: 320px;
  margin-right: 12px;
}

.import-options {
  padding: 4px 0 0;
}

.rule-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 8px 0 10px;
}

.rule-title {
  font-weight: 600;
}

.rule-table {
  margin-top: 6px;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.import-options-shell {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: var(--el-fill-color-lighter);
}

.import-summary {
  display: flex;
  gap: 10px;
}

.import-task-panel {
  padding: 12px;
  margin-bottom: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: var(--el-fill-color-blank);
}

.import-task-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  gap: 12px;
  font-weight: 600;
}

.import-task-panel .import-summary {
  margin-top: 12px;
}

.import-batch-table {
  margin-top: 12px;
}

.import-batch-filter {
  display: flex;
  align-items: center;
  margin-top: 14px;
  gap: 8px;
}

.import-batch-filter .el-input,
.import-batch-filter .el-select {
  width: 180px;
}

.import-batch-pagination {
  justify-content: flex-end;
  margin-top: 12px;
}

.import-upload-layout {
  display: grid;
  grid-template-columns: minmax(420px, 1fr) 180px;
  gap: 16px;
  align-items: stretch;
  margin: 10px 0 2px;
}

.import-uploader {
  width: 100%;
}

.import-uploader :deep(.el-upload),
.import-uploader :deep(.el-upload-dragger) {
  width: 100%;
}

.import-uploader :deep(.el-upload-dragger) {
  min-height: 168px;
  padding: 28px 20px 18px;
  border-radius: 12px;
}

.import-upload-actions {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
}

.import-upload-actions .el-button {
  width: 100%;
  margin-left: 0;
}

.import-summary {
  align-items: center;
  margin-bottom: 12px;
}

@media (max-width: 960px) {
  .import-upload-layout {
    grid-template-columns: 1fr;
  }

  .import-upload-actions {
    flex-direction: row;
    justify-content: flex-start;
  }

  .import-upload-actions .el-button {
    width: auto;
  }
}
</style>
