import { getToken } from '@/utils/auth';
import { ElNotification } from 'element-plus';
import { useNoticeStore } from '@/store/modules/notice';

let initialized = false;
const callEventSubscribers = new Set<(event: Record<string, unknown>) => void>();

export const subscribeCallEvents = (subscriber: (event: Record<string, unknown>) => void) => {
  callEventSubscribers.add(subscriber);
  return () => callEventSubscribers.delete(subscriber);
};

// 初始化socket
export const initWebSocket = (url: any) => {
  if (import.meta.env.VITE_APP_WEBSOCKET === 'false' || initialized) {
    return;
  }
  initialized = true;
  url = url + '?Authorization=Bearer ' + getToken() + '&clientid=' + import.meta.env.VITE_APP_CLIENT_ID;
  useWebSocket(url, {
    autoReconnect: {
      // 重连最大次数
      retries: 3,
      // 重连间隔
      delay: 1000,
      onFailed() {
        console.log('websocket重连失败');
      }
    },
    heartbeat: {
      message: JSON.stringify({ type: 'ping' }),
      // 发送心跳的间隔
      interval: 10000,
      // 接收到心跳response的超时时间
      pongTimeout: 2000
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
        if (typeof event.type === 'string' && event.type.startsWith('CALL_')) {
          callEventSubscribers.forEach((subscriber) => subscriber(event));
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
};
