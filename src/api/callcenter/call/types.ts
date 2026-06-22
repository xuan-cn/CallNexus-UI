export interface CallControlVO {
  callId: string;
  agentExtension: string;
  destination: string;
  status: 'DIALING' | 'CONSULT_DIALING';
}

export interface OriginateCallForm {
  destination: string;
}

export interface SendDtmfForm {
  digits: string;
}

export interface CallNoteForm {
  content: string;
}
