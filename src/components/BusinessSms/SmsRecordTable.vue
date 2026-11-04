<template>
  <el-table :data="records" border>
    <el-table-column label="时间" prop="createTime" width="170" />
    <el-table-column label="手机号" prop="phone" width="135" />
    <el-table-column label="模板" prop="templateName" min-width="140" show-overflow-tooltip />
    <el-table-column label="内容" prop="content" min-width="220" show-overflow-tooltip />
    <el-table-column label="提交状态" width="135" fixed="right">
      <template #default="{ row }">
        <el-tooltip :content="`${row.resultCode || '等待后台提交'}${row.providerReference ? `；服务商编号：${row.providerReference}` : ''}`">
          <el-tag :type="row.status === 'ACCEPTED' ? 'success' : row.status === 'UNKNOWN' || row.status === 'REJECTED' ? 'warning' : 'info'">{{
            smsStatusLabels[row.status] || row.status
          }}</el-tag>
        </el-tooltip>
      </template>
    </el-table-column>
    <el-table-column label="来源" width="100"
      ><template #default="{ row }">{{ row.source === 'TEST' ? '测试发送' : '客户手动' }}</template></el-table-column
    >
    <el-table-column label="操作人" prop="operatorName" width="110" />
  </el-table>
</template>
<script setup lang="ts">
import { smsStatusLabels, type SmsRecord } from '@/api/callcenter/sms';
defineProps<{ records: SmsRecord[] }>();
</script>
