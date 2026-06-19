import { SimpleUser, SimpleUserDelegate, SimpleUserOptions } from 'sip.js/lib/platform/web';
import type { AgentWebRtcConfigVO } from '@/api/callcenter/agent/types';

export interface WebRtcPhoneCallbacks {
  onIncoming?: (number?: string) => void;
  onAnswered?: () => void;
  onHangup?: () => void;
  onHold?: (held: boolean) => void;
  onRegistered?: () => void;
  onUnregistered?: () => void;
  onServerConnect?: () => void;
  onServerDisconnect?: (error?: Error) => void;
}

export class WebRtcPhone {
  private simpleUser?: SimpleUser;
  private config?: AgentWebRtcConfigVO;
  private remoteAudio?: HTMLAudioElement;
  private callbacks: WebRtcPhoneCallbacks = {};
  private active = false;
  private registered = false;

  isRegistered() {
    return this.registered;
  }

  hasActiveCall() {
    return this.active;
  }

  configure(callbacks: WebRtcPhoneCallbacks) {
    this.callbacks = callbacks;
  }

  async connect(config: AgentWebRtcConfigVO, remoteAudio: HTMLAudioElement) {
    if (!config.wssUrl || !config.extension || !config.sipDomain || !config.authPassword) {
      throw new Error('WebRTC 注册配置不完整');
    }
    if (this.registered && this.sameConfig(config)) return;
    await this.disconnect();
    this.config = config;
    this.remoteAudio = remoteAudio;
    const delegate: SimpleUserDelegate = {
      onCallReceived: () => {
        this.active = true;
        this.callbacks.onIncoming?.();
      },
      onCallAnswered: () => {
        this.active = true;
        this.callbacks.onAnswered?.();
      },
      onCallHangup: () => {
        this.active = false;
        this.callbacks.onHangup?.();
      },
      onCallHold: (held) => this.callbacks.onHold?.(held),
      onRegistered: () => {
        this.registered = true;
        this.callbacks.onRegistered?.();
      },
      onUnregistered: () => {
        this.registered = false;
        this.callbacks.onUnregistered?.();
      },
      onServerConnect: () => this.callbacks.onServerConnect?.(),
      onServerDisconnect: (error) => {
        this.registered = false;
        this.callbacks.onServerDisconnect?.(error);
      }
    };
    const options: SimpleUserOptions = {
      aor: `sip:${config.extension}@${config.sipDomain}`,
      delegate,
      media: {
        constraints: { audio: true, video: false },
        remote: { audio: remoteAudio }
      },
      userAgentOptions: {
        authorizationUsername: config.extension,
        authorizationPassword: config.authPassword,
        displayName: config.sipDisplayName || config.extension,
        sessionDescriptionHandlerFactoryOptions: {
          peerConnectionConfiguration: {
            iceServers: []
          }
        }
      }
    };
    this.simpleUser = new SimpleUser(config.wssUrl, options);
    await this.simpleUser.connect();
    await this.simpleUser.register();
  }

  async disconnect() {
    const user = this.simpleUser;
    this.simpleUser = undefined;
    this.active = false;
    this.registered = false;
    if (!user) return;
    try {
      if (user.isConnected()) {
        await user.unregister();
      }
    } catch {
      // 忽略注销失败，后续 disconnect 会清理浏览器侧连接。
    }
    if (user.isConnected()) {
      await user.disconnect();
    }
  }

  async call(number: string) {
    const user = this.requireUser();
    const config = this.requireConfig();
    this.active = true;
    await user.call(`sip:${number}@${config.sipDomain}`);
  }

  async answer() {
    const user = this.requireUser();
    await user.answer();
  }

  async hangup() {
    const user = this.requireUser();
    await user.hangup();
    this.active = false;
  }

  async decline() {
    const user = this.requireUser();
    await user.decline();
    this.active = false;
  }

  async hold() {
    await this.requireUser().hold();
  }

  async unhold() {
    await this.requireUser().unhold();
  }

  private sameConfig(config: AgentWebRtcConfigVO) {
    return (
      this.config?.extension === config.extension &&
      this.config?.sipDomain === config.sipDomain &&
      this.config?.wssUrl === config.wssUrl &&
      this.config?.authPassword === config.authPassword
    );
  }

  private requireUser() {
    if (!this.simpleUser || !this.registered) {
      throw new Error('WebRTC 软电话未注册');
    }
    return this.simpleUser;
  }

  private requireConfig() {
    if (!this.config) {
      throw new Error('WebRTC 注册配置不存在');
    }
    return this.config;
  }
}

export const webRtcPhone = new WebRtcPhone();
