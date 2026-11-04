import { describe, expect, it } from 'vitest';
import { userFacingMessage } from './userFacingMessage';

describe('telephony service messages', () => {
  it('normalizes user-facing connection errors and Chinese spacing', () => {
    expect(userFacingMessage('连接 FreeSWITCH ESL 失败')).toBe('连接话务服务 ESL 失败');
    expect(userFacingMessage('FreeSWITCH 节点不存在')).toBe('话务服务节点不存在');
  });
  it('handles different upstream casing and repeated mentions', () => {
    expect(userFacingMessage('freeswitch unavailable; FreeSwitch; FREESWITCH')).toBe('话务服务 unavailable; 话务服务; 话务服务');
  });
  it('leaves unrelated error text and technical reason codes intact', () => {
    expect(userFacingMessage('线路未注册，状态 REGED，错误码 503')).toBe('线路未注册，状态 REGED，错误码 503');
    expect(userFacingMessage('')).toBe('');
  });
});
