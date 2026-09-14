import { getToken } from '@/utils/auth';
import { ElNotification } from 'element-plus';
import { useNoticeStore } from '@/store/modules/notice';

let initialized = false;
let initializedToken = '';
let closeWebSocket: (() => void) | undefined;
const callEventSubscribers = new Set<(event: Record<string, unknown>) => void>();
const recentCallEvents = new Map<string, number>();
const callEventDedupWindowMs = 5000;

export const subscribeCallEvents = (subscriber: (event: Record<string, unknown>) => void) => {
  callEventSubscribers.add(subscriber);
  return () => callEventSubscribers.delete(subscriber);
};

export const dispatchCallEvent = (event: Record<string, unknown>, source = 'WebSocket') => {
  if (typeof event.type !== 'string' || !event.type.startsWith('CALL_')) return false;
  const now = Date.now();
  const eventKey = [event.type, event.businessCallId, event.legUuid || event.callId, event.occurredAt, event.hangupCause].join('|');
  const lastReceivedAt = recentCallEvents.get(eventKey);
  if (lastReceivedAt && now - lastReceivedAt < callEventDedupWindowMs) {
    return true;
  }
  recentCallEvents.set(eventKey, now);
  if (recentCallEvents.size > 200) {
    recentCallEvents.forEach((receivedAt, key) => {
      if (now - receivedAt >= callEventDedupWindowMs) recentCallEvents.delete(key);
    });
  }
  console.debug(`[CallNexus][${source}] 收到通话事件`, event);
  callEventSubscribers.forEach((subscriber) => subscriber(event));
  return true;
};

// 初始化socket
export const initWebSocket = (url: any) => {
  if (import.meta.env.VITE_APP_WEBSOCKET === 'false') {
    return;
  }
  const token = getToken() || '';
  if (initialized && initializedToken === token) return;
  closeWebSocket?.();
  initialized = true;
  initializedToken = token;
  url = url + '?Authorization=Bearer ' + token + '&clientid=' + import.meta.env.VITE_APP_CLIENT_ID;
  const socket = useWebSocket(url, {
    autoReconnect: {
      // 通话状态依赖实时通道，持续重连并限制最大退避时间。
      retries: -1,
      delay: (retried) => Math.min(1000 * 2 ** Math.min(retried, 3), 5000)
    },
    heartbeat: {
      message: JSON.stringify({ type: 'ping' }),
      // 发送心跳的间隔
      interval: 5000,
      // 接收到心跳response的超时时间
      pongTimeout: 3000
    },
    onConnected() {
      console.log('websocket已经连接');
    },
    onDisconnected() {
      console.log('websocket已经断开');
    },
    onMessage: (_, e) => {
      if (e.data.indexOf('ping') > 0) {
        return;
      }
      try {
        const event = JSON.parse(e.data) as Record<string, unknown>;
        if (dispatchCallEvent(event, 'WebSocket')) {
          return;
        }
      } catch {
        // Non-JSON messages continue through the normal notice flow.
      }
      useNoticeStore().addNotice({
        message: e.data,
        read: false,
        time: new Date().toLocaleString()
      });
      ElNotification({
        title: '消息',
        message: e.data,
        type: 'success',
        duration: 3000
      });
    }
  });
  closeWebSocket = socket.close;
};
