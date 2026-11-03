import type { AiWorkflowVO } from '@/api/callcenter/ai-workflow/types';

export function filterWorkflows(workflows: AiWorkflowVO[], keyword: string, scene: string, status: string): AiWorkflowVO[] {
  const query = keyword.trim().toLocaleLowerCase();
  return workflows.filter(
    (item) =>
      (!query || `${item.workflowName} ${item.workflowCode}`.toLocaleLowerCase().includes(query)) &&
      (!scene || item.sceneType === scene) &&
      (!status || (status === 'enabled' ? item.enabled : !item.enabled))
  );
}
