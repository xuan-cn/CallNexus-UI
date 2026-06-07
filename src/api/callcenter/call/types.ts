export interface CallControlVO {
  callId: string;
  agentExtension: string;
  destination: string;
  status: 'DIALING';
}

export interface OriginateCallForm {
  destination: string;
}
