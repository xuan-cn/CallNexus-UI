import { useEventBus } from '@vueuse/core';

export interface AgentDialRequest {
  destination: string;
  customerId?: string | number;
  source?: 'CUSTOMER_DETAIL';
}

const AGENT_DIAL_EVENT = Symbol('callnexus-agent-dial');

export const useAgentDialBus = () => useEventBus<AgentDialRequest>(AGENT_DIAL_EVENT);
