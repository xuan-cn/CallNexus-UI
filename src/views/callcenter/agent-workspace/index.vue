<template>
  <IncomingCallScreenPop
    :phone-number="workspace.phoneNumber"
    :call-id="workspace.businessCallId"
    :number-location="workspace.numberLocation"
    :call-status-text="workspace.callStatusText"
    :duration-text="workspace.durationText"
    :incoming="workspace.incoming"
    :active="workspace.active"
    :customer-id="workspace.customerId"
    :customer-view="workspace.customerView"
    @closed="goBack"
  />
</template>

<script setup lang="ts">
import IncomingCallScreenPop from '@/components/IncomingCallScreenPop/index.vue';

defineOptions({ name: 'AgentCallWorkspace' });

const route = useRoute();
const router = useRouter();

interface WorkspaceContext {
  businessCallId: string;
  phoneNumber: string;
  numberLocation: string;
  callStatusText: string;
  durationText: string;
  incoming: boolean;
  active: boolean;
  customerId: string;
  customerView: boolean;
}

interface AgentToolbarExpose {
  workspaceContext?: WorkspaceContext;
}

const agentToolbarRef = inject<ComputedRef<AgentToolbarExpose | null>>('agentToolbarRef');

const queryText = (name: string) => {
  const value = route.query[name];
  return Array.isArray(value) ? String(value[0] || '') : String(value || '');
};

const queryBoolean = (name: string) => queryText(name) === 'true';

const workspace = computed<WorkspaceContext>(() => {
  const live = agentToolbarRef?.value?.workspaceContext;
  const routeCustomerId = Array.isArray(route.params.customerId) ? String(route.params.customerId[0] || '') : String(route.params.customerId || '');
  const customerView = route.name === 'CustomerDetailWorkspace' || Boolean(routeCustomerId);
  const queryCallId = queryText('callId');
  // The URL can contain an agent-leg UUID captured before the authoritative
  // business call event arrives. Always prefer the live toolbar context.
  if (!customerView && live?.businessCallId) {
    return { ...live, customerId: '', customerView: false };
  }
  return {
    businessCallId: customerView ? '' : queryCallId,
    phoneNumber: queryText('phone'),
    numberLocation: queryText('location'),
    callStatusText: customerView ? '' : queryText('status') || '通话中',
    durationText: queryText('duration'),
    incoming: customerView ? false : queryBoolean('incoming'),
    active: customerView ? false : queryBoolean('active'),
    customerId: routeCustomerId,
    customerView
  };
});

const goBack = () => {
  if (window.history.length > 1) {
    router.back();
    return;
  }
  void router.push('/index');
};
</script>
