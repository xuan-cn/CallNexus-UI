/**
 * 共享 Hooks
 */

import { ref, onMounted, onUnmounted } from 'vue'

/**
 * WebSocket 连接 Hook
 */
export function useWebSocket(url: string) {
  const connected = ref(false)
  const error = ref<string | null>(null)
  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectAttempts = 0
  const maxReconnectAttempts = 5
  const reconnectDelay = 1000

  const connect = () => {
    if (ws) return

    try {
      ws = new WebSocket(url)

      ws.onopen = () => {
        connected.value = true
        error.value = null
        reconnectAttempts = 0
      }

      ws.onclose = () => {
        connected.value = false
        ws = null
        attemptReconnect()
      }

      ws.onerror = () => {
        error.value = 'WebSocket 连接错误'
      }
    } catch (e) {
      error.value = 'WebSocket 连接失败'
    }
  }

  const disconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (ws) {
      ws.close()
      ws = null
    }
    connected.value = false
  }

  const attemptReconnect = () => {
    if (reconnectAttempts >= maxReconnectAttempts) return

    reconnectAttempts++
    const delay = reconnectDelay * Math.pow(2, reconnectAttempts - 1)

    reconnectTimer = setTimeout(() => {
      connect()
    }, delay)
  }

  const send = (data: unknown) => {
    if (ws && connected.value) {
      ws.send(JSON.stringify(data))
    }
  }

  const subscribe = (handler: (event: MessageEvent) => void) => {
    if (ws) {
      ws.onmessage = handler
    }
  }

  onMounted(connect)
  onUnmounted(disconnect)

  return {
    connected,
    error,
    send,
    subscribe,
    connect,
    disconnect
  }
}

/**
 * 计时器 Hook
 */
export function useTimer() {
  const seconds = ref(0)
  let timer: ReturnType<typeof setInterval> | undefined

  const start = () => {
    if (timer) return
    timer = setInterval(() => seconds.value++, 1000)
  }

  const stop = () => {
    if (timer) {
      clearInterval(timer)
      timer = undefined
    }
  }

  const reset = () => {
    stop()
    seconds.value = 0
  }

  const formatted = computed(() => {
    const minutes = Math.floor(seconds.value / 60)
      .toString()
      .padStart(2, '0')
    const secs = (seconds.value % 60).toString().padStart(2, '0')
    return `${minutes}:${secs}`
  })

  onUnmounted(stop)

  return {
    seconds,
    formatted,
    start,
    stop,
    reset
  }
}

/**
 * 防抖 Hook
 */
export function useDebounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}
