import request from '@/utils/request';
import type {
  AiAgentWorkflowBindingForm,
  AiAgentWorkflowBindingVO,
  AiWorkflowForm,
  AiWorkflowTestExecutionVO,
  AiWorkflowTestStartForm,
  AiWorkflowValidationVO,
  AiWorkflowVersionVO,
  AiWorkflowVO,
  Id
} from './types';

const root = '/api/v1/ai-workflows';

export const listAiWorkflows = (): AxiosPromise<AiWorkflowVO[]> => request({ url: root, method: 'get' });
export const getAiWorkflow = (id: Id): AxiosPromise<AiWorkflowVO> => request({ url: `${root}/${id}`, method: 'get' });
export const createAiWorkflow = (data: AiWorkflowForm): AxiosPromise<Id> => request({ url: root, method: 'post', data });
export const updateAiWorkflow = (id: Id, data: AiWorkflowForm) => request({ url: `${root}/${id}`, method: 'put', data });
export const deleteAiWorkflow = (id: Id) => request({ url: `${root}/${id}`, method: 'delete' });
export const setAiWorkflowEnabled = (id: Id, enabled: boolean) => request({ url: `${root}/${id}/${enabled ? 'enable' : 'disable'}`, method: 'put' });
export const listAiWorkflowVersions = (id: Id): AxiosPromise<AiWorkflowVersionVO[]> => request({ url: `${root}/${id}/versions`, method: 'get' });
export const getAiWorkflowDraft = (id: Id): AxiosPromise<AiWorkflowVersionVO> => request({ url: `${root}/${id}/draft`, method: 'get' });
export const saveAiWorkflowDraft = (id: Id, data: { versionName?: string; definitionJson: string }): AxiosPromise<Id> =>
  request({ url: `${root}/${id}/draft`, method: 'put', data });
export const validateAiWorkflowDraft = (id: Id): AxiosPromise<AiWorkflowValidationVO> => request({ url: `${root}/${id}/validate`, method: 'post' });
export const publishAiWorkflow = (id: Id): AxiosPromise<AiWorkflowVersionVO> => request({ url: `${root}/${id}/publish`, method: 'post' });
export const listAiAgentWorkflowBindings = (agentId: Id): AxiosPromise<AiAgentWorkflowBindingVO[]> =>
  request({ url: `${root}/agents/${agentId}/bindings`, method: 'get' });
export const saveAiAgentWorkflowBinding = (agentId: Id, data: AiAgentWorkflowBindingForm) =>
  request({ url: `${root}/agents/${agentId}/bindings`, method: 'put', data });
export const deleteAiAgentWorkflowBinding = (agentId: Id, sceneType: string) =>
  request({ url: `${root}/agents/${agentId}/bindings/${sceneType}`, method: 'delete' });
export const startAiWorkflowTest = (id: Id, data: AiWorkflowTestStartForm): AxiosPromise<AiWorkflowTestExecutionVO> =>
  request({ url: `${root}/${id}/test-executions`, method: 'post', data });
export const sendAiWorkflowTestInput = (executionId: string, data: { inputId: string; text: string }): AxiosPromise<AiWorkflowTestExecutionVO> =>
  request({ url: `${root}/test-executions/${executionId}/inputs`, method: 'post', data });
export const getAiWorkflowTestExecution = (executionId: string): AxiosPromise<AiWorkflowTestExecutionVO> =>
  request({ url: `${root}/test-executions/${executionId}`, method: 'get' });
export const terminateAiWorkflowTest = (executionId: string) => request({ url: `${root}/test-executions/${executionId}`, method: 'delete' });
