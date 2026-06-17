import { getToken } from '@/utils/auth';
import { ElNotification } from 'element-plus';
import { useNoticeStore } from '@/store/modules/notice';
import { dispatchCallEvent } from '@/utils/websocket';

let initialized = false;

// 初始化
export const initSSE = (url: any) => {
  if (import.meta.env.VITE_APP_SSE === 'false' || initialized) {
    return;
  }
  initialized = true;

  url = url + '?Authorization=Bearer ' + getToken() + '&clientid=' + import.meta.env.VITE_APP_CLIENT_ID;
  const { data, error } = useEventSource(url, [], {
    autoReconnect: {
      retries: 5,
      delay: 5000,
      onFailed() {
        console.log('Failed to connect after 5 retries');
      }
    }
  });

  watch(error, () => {
    console.log('SSE connection error:', error.value);
    error.value = null;
  });

  watch(data, () => {
    if (!data.value) return;
    try {
      const event = JSON.parse(data.value) as Record<string, unknown>;
      if (dispatchCallEvent(event, 'SSE')) {
        data.value = null;
        return;
      }
    } catch {
      // 非 JSON 消息继续按普通通知处理。
    }
    useNoticeStore().addNotice({
      message: data.value,
      read: false,
      time: new Date().toLocaleString()
    });
    ElNotification({
      title: '消息',
      message: data.value,
      type: 'success',
      duration: 3000
    });
    data.value = null;
  });
};
