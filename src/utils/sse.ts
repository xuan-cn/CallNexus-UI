import { getToken } from '@/utils/auth';
import { ElNotification } from 'element-plus';
import { useNoticeStore } from '@/store/modules/notice';
import { dispatchCallEvent } from '@/utils/websocket';
import router from '@/router';

let initialized = false;

// 初始化
export const initSSE = (url: any) => {
  if (import.meta.env.VITE_APP_SSE === 'false' || initialized) {
    return;
  }
  initialized = true;

  url = url + '?Authorization=Bearer ' + getToken() + '&clientid=' + import.meta.env.VITE_APP_CLIENT_ID;
  const { data, error, close } = useEventSource(url, [], {
    autoReconnect: {
      retries: 5,
      delay: 5000,
      onFailed() {
        console.log('Failed to connect after 5 retries');
      }
    }
  });
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      close();
      initialized = false;
    });
  }

  watch(error, () => {
    console.log('SSE connection error:', error.value);
    error.value = null;
  });

  watch(data, () => {
    if (!data.value) return;
    let noticeMessage = data.value;
    let noticePath: string | undefined;
    let eventId: string | undefined;
    try {
      const event = JSON.parse(data.value) as Record<string, unknown>;
      if (dispatchCallEvent(event, 'SSE')) {
        data.value = null;
        return;
      }
      if (event.type === 'TICKET_DEADLINE_REMINDER' && event.ticketId) {
        eventId = typeof event.eventId === 'string' ? event.eventId : undefined;
        noticeMessage = typeof event.message === 'string' ? event.message : data.value;
        noticePath = `/callcenter/ticket?id=${encodeURIComponent(String(event.ticketId))}`;
      }
    } catch {
      // 非 JSON 消息继续按普通通知处理。
    }
    const noticeStore = useNoticeStore();
    if (eventId && noticeStore.state.notices.some((notice) => notice.eventId === eventId)) {
      data.value = null;
      return;
    }
    noticeStore.addNotice({
      eventId,
      message: noticeMessage,
      read: false,
      time: new Date().toLocaleString(),
      path: noticePath
    });
    ElNotification({
      title: noticePath ? '工单时限提醒（点击查看）' : '消息',
      message: noticeMessage,
      type: 'success',
      duration: noticePath ? 8000 : 3000,
      onClick: noticePath ? () => void router.push(noticePath) : undefined
    });
    data.value = null;
  });
};
