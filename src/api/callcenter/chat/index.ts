import request from '@/utils/request';

export interface ChatChannelVO {
  id: string | number;
  channelKey: string;
  channelName: string;
  skillGroupId?: string | number;
  aiEnabled?: boolean;
  aiAgentId?: string | number;
  welcomeMessage?: string;
  offlineMessage?: string;
  allowedOrigins?: string;
  enabled: boolean;
  version?: number;
}

export interface ChatChannelForm {
  channelName: string;
  skillGroupId?: string | number;
  aiEnabled?: boolean;
  aiAgentId?: string | number;
  welcomeMessage?: string;
  offlineMessage?: string;
  allowedOrigins?: string;
  enabled: boolean;
  version?: number;
}

export interface ChatConversationVO {
  id: string | number;
  conversationNo: string;
  channelId: string | number;
  channelName?: string;
  skillGroupId?: string | number;
  aiAgentId?: string | number;
  visitorId: string | number;
  visitorName?: string;
  phone?: string;
  email?: string;
  status: 'AI_SERVING' | 'QUEUING' | 'ACTIVE' | 'CLOSED' | 'ABANDONED';
  priority: number;
  assignedUserId?: string | number;
  assignedUserName?: string;
  customerId?: string | number;
  ticketId?: string | number;
  queuedAt: string;
  assignedAt?: string;
  closedAt?: string;
  lastMessageAt?: string;
  unreadAgentCount: number;
  unreadVisitorCount: number;
}

export interface ChatMessageVO {
  id: string | number;
  conversationId: string | number;
  senderType: 'VISITOR' | 'AGENT' | 'AI' | 'SYSTEM';
  senderId?: string | number;
  senderName?: string;
  messageType: 'TEXT';
  content: string;
  sentAt: string;
}

export interface ChatConversationDetailVO {
  conversation: ChatConversationVO;
  messages: ChatMessageVO[];
}

export interface ChatConversationQuery extends PageQuery {
  channelId?: string | number;
  status?: string;
  assignedToMe?: boolean;
  keyword?: string;
}

export interface PublicChatBootstrap {
  channelKey: string;
  channelName: string;
  welcomeMessage?: string;
  offlineMessage?: string;
}

export interface PublicConversationCreated {
  conversationId: string | number;
  conversationNo: string;
  visitorToken: string;
  status: string;
}

export const listChatChannels = (params: PageQuery & { channelName?: string; enabled?: boolean }) =>
  request({ url: '/api/v1/chat/channels', method: 'get', params });
export const getChatChannel = (id: string | number) => request<ChatChannelVO>({ url: `/api/v1/chat/channels/${id}`, method: 'get' });
export const createChatChannel = (data: ChatChannelForm) => request({ url: '/api/v1/chat/channels', method: 'post', data });
export const updateChatChannel = (id: string | number, data: ChatChannelForm) =>
  request({ url: `/api/v1/chat/channels/${id}`, method: 'put', data });
export const deleteChatChannel = (id: string | number) => request({ url: `/api/v1/chat/channels/${id}`, method: 'delete' });

export const listChatConversations = (params: ChatConversationQuery) =>
  request({ url: '/api/v1/chat/conversations', method: 'get', params });
export const getChatConversation = (id: string | number) =>
  request<ChatConversationDetailVO>({ url: `/api/v1/chat/conversations/${id}`, method: 'get' });
export const claimChatConversation = (id: string | number) =>
  request({ url: `/api/v1/chat/conversations/${id}/claim`, method: 'post' });
export const sendAgentChatMessage = (id: string | number, content: string, clientMessageId: string) =>
  request<ChatMessageVO>({ url: `/api/v1/chat/conversations/${id}/messages`, method: 'post', data: { content, clientMessageId } });
export const markChatConversationRead = (id: string | number) =>
  request({ url: `/api/v1/chat/conversations/${id}/read`, method: 'post' });
export const closeChatConversation = (id: string | number) =>
  request({ url: `/api/v1/chat/conversations/${id}/close`, method: 'post' });

export const getPublicChatBootstrap = (channelKey: string) =>
  request<PublicChatBootstrap>({ url: `/public/chat/channels/${channelKey}/bootstrap`, method: 'get', headers: { isToken: false } });
export const createPublicChatConversation = (
  channelKey: string,
  data: { visitorName?: string; phone?: string; email?: string; externalId?: string; initialMessage?: string }
) =>
  request<PublicConversationCreated>({
    url: `/public/chat/channels/${channelKey}/conversations`,
    method: 'post',
    data,
    headers: { isToken: false, repeatSubmit: false }
  });
export const listPublicChatMessages = (conversationId: string | number, visitorToken: string, afterId?: string | number) =>
  request<ChatMessageVO[]>({
    url: `/public/chat/conversations/${conversationId}/messages`,
    method: 'get',
    params: { afterId },
    headers: { isToken: false, 'X-Visitor-Token': visitorToken }
  });
export const sendPublicChatMessage = (
  conversationId: string | number,
  visitorToken: string,
  content: string,
  clientMessageId: string
) =>
  request<ChatMessageVO>({
    url: `/public/chat/conversations/${conversationId}/messages`,
    method: 'post',
    data: { content, clientMessageId },
    headers: { isToken: false, repeatSubmit: false, 'X-Visitor-Token': visitorToken }
  });
