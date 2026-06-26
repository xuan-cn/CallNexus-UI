<template>
  <div class="p-2">
    <el-card class="mb-2" shadow="hover">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true">
        <el-form-item label="媒体名称" prop="assetName">
          <el-input v-model="queryParams.assetName" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="媒体分类" prop="category">
          <el-select v-model="queryParams.category" clearable style="width: 160px">
            <el-option v-for="item in categoryOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="来源" prop="sourceType">
          <el-select v-model="queryParams.sourceType" clearable style="width: 130px">
            <el-option v-for="item in sourceOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="enabled">
          <el-select v-model="queryParams.enabled" clearable style="width: 120px">
            <el-option label="启用" :value="true" />
            <el-option label="停用" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="hover">
      <template #header>
        <el-button v-hasPermi="['callcenter:media-asset:create']" type="primary" plain icon="Upload" @click="handleUpload">上传声音媒体</el-button>
      </template>
      <el-table v-loading="loading" :data="assetList">
        <el-table-column label="媒体名称" prop="assetName" min-width="180" />
        <el-table-column label="分类" width="140">
          <template #default="{ row }">{{ categoryLabel(row.category) }}</template>
        </el-table-column>
        <el-table-column label="来源" width="100">
          <template #default="{ row }">{{ sourceLabel(row.sourceType) }}</template>
        </el-table-column>
        <el-table-column label="文件名" prop="originalFileName" min-width="190" show-overflow-tooltip />
        <el-table-column label="大小" width="100">
          <template #default="{ row }">{{ formatFileSize(row.fileSize) }}</template>
        </el-table-column>
        <el-table-column label="时长" width="100">
          <template #default="{ row }">{{ formatDuration(row.durationMs) }}</template>
        </el-table-column>
        <el-table-column label="引用" prop="referenceCount" width="75" />
        <el-table-column label="版本" width="75"><template #default="{ row }">v{{ row.latestVersionNo || 1 }}</template></el-table-column>
        <el-table-column label="发布状态" width="105">
          <template #default="{ row }"><el-tag :type="publishTagType(row.publishStatus)">{{ publishLabel(row.publishStatus) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="同步" width="90"><template #default="{ row }">{{ row.syncSuccessCount || 0 }}/{{ row.syncFailedCount || 0 }}</template></el-table-column>
        <el-table-column label="状态" width="85">
          <template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="创建时间" prop="createTime" min-width="165" />
        <el-table-column label="操作" width="260" align="center" fixed="right">
          <template #default="{ row }">
            <el-button  v-hasPermi="['callcenter:media-asset:query']" link type="primary" icon="VideoPlay" @click="handlePreview(row)" />

            <el-tooltip content="上传新版本" placement="top" v-hasPermi="['callcenter:media-asset:create']">
              <el-button  link type="primary" icon="Upload" @click="handleVersion(row)" />
            </el-tooltip>
            <el-tooltip content="发布" placement="top">
              <el-button v-hasPermi="['callcenter:media-asset:publish']" link type="success" icon="Promotion" @click="handlePublish(row)" />
            </el-tooltip>
            <el-tooltip content="同步详情" placement="top">
              <el-button v-hasPermi="['callcenter:media-asset:sync']" link type="primary" icon="Connection" @click="handleSyncs(row)" />
            </el-tooltip>
            <el-button v-hasPermi="['callcenter:media-asset:update']" link type="primary" icon="Edit" @click="handleUpdate(row)" />
            <el-button v-hasPermi="['callcenter:media-asset:delete']" link type="danger" icon="Delete" :disabled="row.referenceCount > 0" @click="handleDelete(row)" />
          </template>
        </el-table-column>
      </el-table>
      <pagination v-show="total > 0" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
    </el-card>

    <el-dialog v-model="uploadDialog.visible" title="上传声音媒体" width="680px" append-to-body destroy-on-close>
      <el-form ref="uploadFormRef" :model="uploadForm" :rules="uploadRules" label-width="100px">
        <el-form-item label="媒体名称" prop="assetName"><el-input v-model="uploadForm.assetName" maxlength="128" /></el-form-item>
        <el-form-item label="媒体分类" prop="category">
          <el-select v-model="uploadForm.category" style="width: 100%">
            <el-option v-for="item in uploadCategoryOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="语言" prop="languageCode"><el-input v-model="uploadForm.languageCode" placeholder="例如 zh-CN" /></el-form-item>
        <el-form-item label="音频文件" prop="file">
          <el-upload :auto-upload="false" :limit="1" accept="audio/*" :on-change="handleFileChange" :on-remove="handleFileRemove">
            <el-button type="primary" plain>选择音频</el-button>
          </el-upload>
        </el-form-item>
        <el-form-item label="备注" prop="remark"><el-input v-model="uploadForm.remark" type="textarea" :rows="3" maxlength="500" show-word-limit /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="uploadDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="uploading" @click="submitUpload">上传</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="versionDialog.visible" title="上传新版本" width="560px" append-to-body>
      <el-upload :auto-upload="false" :limit="1" accept="audio/*" :on-change="handleVersionFile"><el-button type="primary" plain>选择音频</el-button></el-upload>
      <template #footer><el-button @click="versionDialog.visible = false">取消</el-button><el-button type="primary" :loading="uploading" @click="submitVersion">上传版本</el-button></template>
    </el-dialog>

    <el-dialog v-model="publishDialog.visible" title="发布声音媒体" width="620px" append-to-body>
      <el-alert class="mb-4" type="info" :closable="false" title="发布后节点 Agent 会自动下载并转换为 FreeSWITCH 标准 WAV。" />
      <el-form label-width="100px"><el-form-item label="目标节点组">
        <el-select v-model="publishGroupIds" multiple filterable style="width: 100%">
          <el-option v-for="group in nodeGroups" :key="group.id" :label="`${group.groupName}（${group.memberCount}个节点）`" :value="group.id" />
        </el-select>
      </el-form-item></el-form>
      <template #footer>
        <el-button @click="publishDialog.visible = false">取消</el-button>
        <el-button v-if="activeAsset?.publishStatus !== 'DRAFT'" type="danger" plain @click="submitUnpublish">取消发布</el-button>
        <el-button type="primary" :disabled="publishGroupIds.length === 0" @click="submitPublish">发布</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="syncDrawer.visible" title="版本与节点同步详情" size="70%">
      <el-button class="mb-3" type="primary" plain @click="retrySyncs">重新同步失败节点</el-button>
      <el-tabs>
        <el-tab-pane label="节点同步">
          <el-table :data="syncList">
            <el-table-column label="节点" prop="nodeName" min-width="140" />
            <el-table-column label="版本" width="80"><template #default="{ row }">v{{ row.versionNo }}</template></el-table-column>
            <el-table-column label="状态" prop="status" width="110" />
            <el-table-column label="重试" prop="retryCount" width="70" />
            <el-table-column label="目标路径" prop="targetPath" min-width="260" show-overflow-tooltip />
            <el-table-column label="失败原因" prop="failureReason" min-width="180" show-overflow-tooltip />
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="版本历史">
          <el-table :data="versionList">
            <el-table-column label="版本" width="80"><template #default="{ row }">v{{ row.versionNo }}</template></el-table-column>
            <el-table-column label="文件名" prop="originalFileName" min-width="220" />
            <el-table-column label="状态" prop="status" width="100" />
            <el-table-column label="创建时间" prop="createTime" min-width="170" />
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-drawer>

    <el-dialog v-model="editDialog.visible" title="修改声音媒体" width="620px" append-to-body>
      <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-width="100px">
        <el-form-item label="媒体名称" prop="assetName"><el-input v-model="editForm.assetName" maxlength="128" /></el-form-item>
        <el-form-item label="媒体分类"><el-input :model-value="categoryLabel(editForm.category)" disabled /></el-form-item>
        <el-form-item label="语言"><el-input v-model="editForm.languageCode" /></el-form-item>
        <el-form-item label="状态"><el-switch v-model="editForm.enabled" active-text="启用" inactive-text="停用" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="editForm.remark" type="textarea" :rows="3" maxlength="500" show-word-limit /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitEdit">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="previewDialog.visible" :title="previewAsset?.assetName || '声音试听'" width="760px" append-to-body destroy-on-close>
      <AudioWaveform v-if="previewAsset?.playbackUrl" :src="previewAsset.playbackUrl" />
      <el-empty v-else description="暂无可播放文件" />
      <el-descriptions v-if="previewAsset" class="mt-4" :column="2" border>
        <el-descriptions-item label="分类">{{ categoryLabel(previewAsset.category) }}</el-descriptions-item>
        <el-descriptions-item label="来源">{{ sourceLabel(previewAsset.sourceType) }}</el-descriptions-item>
        <el-descriptions-item label="文件名">{{ previewAsset.originalFileName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="语言">{{ previewAsset.languageCode || '-' }}</el-descriptions-item>
        <el-descriptions-item label="转写状态">{{ previewAsset.transcriptStatus }}</el-descriptions-item>
        <el-descriptions-item label="引用次数">{{ previewAsset.referenceCount }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup name="MediaAsset" lang="ts">
import { deleteMediaAsset, getMediaAsset, listMediaAssets, listMediaPublicationGroups, listMediaSyncs, listMediaVersions, publishMedia, retryMediaSyncs, unpublishMedia, updateMediaAsset, uploadMediaAsset, uploadMediaVersion } from '@/api/callcenter/media-asset';
import { MediaAssetCategory, MediaAssetForm, MediaAssetQuery, MediaAssetSourceType, MediaAssetUploadForm, MediaAssetVO, MediaSyncVO, MediaVersionVO } from '@/api/callcenter/media-asset/types';
import { listNodeGroups } from '@/api/callcenter/freeswitch-node-group';
import { NodeGroupVO } from '@/api/callcenter/freeswitch-node-group/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const loading = ref(false);
const uploading = ref(false);
const total = ref(0);
const assetList = ref<MediaAssetVO[]>([]);
const previewAsset = ref<MediaAssetVO>();
const activeAsset = ref<MediaAssetVO>();
const versionFile = ref<File>();
const versionDuration = ref<number>();
const versionList = ref<MediaVersionVO[]>([]);
const syncList = ref<MediaSyncVO[]>([]);
const nodeGroups = ref<NodeGroupVO[]>([]);
const publishGroupIds = ref<Array<string | number>>([]);
const queryFormRef = ref<ElFormInstance>();
const uploadFormRef = ref<ElFormInstance>();
const editFormRef = ref<ElFormInstance>();
const uploadDialog = reactive({ visible: false });
const editDialog = reactive({ visible: false });
const previewDialog = reactive({ visible: false });
const versionDialog = reactive({ visible: false });
const publishDialog = reactive({ visible: false });
const syncDrawer = reactive({ visible: false });
const categoryOptions: Array<{ label: string; value: MediaAssetCategory }> = [
  { label: 'IVR 提示音', value: 'IVR_PROMPT' },
  { label: '队列等待音乐', value: 'QUEUE_WAIT_MUSIC' },
  { label: '振铃音', value: 'RINGBACK_TONE' },
  { label: '用户音乐', value: 'USER_MUSIC' },
  { label: '坐席提示音', value: 'AGENT_PROMPT' }
];
const uploadCategoryOptions = categoryOptions;
const sourceOptions: Array<{ label: string; value: MediaAssetSourceType }> = [
  { label: '人工上传', value: 'UPLOAD' },
  { label: 'TTS 生成', value: 'TTS' },
  { label: 'AI 生成', value: 'AI_GENERATED' }
];
const queryParams = reactive<MediaAssetQuery>({ pageNum: 1, pageSize: 10 });
const uploadForm = reactive<Partial<MediaAssetUploadForm>>({ assetName: '', category: 'IVR_PROMPT', languageCode: 'zh-CN', remark: '' });
const editForm = reactive<MediaAssetForm>({ assetName: '', category: 'IVR_PROMPT', languageCode: '', remark: '', enabled: true });
const uploadRules = {
  assetName: [{ required: true, message: '请输入媒体名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择媒体分类', trigger: 'change' }],
  file: [{ required: true, message: '请选择音频文件', trigger: 'change' }]
};
const editRules = { assetName: [{ required: true, message: '请输入媒体名称', trigger: 'blur' }] };
const categoryLabel = (value: MediaAssetCategory) => categoryOptions.find((item) => item.value === value)?.label || value;
const sourceLabel = (value: MediaAssetSourceType) => sourceOptions.find((item) => item.value === value)?.label || value;
const publishLabel = (value?: string) => ({ DRAFT: '草稿', PUBLISHING: '发布中', PARTIAL: '部分发布', PUBLISHED: '已发布', FAILED: '失败', UNPUBLISHED: '已取消' }[value || 'DRAFT'] || value);
const publishTagType = (value?: string) => value === 'PUBLISHED' ? 'success' : value === 'PARTIAL' ? 'warning' : value === 'FAILED' ? 'danger' : 'info';
const formatFileSize = (value?: number) => !value ? '-' : value >= 1024 * 1024 ? `${(value / 1024 / 1024).toFixed(1)} MB` : `${(value / 1024).toFixed(1)} KB`;
const formatDuration = (value?: number) => {
  if (!value) return '-';
  const seconds = Math.round(value / 1000);
  return `${Math.floor(seconds / 60)}分${seconds % 60}秒`;
};
const readDuration = (file: File) => new Promise<number | undefined>((resolve) => {
  const audio = document.createElement('audio');
  const url = URL.createObjectURL(file);
  audio.preload = 'metadata';
  audio.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(Number.isFinite(audio.duration) ? Math.round(audio.duration * 1000) : undefined); };
  audio.onerror = () => { URL.revokeObjectURL(url); resolve(undefined); };
  audio.src = url;
});
const getList = async () => {
  loading.value = true;
  try {
    const res = await listMediaAssets(queryParams);
    assetList.value = res.rows;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
};
const handleQuery = () => { queryParams.pageNum = 1; getList(); };
const resetQuery = () => { queryFormRef.value?.resetFields(); handleQuery(); };
const handleUpload = () => {
  Object.assign(uploadForm, { assetName: '', category: 'IVR_PROMPT', languageCode: 'zh-CN', remark: '', file: undefined, durationMs: undefined });
  uploadFormRef.value?.resetFields();
  uploadDialog.visible = true;
};
const handleFileChange = async (uploadFile: any) => {
  uploadForm.file = uploadFile.raw;
  if (!uploadForm.assetName) uploadForm.assetName = uploadFile.name.replace(/\.[^.]+$/, '');
  uploadForm.durationMs = uploadFile.raw ? await readDuration(uploadFile.raw) : undefined;
  uploadFormRef.value?.validateField('file');
};
const handleFileRemove = () => { uploadForm.file = undefined; uploadForm.durationMs = undefined; };
const submitUpload = () => uploadFormRef.value?.validate(async (valid) => {
  if (!valid || !uploadForm.file) return;
  uploading.value = true;
  try {
    await uploadMediaAsset(uploadForm as MediaAssetUploadForm);
    proxy?.$modal.msgSuccess('上传成功');
    uploadDialog.visible = false;
    await getList();
  } finally {
    uploading.value = false;
  }
});
const handleUpdate = async (row: MediaAssetVO) => {
  const res = await getMediaAsset(row.id);
  Object.assign(editForm, res.data);
  editDialog.visible = true;
};
const submitEdit = () => editFormRef.value?.validate(async (valid) => {
  if (!valid) return;
  await updateMediaAsset(editForm);
  proxy?.$modal.msgSuccess('保存成功');
  editDialog.visible = false;
  await getList();
});
const handlePreview = async (row: MediaAssetVO) => {
  const res = await getMediaAsset(row.id);
  previewAsset.value = res.data;
  previewDialog.visible = true;
};
const handleDelete = async (row: MediaAssetVO) => {
  await proxy?.$modal.confirm(`确认删除声音媒体 ${row.assetName} 吗？`);
  await deleteMediaAsset(row.id);
  proxy?.$modal.msgSuccess('删除成功');
  await getList();
};
const handleVersion = (row: MediaAssetVO) => { activeAsset.value = row; versionFile.value = undefined; versionDuration.value = undefined; versionDialog.visible = true; };
const handleVersionFile = async (file: any) => { versionFile.value = file.raw; versionDuration.value = file.raw ? await readDuration(file.raw) : undefined; };
const submitVersion = async () => {
  if (!activeAsset.value || !versionFile.value) return proxy?.$modal.msgWarning('请选择音频文件');
  uploading.value = true;
  try { await uploadMediaVersion(activeAsset.value.id, versionFile.value, versionDuration.value); versionDialog.visible = false; proxy?.$modal.msgSuccess('新版本已上传'); await getList(); }
  finally { uploading.value = false; }
};
const handlePublish = async (row: MediaAssetVO) => {
  activeAsset.value = row;
  const [groupRes, selectedRes] = await Promise.all([listNodeGroups(), listMediaPublicationGroups(row.id)]);
  nodeGroups.value = groupRes.data.filter((group) => group.enabled);
  publishGroupIds.value = selectedRes.data;
  publishDialog.visible = true;
};
const submitPublish = async () => {
  if (!activeAsset.value) return;
  await publishMedia(activeAsset.value.id, publishGroupIds.value); publishDialog.visible = false; proxy?.$modal.msgSuccess('已创建发布任务'); await getList();
};
const submitUnpublish = async () => {
  if (!activeAsset.value) return;
  await unpublishMedia(activeAsset.value.id); publishDialog.visible = false; proxy?.$modal.msgSuccess('已取消发布'); await getList();
};
const handleSyncs = async (row: MediaAssetVO) => {
  activeAsset.value = row;
  const [syncRes, versionRes] = await Promise.all([listMediaSyncs(row.id), listMediaVersions(row.id)]);
  syncList.value = syncRes.data; versionList.value = versionRes.data; syncDrawer.visible = true;
};
const retrySyncs = async () => {
  if (!activeAsset.value) return;
  await retryMediaSyncs(activeAsset.value.id); proxy?.$modal.msgSuccess('已重新创建同步任务'); await handleSyncs(activeAsset.value);
};
onMounted(getList);
</script>
