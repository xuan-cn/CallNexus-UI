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

export interface CallConferenceMemberVO {
  id: string;
  legUuid?: string;
  conferenceMemberId?: string;
  memberRole: 'OWNER_AGENT' | 'CUSTOMER' | 'COUNTERPARTY' | 'INVITED_EXTENSION';
  agentId?: string;
  extension?: string;
  displayName?: string;
  memberState: 'JOINING' | 'JOINED' | 'LEFT' | 'FAILED';
  muted: boolean;
  joinedAt?: string;
  leftAt?: string;
}

export interface CallConferenceVO {
  id: string;
  sessionId: string;
  businessCallId: string;
  nodeId: string;
  conferenceName: string;
  ownerAgentId: string;
  ownerExtension: string;
  conferenceState: 'CREATING' | 'ACTIVE' | 'ENDED' | 'FAILED';
  startedAt?: string;
  endedAt?: string;
  members: CallConferenceMemberVO[];
}

export interface CallConferenceInviteForm {
  targetExtension: string;
}

export interface CallConferenceMuteForm {
  muted: boolean;
}
