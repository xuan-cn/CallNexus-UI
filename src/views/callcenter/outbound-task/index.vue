<template>
  <div class="p-2">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <div>
            <strong>预览式外呼任务</strong>
            <div class="description">坐席领取客户后查看资料，确认后手动拨打并登记外呼结果。</div>
          </div>
          <el-button v-hasPermi="['callcenter:outbound-task:create']" type="primary" plain icon="Plus" @click="handleAdd">新增任务</el-button>
        </div>
      </template>
      <el-table v-loading="loading" :data="tasks">
        <el-table-column label="任务编码" prop="taskCode" min-width="130" />
        <el-table-column label="任务名称" prop="taskName" min-width="170" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }"><el-tag :type="statusTag(row.status)">{{ statusLabel(row.status) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="名单进度" min-width="210">
          <template #default="{ row }">
            <el-progress :percentage="progress(row)" :stroke-width="10" />
            <span class="progress-text">完成 {{ row.completedCount }} / 总计 {{ row.totalCount }}，待处理 {{ row.pendingCount }}</span>
          </template>
        </el-table-column>
        <el-table-column label="说明" prop="description" min-width="180" show-overflow-tooltip />
        <el-table-column label="调度状态" min-width="300">
          <template #default="{ row }">
            <div class="schedule-status">
              <el-tag size="small" :type="row.dueRetryCount ? 'warning' : 'info'">到期 {{ row.dueRetryCount || 0 }}</el-tag>
              <span class="schedule-summary" :title="row.lastScheduleSummary || '暂无调度记录'">
                {{ compactScheduleSummary(row.lastScheduleSummary) }}
              </span>
              <span class="schedule-time">{{ row.lastScheduledAt || '尚未调度' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="480" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-hasPermi="['callcenter:outbound-task:query']" link type="primary" @click="showMembers(row)">名单</el-button>
            <el-button v-hasPermi="['callcenter:outbound-task:query']" link type="primary" @click="showStatistics(row)">统计</el-button>
            <el-button v-hasPermi="['callcenter:outbound-task:query']" link type="primary" @click="showReport(row)">详细报表</el-button>
            <el-button v-hasPermi="['callcenter:outbound-task:update']" link type="warning" @click="recoverExpired(row)">恢复异常名单</el-button>
            <el-button v-if="row.status !== 'RUNNING'" v-hasPermi="['callcenter:outbound-task:update']" link type="success" @click="changeTaskStatus(row, true)">开始</el-button>
            <el-button v-else v-hasPermi="['callcenter:outbound-task:update']" link type="warning" @click="changeTaskStatus(row, false)">暂停</el-button>
            <el-button v-if="row.status === 'RUNNING'" v-hasPermi="['callcenter:outbound-task:execute']" link type="primary" @click="openWorkbench(row)">执行</el-button>
            <el-button v-hasPermi="['callcenter:outbound-task:update']" link type="primary" icon="Edit" @click="handleUpdate(row)" />
            <el-button v-hasPermi="['callcenter:outbound-task:delete']" link type="danger" icon="Delete" @click="handleDelete(row)" />
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="taskDialog.visible" :title="taskDialog.title" width="680px" append-to-body>
      <el-form ref="taskFormRef" :model="taskForm" :rules="taskRules" label-width="90px">
        <el-form-item label="任务编码" prop="taskCode"><el-input v-model="taskForm.taskCode" placeholder="例如 OUTBOUND_202606" /></el-form-item>
        <el-form-item label="任务名称" prop="taskName"><el-input v-model="taskForm.taskName" /></el-form-item>
        <el-form-item label="任务说明"><el-input v-model="taskForm.description" type="textarea" :rows="4" maxlength="500" show-word-limit /></el-form-item>
        <el-divider content-position="left">自动重呼策略</el-divider>
        <el-form-item label="自动重呼"><el-switch v-model="taskForm.autoRetryEnabled" /></el-form-item>
        <template v-if="taskForm.autoRetryEnabled">
          <el-form-item label="触发结果">
            <el-select v-model="retryResultCodeValues" multiple style="width: 100%">
              <el-option label="无人接听" value="NO_ANSWER" />
              <el-option label="客户忙" value="BUSY" />
              <el-option label="其他失败" value="OTHER" />
            </el-select>
          </el-form-item>
          <el-form-item label="最大重呼">
            <el-input-number v-model="taskForm.maxRetryCount" :min="0" :max="10" />
            <span class="form-tip">次，不包含首次拨打</span>
          </el-form-item>
          <el-form-item label="重呼间隔">
            <el-input-number v-model="taskForm.retryIntervalMinutes" :min="1" :max="10080" />
            <span class="form-tip">分钟</span>
          </el-form-item>
          <el-divider content-position="left">到期重呼分配</el-divider>
          <el-form-item label="自动分配"><el-switch v-model="taskForm.autoAssignDueRetry" /></el-form-item>
          <el-form-item v-if="taskForm.autoAssignDueRetry" label="指定坐席">
            <el-select v-model="taskForm.retryAssigneeAgentId" filterable style="width: 100%" placeholder="选择到期后自动分配的坐席">
              <el-option v-for="agent in agentOptions" :key="agent.id" :label="`${agent.agentName}（${agent.agentCode}）`" :value="agent.id" />
            </el-select>
            <span class="form-tip">仅在坐席已签入示闲且没有活动外呼名单时自动分配。</span>
          </el-form-item>
        </template>
      </el-form>
      <template #footer><el-button @click="taskDialog.visible = false">取消</el-button><el-button type="primary" @click="submitTask">保存</el-button></template>
    </el-dialog>

    <el-drawer v-model="memberDrawer.visible" :title="`${memberDrawer.task?.taskName || ''} - 外呼名单`" size="72%">
      <div class="member-toolbar">
        <el-button v-hasPermi="['callcenter:outbound-task:update']" type="primary" plain @click="openCustomerDialog">添加客户</el-button>
        <el-button v-hasPermi="['callcenter:outbound-task:update']" type="success" plain @click="openImportDialog">Excel 导入</el-button>
      </div>
      <el-table :data="members">
        <el-table-column label="客户" prop="customerName" min-width="140"><template #default="{ row }">{{ row.customerName || '未提供姓名' }}</template></el-table-column>
        <el-table-column label="电话号码" prop="phoneNumber" min-width="140" />
        <el-table-column label="名单来源" width="110"><template #default="{ row }">{{ row.sourceType === 'EXCEL' ? 'Excel 导入' : '手工添加' }}</template></el-table-column>
        <el-table-column label="状态" width="100"><template #default="{ row }">{{ memberStatusLabel(row.status) }}</template></el-table-column>
        <el-table-column label="拨打次数" prop="attemptCount" width="90" />
        <el-table-column label="结果" width="120"><template #default="{ row }">{{ resultLabel(row.resultCode) }}</template></el-table-column>
        <el-table-column label="结果备注" prop="resultRemark" min-width="180" show-overflow-tooltip />
        <el-table-column label="下次重呼" prop="nextFollowUpAt" min-width="170" />
        <el-table-column label="结束原因" width="130"><template #default="{ row }">{{ completionReasonLabel(row.completionReason) }}</template></el-table-column>
        <el-table-column label="拦截原因" prop="blockedReason" min-width="180" show-overflow-tooltip />
        <el-table-column label="拦截时间" prop="blockedAt" min-width="170" />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="showAttempts(row)">拨打明细</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-drawer>

    <el-dialog v-model="customerDialog.visible" title="添加客户到外呼任务" width="760px" append-to-body>
      <el-form inline @submit.prevent><el-form-item label="客户电话"><el-input v-model="customerQuery.primaryPhone" clearable /></el-form-item><el-form-item label="客户姓名"><el-input v-model="customerQuery.customerName" clearable /></el-form-item><el-button type="primary" @click="loadCustomers">查询</el-button></el-form>
      <el-table ref="customerTableRef" :data="customers" @selection-change="selectedCustomers = $event">
        <el-table-column type="selection" width="48" />
        <el-table-column label="客户电话" prop="primaryPhone" min-width="150" />
        <el-table-column label="客户姓名" min-width="160"><template #default="{ row }">{{ row.customerName || '未提供姓名' }}</template></el-table-column>
        <el-table-column label="创建时间" prop="createTime" min-width="170" />
      </el-table>
      <template #footer><el-button @click="customerDialog.visible = false">取消</el-button><el-button type="primary" @click="addCustomers">添加选中客户</el-button></template>
    </el-dialog>

    <el-dialog v-model="importDialog.visible" title="Excel 导入外呼名单" width="920px" append-to-body :close-on-click-modal="false">
      <el-alert title="先上传文件进行预检，确认后才会写入外呼名单。电话号码会自动清理空格、横线和括号。" type="info" :closable="false" show-icon />
      <div class="import-actions">
        <el-upload ref="importUploadRef" :auto-upload="false" :limit="1" accept=".xlsx,.xls" :on-change="handleImportFileChange" :on-remove="handleImportFileRemove">
          <el-button class="import-action-button" type="primary" plain>选择 Excel 文件</el-button>
        </el-upload>
        <el-button class="import-action-button" plain icon="Download" @click="downloadImportTemplate">下载导入模板</el-button>
        <el-button
          v-if="importDialog.batch && importDialog.batch.invalidCount + importDialog.batch.duplicateCount + (importDialog.batch.blacklistedCount || 0) > 0"
          class="import-action-button"
          type="danger"
          plain
          icon="Download"
          @click="downloadImportErrors"
        >下载失败明细</el-button>
        <el-button class="import-action-button" type="success" :loading="importDialog.previewing" :disabled="!importFile" @click="previewImport">开始预检</el-button>
      </div>
      <template v-if="importDialog.batch">
        <div class="import-summary">
          <el-tag>总计 {{ importDialog.batch.totalCount }}</el-tag>
          <el-tag type="success">有效 {{ importDialog.batch.validCount }}</el-tag>
          <el-tag type="warning">重复 {{ importDialog.batch.duplicateCount }}</el-tag>
          <el-tag type="danger">无效 {{ importDialog.batch.invalidCount }}</el-tag>
          <el-tag type="danger">黑名单 {{ importDialog.batch.blacklistedCount || 0 }}</el-tag>
        </div>
        <el-table :data="importDialog.batch.rows" max-height="420">
          <el-table-column label="行号" prop="rowNumber" width="70" />
          <el-table-column label="客户姓名" min-width="130"><template #default="{ row }">{{ row.customerName || '未提供姓名' }}</template></el-table-column>
          <el-table-column label="原始号码" prop="originalPhone" min-width="150" />
          <el-table-column label="清洗后号码" prop="normalizedPhone" min-width="150" />
          <el-table-column label="预检结果" width="120"><template #default="{ row }"><el-tag :type="importStatusTag(row.status)">{{ importStatusLabel(row.status) }}</el-tag></template></el-table-column>
          <el-table-column label="说明" prop="errorMessage" min-width="260"><template #default="{ row }">{{ row.errorMessage || (row.customerId ? '已匹配现有客户' : '将创建新客户') }}</template></el-table-column>
        </el-table>
      </template>
      <template #footer>
        <el-checkbox v-model="importDialog.autoCreateCustomer" :disabled="!importDialog.batch">未匹配客户时自动创建客户</el-checkbox>
        <el-button @click="importDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="importDialog.confirming" :disabled="!importDialog.batch?.validCount" @click="confirmImport">确认导入有效名单</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="workbench.visible" title="预览式外呼工作台" width="720px" append-to-body :close-on-click-modal="false">
      <el-empty v-if="!workbench.member" description="点击领取下一位客户开始外呼">
        <el-button type="primary" @click="claimNext">领取下一位客户</el-button>
      </el-empty>
      <template v-else>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="客户姓名">{{ workbench.member.customerName || '客户未提供姓名' }}</el-descriptions-item>
          <el-descriptions-item label="客户电话">{{ workbench.member.phoneNumber }}</el-descriptions-item>
          <el-descriptions-item label="拨打次数">{{ workbench.member.attemptCount }}</el-descriptions-item>
          <el-descriptions-item label="名单状态">{{ memberStatusLabel(workbench.member.status) }}</el-descriptions-item>
        </el-descriptions>
        <div class="dial-actions">
          <el-button class="workbench-action" type="primary" plain @click="showCustomerDetail(workbench.member.customerId)">查看客户详情</el-button>
          <el-button class="workbench-action" type="success" :loading="workbench.dialing" :disabled="workbench.member.status === 'DIALING'" @click="dialCurrent">拨打客户</el-button>
        </div>
        <el-divider content-position="left">登记外呼结果</el-divider>
        <el-form label-width="100px">
          <el-form-item label="外呼结果"><el-select v-model="resultForm.resultCode" style="width: 100%" @change="handleResultChange"><el-option v-for="item in resultOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
          <el-form-item label="结果备注"><el-input v-model="resultForm.resultRemark" type="textarea" :rows="3" maxlength="1000" show-word-limit /></el-form-item>
          <el-form-item label="人工重呼"><el-switch v-model="resultForm.retry" @change="handleRetryChange" /></el-form-item>
          <el-form-item v-if="resultForm.retry" label="下次重呼"><el-date-picker v-model="resultForm.nextFollowUpAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" @change="handleFollowUpTimeChange" /></el-form-item>
          <el-alert
            v-if="resultForm.retry"
            title="人工设置的重呼时间会覆盖任务自动重呼策略；到达该时间后，名单重新允许领取。"
            type="warning"
            :closable="false"
            show-icon
          />
          <el-alert
            v-else-if="workbench.task?.autoRetryEnabled"
            :title="`任务已启用自动重呼，命中配置结果后系统将按 ${workbench.task.retryIntervalMinutes} 分钟间隔自动安排。`"
            type="info"
            :closable="false"
            show-icon
          />
          <el-alert v-if="workbench.suggestedResultLabel" :title="`系统建议结果：${workbench.suggestedResultLabel}，请坐席确认后保存。`" type="warning" :closable="false" show-icon />
        </el-form>
      </template>
      <template #footer>
        <el-button @click="workbench.visible = false">关闭</el-button>
        <el-button v-if="workbench.member" type="primary" @click="completeCurrent">保存外呼结果</el-button>
      </template>
    </el-dialog>
    <el-dialog v-model="statisticsDialog.visible" :title="`${statisticsDialog.task?.taskName || ''} - 外呼统计`" width="760px" append-to-body>
      <div v-loading="statisticsDialog.loading">
        <div v-if="statisticsDialog.data" class="statistics-grid">
          <div v-for="item in statisticsCards" :key="item.label" class="statistics-card">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
        <el-divider content-position="left">外呼结果分布</el-divider>
        <el-table :data="resultDistributionRows" empty-text="暂无已登记的外呼结果">
          <el-table-column label="外呼结果" prop="label" />
          <el-table-column label="数量" prop="count" width="140" />
        </el-table>
      </div>
    </el-dialog>
    <el-drawer v-model="attemptDrawer.visible" :title="`${attemptDrawer.member?.customerName || attemptDrawer.member?.phoneNumber || ''} - 拨打明细`" size="70%">
      <el-table v-loading="attemptDrawer.loading" :data="attempts">
        <el-table-column label="次数" prop="attemptNo" width="70" />
        <el-table-column label="开始时间" prop="startedAt" min-width="170" />
        <el-table-column label="接听时间" prop="answeredAt" min-width="170" />
        <el-table-column label="结束时间" prop="endedAt" min-width="170" />
        <el-table-column label="总时长" width="100"><template #default="{ row }">{{ durationLabel(row.durationSeconds) }}</template></el-table-column>
        <el-table-column label="接通时长" width="100"><template #default="{ row }">{{ durationLabel(row.billableSeconds) }}</template></el-table-column>
        <el-table-column label="业务结果" width="120"><template #default="{ row }">{{ resultLabel(row.resultCode) }}</template></el-table-column>
        <el-table-column label="挂断原因" prop="hangupCauseLabel" min-width="160" />
        <el-table-column label="通话标识" prop="businessCallId" min-width="260" show-overflow-tooltip />
      </el-table>
    </el-drawer>
    <el-drawer v-model="reportDrawer.visible" :title="`${reportDrawer.task?.taskName || ''} - 外呼详细报表`" size="88%" @closed="disposeTrendChart">
      <el-form :model="reportQuery" inline>
        <el-form-item label="客户电话"><el-input v-model="reportQuery.phoneNumber" clearable style="width: 150px" /></el-form-item>
        <el-form-item label="坐席ID"><el-input v-model="reportQuery.agentId" clearable style="width: 150px" /></el-form-item>
        <el-form-item label="业务结果">
          <el-select v-model="reportQuery.resultCode" clearable style="width: 140px"><el-option v-for="item in resultOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select>
        </el-form-item>
        <el-form-item label="系统建议">
          <el-select v-model="reportQuery.suggestedResultCode" clearable style="width: 140px"><el-option v-for="item in resultOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select>
        </el-form-item>
        <el-form-item label="挂断原因"><el-input v-model="reportQuery.hangupCause" clearable style="width: 170px" /></el-form-item>
        <el-form-item label="拨打时间">
          <el-date-picker v-model="reportDateRange" type="datetimerange" value-format="YYYY-MM-DD HH:mm:ss" range-separator="至" start-placeholder="开始时间" end-placeholder="结束时间" />
        </el-form-item>
        <el-form-item><el-button type="primary" icon="Search" @click="queryReport">查询</el-button><el-button icon="Refresh" @click="resetReport">重置</el-button><el-button type="success" plain icon="Download" @click="exportReport">导出明细</el-button></el-form-item>
      </el-form>
      <el-tabs v-model="reportDrawer.tab" @tab-change="handleReportTabChange">
        <el-tab-pane label="拨打明细" name="detail">
          <el-table v-loading="reportDrawer.loading" :data="reportAttempts">
            <el-table-column label="客户" prop="customerName" min-width="120" />
            <el-table-column label="电话" prop="phoneNumber" min-width="140" />
            <el-table-column label="坐席ID" prop="agentId" min-width="150" />
            <el-table-column label="次数" prop="attemptNo" width="70" />
            <el-table-column label="开始时间" prop="startedAt" min-width="170" />
            <el-table-column label="总时长" width="90"><template #default="{ row }">{{ durationLabel(row.durationSeconds) }}</template></el-table-column>
            <el-table-column label="接通时长" width="100"><template #default="{ row }">{{ durationLabel(row.billableSeconds) }}</template></el-table-column>
            <el-table-column label="业务结果" width="110"><template #default="{ row }">{{ resultLabel(row.resultCode) }}</template></el-table-column>
            <el-table-column label="系统建议" prop="suggestedResultLabel" width="110" />
            <el-table-column label="挂断原因" prop="hangupCauseLabel" min-width="160" />
          </el-table>
          <pagination v-show="reportTotal > 0" v-model:page="reportQuery.pageNum" v-model:limit="reportQuery.pageSize" :total="reportTotal" @pagination="loadReport" />
        </el-tab-pane>
        <el-tab-pane label="坐席汇总" name="agent">
          <el-table v-loading="reportDrawer.loading" :data="agentSummaries">
            <el-table-column label="坐席编码" prop="agentCode" min-width="130" />
            <el-table-column label="坐席名称" prop="agentName" min-width="130" />
            <el-table-column label="客户数" prop="customerCount" width="90" />
            <el-table-column label="拨打次数" prop="attemptCount" width="100" />
            <el-table-column label="接听次数" prop="answeredCount" width="100" />
            <el-table-column label="已接通" prop="connectedCount" width="90" />
            <el-table-column label="接听率" width="90"><template #default="{ row }">{{ row.answerRate }}%</template></el-table-column>
            <el-table-column label="接通率" width="90"><template #default="{ row }">{{ row.connectionRate }}%</template></el-table-column>
            <el-table-column label="总时长" width="110"><template #default="{ row }">{{ durationLabel(row.totalDurationSeconds) }}</template></el-table-column>
            <el-table-column label="接通时长" width="110"><template #default="{ row }">{{ durationLabel(row.billableSeconds) }}</template></el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="日期趋势" name="trend">
          <div class="trend-overview">
            <div v-for="item in trendOverviewCards" :key="item.label" class="trend-overview-card" :class="item.tone">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
              <small>{{ item.description }}</small>
            </div>
          </div>
          <div class="trend-panel">
            <div class="trend-panel-header">
              <div><strong>外呼量趋势</strong><span>按拨打开始日期统计</span></div>
              <div class="trend-legend"><span class="attempt"></span>拨打次数 <span class="answered"></span>接听次数 <span class="connected"></span>已接通</div>
            </div>
            <div v-if="dailyTrends.length" ref="trendChartRef" class="trend-chart" />
            <el-empty v-else description="当前筛选条件下暂无趋势数据" :image-size="80" />
          </div>
          <el-table :data="dailyTrends" class="trend-table">
            <el-table-column label="日期" prop="date" />
            <el-table-column label="客户数" prop="customerCount" />
            <el-table-column label="拨打次数" prop="attemptCount" />
            <el-table-column label="接听次数" prop="answeredCount" />
            <el-table-column label="已接通" prop="connectedCount" />
            <el-table-column label="接听率"><template #default="{ row }">{{ row.answerRate }}%</template></el-table-column>
            <el-table-column label="接通率"><template #default="{ row }">{{ row.connectionRate }}%</template></el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-drawer>
    <CallCenterBusinessDetail v-model="customerDetail.visible" business-type="CUSTOMER" :business-id="customerDetail.id" />
  </div>
</template>

<script setup name="OutboundTask" lang="ts">
import {
  addOutboundCustomers, claimNextOutboundMember, completeOutboundMember, confirmOutboundMemberImport, createOutboundTask, deleteOutboundTask, dialOutboundMember, getCurrentAssignedOutboundMember,
  getOutboundAgentSummary, getOutboundDailyTrend, getOutboundTask, getOutboundTaskStatistics, listOutboundAttempts, listOutboundMembers, listOutboundTasks, pageOutboundAttempts, pauseOutboundTask, recoverExpiredOutboundMembers,
  previewOutboundMemberImport, renewOutboundMemberLease, startOutboundTask, updateOutboundTask
} from '@/api/callcenter/outbound-task';
import { CompleteOutboundMemberForm, OutboundAgentSummaryVO, OutboundAttemptQuery, OutboundAttemptVO, OutboundDailyTrendVO, OutboundImportBatchVO, OutboundMemberVO, OutboundTaskForm, OutboundTaskStatisticsVO, OutboundTaskStatus, OutboundTaskVO } from '@/api/callcenter/outbound-task/types';
import { CustomerQuery, CustomerVO, listCustomers } from '@/api/callcenter/customer';
import { listAgents } from '@/api/callcenter/agent';
import type { AgentVO } from '@/api/callcenter/agent/types';
import CallCenterBusinessDetail from '@/components/CallCenterBusinessDetail/index.vue';
import type { UploadFile } from 'element-plus';
import * as echarts from 'echarts';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const loading = ref(false);
const tasks = ref<OutboundTaskVO[]>([]);
const agentOptions = ref<AgentVO[]>([]);
const taskFormRef = ref<ElFormInstance>();
const taskDialog = reactive({ visible: false, title: '', id: undefined as string | number | undefined });
const taskForm = reactive<OutboundTaskForm>({
  taskCode: '',
  taskName: '',
  description: '',
  autoRetryEnabled: true,
  maxRetryCount: 2,
  retryIntervalMinutes: 30,
  retryResultCodes: 'NO_ANSWER,BUSY,OTHER',
  autoAssignDueRetry: false,
  retryAssigneeAgentId: undefined
});
const retryResultCodeValues = computed({
  get: () => taskForm.retryResultCodes ? taskForm.retryResultCodes.split(',').filter(Boolean) : [],
  set: (values: string[]) => { taskForm.retryResultCodes = values.join(','); }
});
const taskRules = {
  taskCode: [{ required: true, pattern: /^[A-Za-z0-9_-]{2,32}$/, message: '请输入合法任务编码', trigger: 'blur' }],
  taskName: [{ required: true, message: '请输入任务名称', trigger: 'blur' }]
};
const memberDrawer = reactive({ visible: false, task: undefined as OutboundTaskVO | undefined });
const members = ref<OutboundMemberVO[]>([]);
const importUploadRef = ref();
const importFile = ref<File>();
const importDialog = reactive({
  visible: false,
  previewing: false,
  confirming: false,
  autoCreateCustomer: true,
  batch: undefined as OutboundImportBatchVO | undefined
});
const customerDialog = reactive({ visible: false });
const customerQuery = reactive<CustomerQuery>({ pageNum: 1, pageSize: 100, primaryPhone: '', customerName: '' });
const customers = ref<CustomerVO[]>([]);
const selectedCustomers = ref<CustomerVO[]>([]);
const workbench = reactive({ visible: false, task: undefined as OutboundTaskVO | undefined, member: undefined as OutboundMemberVO | undefined, dialing: false, suggestedResultLabel: '' });
const customerDetail = reactive({ visible: false, id: undefined as string | number | undefined });
const statisticsDialog = reactive({ visible: false, loading: false, task: undefined as OutboundTaskVO | undefined, data: undefined as OutboundTaskStatisticsVO | undefined });
const attemptDrawer = reactive({ visible: false, loading: false, member: undefined as OutboundMemberVO | undefined });
const attempts = ref<OutboundAttemptVO[]>([]);
const reportDrawer = reactive({ visible: false, loading: false, tab: 'detail', task: undefined as OutboundTaskVO | undefined });
const reportAttempts = ref<OutboundAttemptVO[]>([]);
const agentSummaries = ref<OutboundAgentSummaryVO[]>([]);
const dailyTrends = ref<OutboundDailyTrendVO[]>([]);
const trendChartRef = ref<HTMLElement>();
let trendChart: echarts.ECharts | undefined;
const reportTotal = ref(0);
const reportDateRange = ref<[string, string]>();
const reportQuery = reactive<OutboundAttemptQuery>({ pageNum: 1, pageSize: 10 });
const resultTouched = ref(false);
const resultForm = reactive<CompleteOutboundMemberForm>({ resultCode: 'CONNECTED', resultRemark: '', nextFollowUpAt: undefined, retry: false });
const resultOptions = [
  { value: 'CONNECTED', label: '已接通' }, { value: 'NO_ANSWER', label: '无人接听' }, { value: 'BUSY', label: '客户忙' },
  { value: 'INVALID_NUMBER', label: '号码无效' }, { value: 'NOT_INTERESTED', label: '无意向' }, { value: 'FOLLOW_UP', label: '需要跟进' }, { value: 'OTHER', label: '其他' }
];
const statusLabel = (value: OutboundTaskStatus) => ({ DRAFT: '草稿', RUNNING: '执行中', PAUSED: '已暂停', COMPLETED: '已完成' })[value];
const statusTag = (value: OutboundTaskStatus) => value === 'RUNNING' ? 'success' : value === 'PAUSED' ? 'warning' : 'info';
const memberStatusLabel = (value: string) => ({ PENDING: '待领取', CLAIMED: '已领取', DIALING: '拨打中', COMPLETED: '已完成', RETRY: '待重呼', SKIPPED: '已跳过', BLOCKED: '黑名单拦截' })[value] || value;
const completionReasonLabel = (value?: string) => ({ MANUAL: '人工确认', SYSTEM: '系统自动完成', RETRY_LIMIT_REACHED: '达到重呼上限' })[value || ''] || '-';
const importStatusLabel = (value: string) => ({ VALID: '有效', INVALID: '无效', DUPLICATE_FILE: '文件内重复', DUPLICATE_TASK: '任务内重复', BLACKLISTED: '黑名单拦截' })[value] || value;
const importStatusTag = (value: string) => value === 'VALID' ? 'success' : value === 'INVALID' ? 'danger' : 'warning';
const resultLabel = (value?: string) => resultOptions.find((item) => item.value === value)?.label || '-';
const statisticsCards = computed(() => {
  const data = statisticsDialog.data;
  if (!data) return [];
  return [
    { label: '总名单', value: data.totalCount },
    { label: '待领取', value: data.pendingCount },
    { label: '已领取', value: data.claimedCount },
    { label: '拨打中', value: data.dialingCount },
    { label: '已拨打', value: data.dialedCount },
    { label: '已接通', value: data.connectedCount },
    { label: '拨打尝试', value: data.totalAttemptCount },
    { label: '尝试接通', value: data.answeredAttemptCount },
    { label: '已完成', value: data.completedCount },
    { label: '待重呼', value: data.retryCount },
    { label: '等待重呼', value: data.waitingRetryCount },
    { label: '达到重呼上限', value: data.retryLimitReachedCount },
    { label: '已拦截', value: data.blockedCount },
    { label: '完成率', value: `${data.completionRate}%` },
    { label: '名单接通率', value: `${data.connectionRate}%` },
    { label: '尝试接通率', value: `${data.attemptConnectionRate}%` }
  ];
});
const resultDistributionRows = computed(() => Object.entries(statisticsDialog.data?.resultDistribution || {})
  .map(([code, count]) => ({ code, label: resultLabel(code), count })));
const trendOverviewCards = computed(() => {
  const attempts = dailyTrends.value.reduce((total, item) => total + item.attemptCount, 0);
  const answered = dailyTrends.value.reduce((total, item) => total + item.answeredCount, 0);
  const connected = dailyTrends.value.reduce((total, item) => total + item.connectedCount, 0);
  const customers = dailyTrends.value.reduce((total, item) => total + item.customerCount, 0);
  return [
    { label: '累计拨打', value: attempts, description: `${dailyTrends.value.length} 个统计日`, tone: 'primary' },
    { label: '累计接听', value: answered, description: `接听率 ${attempts ? Math.round(answered * 10000 / attempts) / 100 : 0}%`, tone: 'success' },
    { label: '业务接通', value: connected, description: `接通率 ${attempts ? Math.round(connected * 10000 / attempts) / 100 : 0}%`, tone: 'connected' },
    { label: '覆盖客户', value: customers, description: '按日客户数累计', tone: 'customer' }
  ];
});
const progress = (row: OutboundTaskVO) => row.totalCount ? Math.round(row.completedCount * 100 / row.totalCount) : 0;
const compactScheduleSummary = (summary?: string) => summary
  ? `本次：${summary.replace(/到期重呼=\d+，?/, '').replaceAll('，', ' · ')}`
  : '等待首次调度';
const resetTaskForm = () => Object.assign(taskForm, {
  taskCode: '', taskName: '', description: '', autoRetryEnabled: true, maxRetryCount: 2,
  retryIntervalMinutes: 30, retryResultCodes: 'NO_ANSWER,BUSY,OTHER',
  autoAssignDueRetry: false, retryAssigneeAgentId: undefined, version: undefined
});
const resetResult = () => Object.assign(resultForm, { resultCode: 'CONNECTED', resultRemark: '', nextFollowUpAt: undefined, retry: false });
const load = async () => { loading.value = true; try { tasks.value = (await listOutboundTasks()).data; } finally { loading.value = false; } };
const refreshTasksQuietly = async () => { tasks.value = (await listOutboundTasks()).data; };
const loadAgentOptions = async () => { agentOptions.value = (await listAgents({ pageNum: 1, pageSize: 1000, enabled: true })).rows; };
const handleAdd = async () => { resetTaskForm(); await loadAgentOptions(); taskDialog.id = undefined; taskDialog.title = '新增预览式外呼任务'; taskDialog.visible = true; };
const handleUpdate = async (row: OutboundTaskVO) => { resetTaskForm(); await loadAgentOptions(); Object.assign(taskForm, (await getOutboundTask(row.id)).data); taskDialog.id = row.id; taskDialog.title = '修改预览式外呼任务'; taskDialog.visible = true; };
const submitTask = () => taskFormRef.value?.validate(async (valid) => { if (!valid) return; taskDialog.id ? await updateOutboundTask(taskDialog.id, taskForm) : await createOutboundTask(taskForm); proxy?.$modal.msgSuccess('保存成功'); taskDialog.visible = false; await load(); });
const handleDelete = async (row: OutboundTaskVO) => { await proxy?.$modal.confirm(`确认删除外呼任务“${row.taskName}”吗？`); await deleteOutboundTask(row.id); proxy?.$modal.msgSuccess('删除成功'); await load(); };
const changeTaskStatus = async (row: OutboundTaskVO, start: boolean) => { start ? await startOutboundTask(row.id) : await pauseOutboundTask(row.id); proxy?.$modal.msgSuccess(start ? '任务已开始' : '任务已暂停'); await load(); };
const showMembers = async (row: OutboundTaskVO) => { memberDrawer.task = row; members.value = (await listOutboundMembers(row.id)).data; memberDrawer.visible = true; };
const showStatistics = async (row: OutboundTaskVO) => {
  statisticsDialog.task = row;
  statisticsDialog.visible = true;
  statisticsDialog.loading = true;
  try { statisticsDialog.data = (await getOutboundTaskStatistics(row.id)).data; } finally { statisticsDialog.loading = false; }
};
const showAttempts = async (row: OutboundMemberVO) => {
  attemptDrawer.member = row;
  attemptDrawer.visible = true;
  attemptDrawer.loading = true;
  try { attempts.value = (await listOutboundAttempts(row.id)).data; } finally { attemptDrawer.loading = false; }
};
const loadReport = async () => {
  if (!reportDrawer.task) return;
  reportDrawer.loading = true;
  reportQuery.taskId = reportDrawer.task.id;
  reportQuery.startedAtBegin = reportDateRange.value?.[0];
  reportQuery.startedAtEnd = reportDateRange.value?.[1];
  try {
    const response = await pageOutboundAttempts(reportQuery);
    reportAttempts.value = response.rows;
    reportTotal.value = response.total;
  } finally { reportDrawer.loading = false; }
};
const reportParams = () => ({ ...reportQuery, startedAtBegin: reportDateRange.value?.[0], startedAtEnd: reportDateRange.value?.[1] });
const loadAgentSummary = async () => { reportDrawer.loading = true; try { agentSummaries.value = (await getOutboundAgentSummary(reportParams())).data; } finally { reportDrawer.loading = false; } };
const loadDailyTrend = async () => {
  reportDrawer.loading = true;
  try {
    dailyTrends.value = (await getOutboundDailyTrend(reportParams())).data;
    await nextTick();
    renderTrendChart();
  } finally { reportDrawer.loading = false; }
};
const renderTrendChart = () => {
  if (!trendChartRef.value) return;
  trendChart?.dispose();
  trendChart = echarts.init(trendChartRef.value);
  trendChart.setOption({
    color: ['#053b70', '#18a981', '#55c99f'],
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(17, 32, 55, 0.94)',
      borderWidth: 0,
      padding: [10, 14],
      textStyle: { color: '#fff', fontSize: 12 },
      axisPointer: { type: 'line', lineStyle: { color: '#a9bad0', type: 'dashed' } }
    },
    grid: { left: 42, right: 20, top: 24, bottom: 34, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dailyTrends.value.map((item) => item.date.slice(5)),
      axisLine: { lineStyle: { color: '#dfe6ef' } },
      axisTick: { show: false },
      axisLabel: { color: '#8491a5', margin: 14 }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#8491a5' },
      splitLine: { lineStyle: { color: '#edf1f6', type: 'dashed' } }
    },
    series: [
      {
        name: '拨打次数',
        type: 'line',
        smooth: 0.35,
        symbol: 'circle',
        symbolSize: 7,
        showSymbol: false,
        lineStyle: { width: 3, color: '#053b70' },
        itemStyle: { color: '#053b70', borderColor: '#fff', borderWidth: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(5, 59, 112, 0.24)' },
            { offset: 1, color: 'rgba(5, 59, 112, 0.01)' }
          ])
        },
        data: dailyTrends.value.map((item) => item.attemptCount)
      },
      {
        name: '接听次数',
        type: 'line',
        smooth: 0.35,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: false,
        lineStyle: { width: 2.5, color: '#18a981' },
        itemStyle: { color: '#18a981' },
        data: dailyTrends.value.map((item) => item.answeredCount)
      },
      {
        name: '已接通',
        type: 'line',
        smooth: 0.35,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: false,
        lineStyle: { width: 2, color: '#55c99f', type: 'dashed' },
        itemStyle: { color: '#55c99f' },
        data: dailyTrends.value.map((item) => item.connectedCount)
      }
    ]
  });
};
const disposeTrendChart = () => { trendChart?.dispose(); trendChart = undefined; };
const handleReportTabChange = async (tab: string | number) => { if (tab === 'agent') await loadAgentSummary(); else if (tab === 'trend') await loadDailyTrend(); else await loadReport(); };
const showReport = async (row: OutboundTaskVO) => { reportDrawer.task = row; reportDrawer.tab = 'detail'; reportDrawer.visible = true; await loadReport(); };
const queryReport = async () => { reportQuery.pageNum = 1; await handleReportTabChange(reportDrawer.tab); };
const resetReport = async () => {
  Object.assign(reportQuery, { pageNum: 1, pageSize: 10, taskId: reportDrawer.task?.id, agentId: undefined, phoneNumber: '', resultCode: undefined, suggestedResultCode: undefined, hangupCause: '' });
  reportDateRange.value = undefined;
  await handleReportTabChange(reportDrawer.tab);
};
const exportReport = () => {
  if (!reportDrawer.task) return;
  proxy?.download('api/v1/outbound-tasks/attempts/export', reportParams(), `${reportDrawer.task.taskName}_外呼拨打明细_${Date.now()}.xlsx`);
};
const durationLabel = (seconds?: number) => seconds == null ? '-' : `${seconds}秒`;
const recoverExpired = async (row: OutboundTaskVO) => {
  await proxy?.$modal.confirm(`确认检查并恢复外呼任务“${row.taskName}”中已超过租约时间的异常名单吗？`);
  const count = (await recoverExpiredOutboundMembers(row.id)).data;
  proxy?.$modal.msgSuccess(count ? `已恢复 ${count} 条异常名单` : '没有需要恢复的异常名单');
  await load();
};
const openCustomerDialog = async () => { customerDialog.visible = true; await loadCustomers(); };
const loadCustomers = async () => { customers.value = (await listCustomers(customerQuery)).rows; };
const addCustomers = async () => {
  if (!memberDrawer.task || !selectedCustomers.value.length) return proxy?.$modal.msgWarning('请选择客户');
  const result = (await addOutboundCustomers(memberDrawer.task.id, selectedCustomers.value.map((item) => item.id))).data;
  const blockedText = result.blocked.length ? `，黑名单拦截 ${result.blocked.length} 条：${result.blocked.map(item => `${item.phoneNumber}${item.reason ? `（${item.reason}）` : ''}`).join('、')}` : '';
  proxy?.$modal.msgSuccess(`成功添加 ${result.addedCount} 条，重复跳过 ${result.duplicateCount} 条${blockedText}`);
  customerDialog.visible = false;
  await showMembers(memberDrawer.task);
  await load();
};
const openImportDialog = () => {
  importFile.value = undefined;
  importDialog.batch = undefined;
  importDialog.autoCreateCustomer = true;
  importDialog.visible = true;
  importUploadRef.value?.clearFiles();
};
const handleImportFileChange = (file: UploadFile) => {
  importFile.value = file.raw;
  importDialog.batch = undefined;
};
const handleImportFileRemove = () => {
  importFile.value = undefined;
  importDialog.batch = undefined;
};
const downloadImportTemplate = () => {
  if (!memberDrawer.task) return;
  proxy?.download(`api/v1/outbound-tasks/${memberDrawer.task.id}/members/import-template`, {}, `外呼名单导入模板_${new Date().getTime()}.xlsx`);
};
const downloadImportErrors = () => {
  if (!memberDrawer.task || !importDialog.batch) return;
  proxy?.download(
    `api/v1/outbound-tasks/${memberDrawer.task.id}/members/import-batches/${importDialog.batch.id}/errors`,
    {},
    `外呼名单失败明细_${new Date().getTime()}.xlsx`
  );
};
const previewImport = async () => {
  if (!memberDrawer.task || !importFile.value) return;
  importDialog.previewing = true;
  try {
    importDialog.batch = (await previewOutboundMemberImport(memberDrawer.task.id, importFile.value)).data;
  } finally {
    importDialog.previewing = false;
  }
};
const confirmImport = async () => {
  if (!memberDrawer.task || !importDialog.batch) return;
  importDialog.confirming = true;
  try {
    const result = (await confirmOutboundMemberImport(memberDrawer.task.id, importDialog.batch.id, importDialog.autoCreateCustomer)).data;
    proxy?.$modal.msgSuccess(`成功导入 ${result.importedCount} 条外呼名单`);
    importDialog.visible = false;
    await showMembers(memberDrawer.task);
    await load();
  } finally {
    importDialog.confirming = false;
  }
};
const openWorkbench = (row: OutboundTaskVO) => { workbench.task = row; workbench.member = undefined; workbench.suggestedResultLabel = ''; resultTouched.value = false; resetResult(); workbench.visible = true; };
const claimNext = async () => { if (!workbench.task) return; workbench.member = (await claimNextOutboundMember(workbench.task.id)).data; workbench.suggestedResultLabel = ''; resetResult(); resultTouched.value = false; };
const dialCurrent = async () => {
  if (!workbench.member) return;
  workbench.dialing = true;
  workbench.suggestedResultLabel = '';
  resultTouched.value = false;
  try { workbench.member = (await dialOutboundMember(workbench.member.id)).data; proxy?.$modal.msgSuccess('已发起外呼'); } finally { workbench.dialing = false; }
};
const showCustomerDetail = (customerId: string | number) => { customerDetail.id = customerId; customerDetail.visible = true; };
const handleResultChange = (resultCode: CompleteOutboundMemberForm['resultCode']) => {
  resultTouched.value = true;
  if (resultCode === 'FOLLOW_UP') resultForm.retry = true;
};
const refreshCurrentAttemptSuggestion = async () => {
  if (!workbench.visible || workbench.suggestedResultLabel || workbench.member?.status !== 'DIALING' || !workbench.member.businessCallId) return;
  try {
    const current = (await listOutboundAttempts(workbench.member.id)).data.find((item) => item.businessCallId === workbench.member?.businessCallId);
    if (!current?.suggestedResultCode) return;
    workbench.suggestedResultLabel = current.suggestedResultLabel || resultLabel(current.suggestedResultCode);
    if (!resultTouched.value) resultForm.resultCode = current.suggestedResultCode;
  } catch {
    // 保持当前表单，下一轮继续获取系统建议。
  }
};
const handleFollowUpTimeChange = (value?: string) => {
  if (value) resultForm.retry = true;
};
const handleRetryChange = (retry: boolean) => {
  if (!retry) resultForm.nextFollowUpAt = undefined;
};
const validateResult = () => {
  if (resultForm.retry && !resultForm.nextFollowUpAt) {
    proxy?.$modal.msgWarning('人工重呼时，请设置下次重呼时间');
    return false;
  }
  return true;
};
const completeCurrent = async () => {
  if (!workbench.member || !validateResult()) return;
  await completeOutboundMember(workbench.member.id, resultForm);
  proxy?.$modal.msgSuccess('外呼结果已保存，并已写入客户跟进记录');
  workbench.member = undefined;
  resetResult();
  await load();
};
let leaseRenewTimer: ReturnType<typeof setInterval> | undefined;
let suggestionTimer: ReturnType<typeof setInterval> | undefined;
let assignmentTimer: ReturnType<typeof setInterval> | undefined;
let taskRefreshTimer: ReturnType<typeof setInterval> | undefined;
const checkCurrentAssignment = async () => {
  if (workbench.visible) return;
  const member = (await getCurrentAssignedOutboundMember()).data;
  if (!member) return;
  if (!tasks.value.some((item) => String(item.id) === String(member.taskId))) await load();
  workbench.task = tasks.value.find((item) => String(item.id) === String(member.taskId));
  workbench.member = member;
  workbench.suggestedResultLabel = '';
  resetResult();
  resultTouched.value = false;
  workbench.visible = true;
  proxy?.$modal.msgSuccess('到期重呼名单已自动分配，请确认客户资料后拨打');
};
const renewCurrentMemberLease = async () => {
  if (!workbench.visible || !workbench.member || !['CLAIMED', 'DIALING'].includes(workbench.member.status)) return;
  try {
    workbench.member = (await renewOutboundMemberLease(workbench.member.id)).data;
  } catch {
    // 请求层已统一提示错误，保留当前名单供坐席继续处理。
  }
};
onMounted(() => {
  load();
  leaseRenewTimer = setInterval(renewCurrentMemberLease, 5 * 60 * 1000);
  suggestionTimer = setInterval(refreshCurrentAttemptSuggestion, 5 * 1000);
  assignmentTimer = setInterval(checkCurrentAssignment, 10 * 1000);
  taskRefreshTimer = setInterval(refreshTasksQuietly, 15 * 1000);
  checkCurrentAssignment();
});
onBeforeUnmount(() => {
  if (leaseRenewTimer) clearInterval(leaseRenewTimer);
  if (suggestionTimer) clearInterval(suggestionTimer);
  if (assignmentTimer) clearInterval(assignmentTimer);
  if (taskRefreshTimer) clearInterval(taskRefreshTimer);
});
</script>

<style scoped>
.card-header { display: flex; align-items: center; justify-content: space-between; }
.description, .progress-text { margin-top: 6px; color: var(--el-text-color-secondary); font-size: 12px; }
.schedule-status { display: flex; align-items: center; gap: 8px; min-width: 0; white-space: nowrap; }
.schedule-summary { max-width: 190px; overflow: hidden; color: var(--el-text-color-secondary); font-size: 12px; text-overflow: ellipsis; }
.schedule-time { color: var(--el-text-color-placeholder); font-size: 12px; }
.form-tip { margin-left: 8px; color: var(--el-text-color-secondary); font-size: 12px; }
.member-toolbar { margin-bottom: 14px; }
.import-actions { display: flex; align-items: flex-start; gap: 10px; margin: 18px 0; }
.import-actions :deep(.el-upload) { display: block; }
.import-actions :deep(.el-button + .el-button) { margin-left: 0; }
.import-action-button { min-width: 126px; margin-left: 0 !important; }
.import-summary { display: flex; gap: 10px; margin-bottom: 12px; }
.dial-actions { display: flex; justify-content: center; gap: 12px; padding: 24px 0 8px; }
.workbench-action { width: 132px; height: 40px; margin-left: 0 !important; }
.statistics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.statistics-card { display: flex; flex-direction: column; gap: 8px; padding: 16px; border: 1px solid var(--el-border-color-light); border-radius: 8px; background: var(--el-fill-color-light); }
.statistics-card span { color: var(--el-text-color-secondary); font-size: 13px; }
.statistics-card strong { color: var(--el-color-primary); font-size: 24px; }
.trend-overview { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
.trend-overview-card { position: relative; display: flex; flex-direction: column; gap: 6px; padding: 16px 18px; overflow: hidden; border: 1px solid #e7edf5; border-radius: 12px; background: #fff; }
.trend-overview-card::after { position: absolute; top: 0; right: 0; width: 52px; height: 52px; border-radius: 0 0 0 52px; content: ''; opacity: .12; background: currentColor; }
.trend-overview-card span { color: #778196; font-size: 12px; }
.trend-overview-card strong { color: #172033; font-size: 25px; line-height: 1.1; }
.trend-overview-card small { color: #8993a6; font-size: 11px; }
.trend-overview-card.primary { color: #053b70; }
.trend-overview-card.success { color: #18a981; }
.trend-overview-card.connected { color: #55c99f; }
.trend-overview-card.customer { color: #7c65c1; }
.trend-panel { padding: 18px 18px 8px; margin-bottom: 16px; border: 1px solid #e7edf5; border-radius: 14px; background: linear-gradient(180deg, #fff, #fbfcfe); box-shadow: 0 5px 18px rgba(28, 48, 78, .04); }
.trend-panel-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 0 2px 8px; }
.trend-panel-header > div:first-child { display: grid; gap: 4px; }
.trend-panel-header strong { color: #172033; font-size: 15px; }
.trend-panel-header span { color: #8a95a8; font-size: 11px; }
.trend-legend { display: flex; align-items: center; gap: 8px; color: #778196; font-size: 11px; }
.trend-legend span { width: 18px; height: 3px; border-radius: 3px; }
.trend-legend .attempt { background: #053b70; }
.trend-legend .answered { background: #18a981; }
.trend-legend .connected { background: #55c99f; }
.trend-chart { width: 100%; height: 330px; }
.trend-table { overflow: hidden; border: 1px solid #e7edf5; border-radius: 12px; }
@media (max-width: 1100px) { .trend-overview { grid-template-columns: repeat(2, 1fr); } }
</style>
