import { SimpleUser, SimpleUserDelegate, SimpleUserOptions, stripVideo } from 'sip.js/lib/platform/web';
import type { SessionDescriptionHandlerModifier } from 'sip.js/lib/api/session-description-handler';
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

const AUDIO_CODEC_PRIORITY = ['PCMA', 'PCMU'];
let remoteSdpSanitizerInstalled = false;

function buildWebRtcCallSdpModifiers(config: AgentWebRtcConfigVO): SessionDescriptionHandlerModifier[] {
  return [stripVideo, preferPcmAudio];
}

function buildWebRtcAnswerSdpModifiers(): SessionDescriptionHandlerModifier[] {
  return [];
}

function installRemoteSdpSanitizer() {
  if (remoteSdpSanitizerInstalled || typeof window === 'undefined' || !window.RTCPeerConnection) return;
  remoteSdpSanitizerInstalled = true;
  const originalSetRemoteDescription = window.RTCPeerConnection.prototype.setRemoteDescription;
  window.RTCPeerConnection.prototype.setRemoteDescription = function (
    description?: RTCSessionDescriptionInit
  ): Promise<void> {
    //@ts-ignore
    return originalSetRemoteDescription.call(this, sanitizeRemoteFreeSwitchDescription(description));
  };
}

function sanitizeRemoteFreeSwitchDescription<T extends RTCSessionDescriptionInit | undefined>(description: T): T {
  if (!description?.sdp || !isFreeSwitchSdp(description.sdp)) return description;
  const sanitizedSdp = sanitizeRemoteFreeSwitchSdp(description.sdp);
  console.info('[WebRTC] sanitized FreeSWITCH remote SDP', sanitizedSdp);
  return {
    ...description,
    sdp: sanitizedSdp
  } as T;
}

function isFreeSwitchSdp(sdp: string) {
  return /^o=FreeSWITCH\s/im.test(sdp) || /^s=FreeSWITCH\s*$/im.test(sdp);
}

function sanitizeRemoteFreeSwitchSdp(sdp: string) {
  const sections = splitSdpSections(sdp);
  const sessionSection = sections[0] || [];
  const audioSection = sections.find((section) => section[0]?.startsWith('m=audio '));
  if (!audioSection) return sdp;
  return [...sanitizeRemoteFreeSwitchSession(sessionSection), ...sanitizeRemoteFreeSwitchAudio(sessionSection, audioSection)].join('\r\n');
}

function sanitizeRemoteFreeSwitchSession(section: string[]) {
  const origin = section.find((line) => /^o=/i.test(line.trim())) || 'o=- 0 0 IN IP4 0.0.0.0';
  return ['v=0', origin.replace(/^o=\S+/i, 'o=-'), 's=-', 't=0 0', 'a=group:BUNDLE 0', 'a=msid-semantic: WMS *'];
}

function sanitizeRemoteFreeSwitchAudio(sessionSection: string[], section: string[]) {
  const mediaLine = rewriteRemoteAudioMediaLine(section).replace(' RTP/SAVPF ', ' UDP/TLS/RTP/SAVPF ');
  const connectionLine = section.find((line) => /^c=IN IP4 /i.test(line.trim()))
    || sessionSection.find((line) => /^c=IN IP4 /i.test(line.trim()))
    || 'c=IN IP4 0.0.0.0';
  const port = mediaLine.split(' ')[1] || '9';
  const iceUfrag = section.find((line) => /^a=ice-ufrag:/i.test(line.trim()));
  const icePwd = section.find((line) => /^a=ice-pwd:/i.test(line.trim()));
  const fingerprint = section.find((line) => /^a=fingerprint:/i.test(line.trim()));
  const setup = section.find((line) => /^a=setup:/i.test(line.trim())) || 'a=setup:actpass';

  const sanitized = [mediaLine, connectionLine, `a=rtcp:${port} IN IP4 0.0.0.0`];
  if (iceUfrag) sanitized.push(iceUfrag);
  if (icePwd) sanitized.push(icePwd);
  sanitized.push('a=ice-options:trickle');
  if (fingerprint) sanitized.push(fingerprint);
  sanitized.push(setup, 'a=mid:0', 'a=sendrecv', 'a=rtcp-mux');
  for (const line of section.slice(1)) {
    const value = line.trim();
    if (isSupportedRemoteAudioAttribute(value, section)) {
      sanitized.push(line);
    }
  }
  return sanitized;
}

function rewriteRemoteAudioMediaLine(section: string[]) {
  const parts = section[0].split(' ');
  const supportedPayloads = parts.slice(3).filter((payload) => isSupportedRemoteAudioPayload(payload, section));
  return [...parts.slice(0, 3), ...(supportedPayloads.length > 0 ? supportedPayloads : parts.slice(3, 4))].join(' ');
}

function isSupportedRemoteAudioAttribute(value: string, section: string[]) {
  const match = value.match(/^a=(?:rtpmap|fmtp):(\d+)\s?/i);
  return Boolean(match && isSupportedRemoteAudioPayload(match[1], section));
}

function isSupportedRemoteAudioPayload(payload: string, section: string[]) {
  const rtpmap = section.find((line) => new RegExp(`^a=rtpmap:${payload}\\s+`, 'i').test(line.trim()));
  if (!rtpmap) return true;
  return !/\s*telephone-event\//i.test(rtpmap.replace(/^a=rtpmap:\d+\s+/i, ''));
}

async function preferPcmAudio(description: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
  if (!description.sdp) return description;
  return {
    ...description,
    sdp: rewriteAudioSdp(description.sdp)
  };
}

function rewriteAudioSdp(sdp: string) {
  const sections = splitSdpSections(sdp);
  return sections.map((section) => {
    if (!section[0]?.startsWith('m=audio ')) return section.join('\r\n');
    return rewriteAudioSection(section).join('\r\n');
  }).join('\r\n');
}

function splitSdpSections(sdp: string) {
  const lines = sdp.split(/\r?\n/).filter((line) => line.length > 0);
  const sections: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (line.startsWith('m=') && current.length > 0) {
      sections.push(current);
      current = [];
    }
    current.push(line);
  }
  if (current.length > 0) sections.push(current);
  return sections;
}

function rewriteAudioSection(section: string[]) {
  const mLine = section[0];
  const parts = mLine.split(' ');
  const payloads = parts.slice(3);
  if (payloads.length === 0) return section;

  const codecByPayload = new Map<string, string>();

  for (const line of section) {
    const match = line.match(/^a=rtpmap:(\d+)\s+([^/\s]+)\/(\d+)/i);
    if (!match) continue;
    const payload = match[1];
    const codec = match[2].toUpperCase();
    codecByPayload.set(payload, codec);
  }

  const orderedPayloads = [
    ...payloads.filter((payload) => AUDIO_CODEC_PRIORITY.includes(codecByPayload.get(payload) || '')),
    ...payloads.filter((payload) => !AUDIO_CODEC_PRIORITY.includes(codecByPayload.get(payload) || ''))
  ];

  return section.map((line, index) => (index === 0 ? [...parts.slice(0, 3), ...orderedPayloads].join(' ') : line));
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
    // installRemoteSdpSanitizer();
    if (this.registered && this.sameConfig(config)) return;
    await this.disconnect();
    await this.warmUpMicrophone();
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
    await user.call(`sip:${number}@${config.sipDomain}`, undefined, {
      sessionDescriptionHandlerModifiers: buildWebRtcCallSdpModifiers(config)
    });
  }

  async answer() {
    const user = this.requireUser();
    await this.warmUpMicrophone();
    console.info('[WebRTC] answer incoming call');
    await user.answer({
      sessionDescriptionHandlerModifiers: buildWebRtcAnswerSdpModifiers()
    });
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

  private async warmUpMicrophone() {
    if (!navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      console.warn('[WebRTC] microphone warm-up failed', error);
    }
  }
}

export const webRtcPhone = new WebRtcPhone();
