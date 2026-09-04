import request from '@/utils/request';
import { getToken } from '@/utils/auth';
import { AxiosPromise } from 'axios';
import type * as T from './types';

const root = '/api/v1/ai';

export const listModelProviders = (): AxiosPromise<T.AiModelProviderVO[]> => request({ url: `${root}/model-providers`, method: 'get' });
export const createModelProvider = (data: T.AiModelProviderForm) => request({ url: `${root}/model-providers`, method: 'post', data });
export const updateModelProvider = (id: T.Id, data: T.AiModelProviderForm) => request({ url: `${root}/model-providers/${id}`, method: 'put', data });
export const deleteModelProvider = (id: T.Id) => request({ url: `${root}/model-providers/${id}`, method: 'delete' });
export const testModelProvider = (id: T.Id) => request({ url: `${root}/model-providers/${id}/test`, method: 'post' });
export const listAiModels = (capability?: string): AxiosPromise<T.AiModelVO[]> =>
  request({ url: `${root}/models`, method: 'get', params: { capability } });
export const createAiModel = (data: T.AiModelForm) => request({ url: `${root}/models`, method: 'post', data });
export const updateAiModel = (id: T.Id, data: T.AiModelForm) => request({ url: `${root}/models/${id}`, method: 'put', data });
export const deleteAiModel = (id: T.Id) => request({ url: `${root}/models/${id}`, method: 'delete' });
export const testAiModel = (id: T.Id) => request({ url: `${root}/models/${id}/test`, method: 'post' });

export const listKnowledgeBases = (): AxiosPromise<T.KnowledgeBaseVO[]> => request({ url: `${root}/knowledge-bases`, method: 'get' });
export const pageKnowledgeBases = (params: T.PageQuery): AxiosPromise<T.KnowledgeBaseVO[]> =>
  request({ url: `${root}/knowledge-bases/page`, method: 'get', params });
export const createKnowledgeBase = (data: T.KnowledgeBaseForm) => request({ url: `${root}/knowledge-bases`, method: 'post', data });
export const updateKnowledgeBase = (id: T.Id, data: T.KnowledgeBaseForm) => request({ url: `${root}/knowledge-bases/${id}`, method: 'put', data });
export const deleteKnowledgeBase = (id: T.Id) => request({ url: `${root}/knowledge-bases/${id}`, method: 'delete' });
export const setKnowledgeBaseEnabled = (id: T.Id, enabled: boolean) =>
  request({ url: `${root}/knowledge-bases/${id}/${enabled ? 'enable' : 'disable'}`, method: 'post' });
export const rebuildKnowledgeBase = (id: T.Id, embeddingModelId: T.Id) =>
  request({ url: `${root}/knowledge-bases/${id}/rebuild`, method: 'post', params: { embeddingModelId } });
export const testKnowledgeSearch = (id: T.Id, data: { query: string; sourceType?: string; limit?: number }): AxiosPromise<T.KnowledgeSearchHitVO[]> =>
  request({ url: `${root}/knowledge-bases/${id}/search-test`, method: 'post', data });
export const listKnowledgeDocuments = (knowledgeBaseId: T.Id): AxiosPromise<T.KnowledgeDocumentVO[]> =>
  request({ url: `${root}/knowledge-documents`, method: 'get', params: { knowledgeBaseId } });
export const pageKnowledgeDocuments = (knowledgeBaseId: T.Id, params: T.PageQuery): AxiosPromise<T.KnowledgeDocumentVO[]> =>
  request({ url: `${root}/knowledge-documents/page`, method: 'get', params: { knowledgeBaseId, ...params } });
export const uploadKnowledgeDocument = (knowledgeBaseId: T.Id, file: File, documentId?: T.Id) => {
  const data = new FormData();
  data.append('knowledgeBaseId', String(knowledgeBaseId));
  if (documentId) data.append('documentId', String(documentId));
  data.append('file', file);
  return request({ url: `${root}/knowledge-documents/upload`, method: 'post', data, timeout: 120000 });
};
export const deleteKnowledgeDocument = (id: T.Id) => request({ url: `${root}/knowledge-documents/${id}`, method: 'delete' });
export const listKnowledgeChunks = (id: T.Id): AxiosPromise<T.KnowledgeChunkVO[]> =>
  request({ url: `${root}/knowledge-documents/${id}/chunks`, method: 'get' });
export const listKnowledgeFaqs = (knowledgeBaseId: T.Id): AxiosPromise<T.KnowledgeFaqVO[]> =>
  request({ url: `${root}/knowledge-faqs`, method: 'get', params: { knowledgeBaseId } });
export const pageKnowledgeFaqs = (knowledgeBaseId: T.Id, params: T.PageQuery): AxiosPromise<T.KnowledgeFaqVO[]> =>
  request({ url: `${root}/knowledge-faqs/page`, method: 'get', params: { knowledgeBaseId, ...params } });
export const createKnowledgeFaq = (knowledgeBaseId: T.Id, data: T.KnowledgeFaqForm) =>
  request({ url: `${root}/knowledge-faqs`, method: 'post', params: { knowledgeBaseId }, data });
export const updateKnowledgeFaq = (id: T.Id, data: T.KnowledgeFaqForm) => request({ url: `${root}/knowledge-faqs/${id}`, method: 'put', data });
export const deleteKnowledgeFaq = (id: T.Id) => request({ url: `${root}/knowledge-faqs/${id}`, method: 'delete' });
export const setKnowledgeFaqEnabled = (id: T.Id, enabled: boolean) =>
  request({ url: `${root}/knowledge-faqs/${id}/${enabled ? 'enable' : 'disable'}`, method: 'post' });
export const listKnowledgeTasks = (knowledgeBaseId?: T.Id): AxiosPromise<T.KnowledgeTaskVO[]> =>
  request({ url: `${root}/knowledge-tasks`, method: 'get', params: { knowledgeBaseId } });
export const retryKnowledgeTask = (id: T.Id) => request({ url: `${root}/knowledge-tasks/${id}/retry`, method: 'post' });
export const downloadFaqImportTemplate = () => request({ url: `${root}/faq-candidates/template`, method: 'get', responseType: 'blob' });
export const importFaqCandidates = (knowledgeBaseId: T.Id, file: File) => {
  const data = new FormData();
  data.append('file', file);
  return request({
    url: `${root}/faq-candidates/import`,
    method: 'post',
    params: { knowledgeBaseId },
    data,
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};
export const extractFaqCandidates = (knowledgeBaseId: T.Id, data: { documentId: T.Id; chatModelId: T.Id }) =>
  request({ url: `${root}/faq-candidates/extract`, method: 'post', params: { knowledgeBaseId }, data });
export const listFaqCandidateBatches = (knowledgeBaseId: T.Id): AxiosPromise<T.FaqCandidateBatchVO[]> =>
  request({ url: `${root}/faq-candidate-batches`, method: 'get', params: { knowledgeBaseId } });
export const listFaqCandidates = (batchId: T.Id): AxiosPromise<T.FaqCandidateVO[]> =>
  request({ url: `${root}/faq-candidates`, method: 'get', params: { batchId } });
export const updateFaqCandidate = (id: T.Id, data: T.FaqCandidateForm) => request({ url: `${root}/faq-candidates/${id}`, method: 'put', data });
export const confirmFaqCandidates = (id: T.Id, candidateIds: T.Id[]) =>
  request({ url: `${root}/faq-candidate-batches/${id}/confirm`, method: 'post', data: { candidateIds } });

export const listAiAgents = (): AxiosPromise<T.AiAgentVO[]> => request({ url: `${root}/agents`, method: 'get' });
export const createAiAgent = (data: T.AiAgentForm) => request({ url: `${root}/agents`, method: 'post', data });
export const updateAiAgent = (id: T.Id, data: T.AiAgentForm) => request({ url: `${root}/agents/${id}`, method: 'put', data });
export const deleteAiAgent = (id: T.Id) => request({ url: `${root}/agents/${id}`, method: 'delete' });
export const setAiAgentEnabled = (id: T.Id, enabled: boolean) =>
  request({ url: `${root}/agents/${id}/${enabled ? 'enable' : 'disable'}`, method: 'post' });
const aiTicketRoot = (agentId: T.Id) => `${root}/agents/${agentId}/ticket`;
export const getAiTicketPolicy = (agentId: T.Id): AxiosPromise<T.AiTicketPolicyVO> =>
  request({ url: `${aiTicketRoot(agentId)}/policy`, method: 'get' });
export const saveAiTicketPolicy = (agentId: T.Id, data: Omit<T.AiTicketPolicyVO, 'id' | 'aiAgentId' | 'activePromptVersionId' | 'version'>) =>
  request({ url: `${aiTicketRoot(agentId)}/policy`, method: 'put', data });
export const getAiTicketPrompt = (agentId: T.Id): AxiosPromise<T.AiTicketPromptVO> =>
  request({ url: `${aiTicketRoot(agentId)}/prompt`, method: 'get' });
export const saveAiTicketPromptDraft = (agentId: T.Id, data: { promptContent: string; versionName?: string }) =>
  request({ url: `${aiTicketRoot(agentId)}/prompt/draft`, method: 'put', data });
export const validateAiTicketPrompt = (
  agentId: T.Id,
  data: { promptContent: string; versionName?: string }
): AxiosPromise<T.AiTicketPromptValidationVO> => request({ url: `${aiTicketRoot(agentId)}/prompt/validate`, method: 'post', data });
export const publishAiTicketPrompt = (agentId: T.Id) => request({ url: `${aiTicketRoot(agentId)}/prompt/publish`, method: 'post' });
export const restoreDefaultAiTicketPrompt = (agentId: T.Id) => request({ url: `${aiTicketRoot(agentId)}/prompt/restore-default`, method: 'post' });
export const listAiTicketPromptVersions = (agentId: T.Id): AxiosPromise<T.AiTicketPromptVersionVO[]> =>
  request({ url: `${aiTicketRoot(agentId)}/prompt/versions`, method: 'get' });
export const listAiConversations = (agentId?: T.Id): AxiosPromise<T.AiConversationVO[]> =>
  request({ url: `${root}/conversations`, method: 'get', params: { agentId } });
export const startAiConversation = (agentId: T.Id): AxiosPromise<T.AiConversationStartVO> =>
  request({ url: `${root}/agents/${agentId}/conversations`, method: 'post' });
export const listAiMessages = (id: T.Id): AxiosPromise<T.AiMessageVO[]> => request({ url: `${root}/conversations/${id}/messages`, method: 'get' });
export const deleteAiConversation = (id: T.Id) => request({ url: `${root}/conversations/${id}`, method: 'delete' });
export const clearAiConversations = (agentId: T.Id) => request({ url: `${root}/agents/${agentId}/conversations`, method: 'delete' });

export const streamAiChat = async (
  agentId: T.Id,
  body: { conversationId?: T.Id; message: string },
  onEvent: (value: T.AiStreamEvent) => void,
  signal?: AbortSignal
) => {
  const response = await fetch(`${import.meta.env.VITE_APP_BASE_API}${root}/agents/${agentId}/chat/stream`, {
    method: 'POST',
    signal,
    headers: { Authorization: `Bearer ${getToken()}`, clientid: import.meta.env.VITE_APP_CLIENT_ID, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok || !response.body) throw new Error(`AI 对话请求失败，HTTP状态码=${response.status}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() || '';
    for (const block of blocks) {
      let event = 'message';
      let data = '';
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      if (data) onEvent({ event, data: JSON.parse(data) } as T.AiStreamEvent);
    }
  }
};

export const listAiIntents = (): AxiosPromise<T.AiIntentVO[]> => request({ url: `${root}/intents`, method: 'get' });
export const pageAiIntents = (params: T.AiIntentPageQuery) =>
  request<{ rows: T.AiIntentVO[]; total: number }>({ url: `${root}/intents/page`, method: 'get', params });
export const getAiIntent = (id: T.Id): AxiosPromise<T.AiIntentVO> => request({ url: `${root}/intents/${id}`, method: 'get' });
export const createAiIntent = (data: T.AiIntentForm) => request({ url: `${root}/intents`, method: 'post', data });
export const updateAiIntent = (id: T.Id, data: T.AiIntentForm) => request({ url: `${root}/intents/${id}`, method: 'put', data });
export const deleteAiIntent = (id: T.Id) => request({ url: `${root}/intents/${id}`, method: 'delete' });
export const batchUpdateAiIntents = (data: { intentIds: T.Id[]; groupId?: T.Id; clearGroup?: boolean; enabled?: boolean }) =>
  request({ url: `${root}/intents/batch`, method: 'put', data });
export const listAiIntentGroups = (): AxiosPromise<T.AiIntentGroupVO[]> => request({ url: `${root}/intent-groups`, method: 'get' });
export const createAiIntentGroup = (data: T.AiIntentGroupForm) => request({ url: `${root}/intent-groups`, method: 'post', data });
export const updateAiIntentGroup = (id: T.Id, data: T.AiIntentGroupForm) => request({ url: `${root}/intent-groups/${id}`, method: 'put', data });
export const deleteAiIntentGroup = (id: T.Id) => request({ url: `${root}/intent-groups/${id}`, method: 'delete' });
export const recognizeAiIntent = (data: {
  agentId: T.Id;
  text: string;
  intentCodes?: string[];
  groupIds?: T.Id[];
}): AxiosPromise<T.AiIntentRecognitionVO> => request({ url: `${root}/intents/recognize-test`, method: 'post', data, timeout: 120000 });

const faqLearningRoot = `${root}/faq-learning-candidates`;
export const pageFaqLearningCandidates = (params: T.PageQuery & { status?: string; knowledgeBaseId?: T.Id; agentId?: T.Id; keyword?: string }) =>
  request<{ rows: T.FaqLearningCandidateVO[]; total: number }>({ url: faqLearningRoot, method: 'get', params });
export const getFaqLearningCandidate = (id: T.Id): AxiosPromise<T.FaqLearningCandidateVO> =>
  request({ url: `${faqLearningRoot}/${id}`, method: 'get' });
export const getFaqLearningStatistics = (): AxiosPromise<T.FaqLearningStatisticsVO> =>
  request({ url: `${faqLearningRoot}/statistics`, method: 'get' });
export const approveFaqLearningCandidate = (
  id: T.Id,
  data: Pick<T.FaqLearningCandidateVO, 'faqCode' | 'faqName' | 'standardQuestion' | 'standardAnswer' | 'aliases' | 'answerMode'>
) => request({ url: `${faqLearningRoot}/${id}/approve`, method: 'post', data });
export const mergeFaqLearningCandidate = (id: T.Id, targetFaqId: T.Id) =>
  request({ url: `${faqLearningRoot}/${id}/merge`, method: 'post', data: { targetFaqId } });
export const rejectFaqLearningCandidate = (id: T.Id, reason: string) =>
  request({ url: `${faqLearningRoot}/${id}/reject`, method: 'post', data: { reason } });
export const reopenFaqLearningCandidate = (id: T.Id) => request({ url: `${faqLearningRoot}/${id}/reopen`, method: 'post' });
export const batchApproveFaqLearningCandidates = (candidateIds: T.Id[]): AxiosPromise<T.FaqLearningBatchResultVO> =>
  request({ url: `${faqLearningRoot}/batch-approve`, method: 'post', data: { candidateIds } });
export const batchMergeFaqLearningCandidates = (candidateIds: T.Id[], targetFaqId: T.Id): AxiosPromise<T.FaqLearningBatchResultVO> =>
  request({ url: `${faqLearningRoot}/batch-merge`, method: 'post', data: { candidateIds, targetFaqId } });
export const batchRejectFaqLearningCandidates = (candidateIds: T.Id[], reason: string): AxiosPromise<T.FaqLearningBatchResultVO> =>
  request({ url: `${faqLearningRoot}/batch-reject`, method: 'post', data: { candidateIds, reason } });
