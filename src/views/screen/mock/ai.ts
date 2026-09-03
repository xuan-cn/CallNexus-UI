export interface AiKpi {
  label: string;
  value: string;
  extra: string;
  tone?: 'is-up' | 'is-down';
}

export interface AiFeedItem {
  id: string;
  time: string;
  intent: string;
  reason: string;
  status: string;
  tagClass: string;
}

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min: number, max: number, digits = 1) =>
  Number((Math.random() * (max - min) + min).toFixed(digits));

export const createAiKpis = (randomize = false): AiKpi[] => {
  const intent = randomize ? randomFloat(91, 97) : 94.6;
  const asr = randomize ? randomFloat(93, 98) : 96.1;
  const concurrent = randomize ? randomInt(64, 110) : 86;
  const latency = randomize ? randomInt(320, 580) : 420;

  return [
    { label: '\u610f\u56fe\u8bc6\u522b\u51c6\u786e\u7387', value: `${intent}%`, extra: '\u8fd1 1 \u5c0f\u65f6', tone: 'is-up' },
    { label: 'ASR \u51c6\u786e\u7387', value: `${asr}%`, extra: '\u8bed\u97f3\u8bc6\u522b', tone: 'is-up' },
    { label: 'AI \u5e76\u53d1\u4f1a\u8bdd', value: `${concurrent}`, extra: '\u5ea6\u5cf0 120', tone: undefined },
    { label: '\u5e73\u5747\u54cd\u5e94', value: `${latency} ms`, extra: 'ASR+NLU', tone: latency > 500 ? 'is-down' : 'is-up' }
  ];
};

export const createAiHeroCore = (randomize = false) => {
  const resolve = randomize ? randomFloat(72, 86) : 78.4;
  const transfer = randomize ? randomFloat(12, 24) : 18.2;
  const failRate = randomize ? randomFloat(2, 8) : 4.5;
  const inbound = randomize ? randomInt(700, 900) : 840;
  const avgConfidence = randomize ? randomFloat(0.82, 0.94, 2) : 0.88;
  return { resolve, transfer, failRate, inbound, avgConfidence };
};

/** Extra center-column metrics aligned to real backend sources later. */
export const createAiHeroExtras = (randomize = false) => {
  return {
    faqPending: randomize ? randomInt(6, 28) : 14,
    todaySessions: randomize ? randomInt(680, 980) : 812,
    activeAgents: randomize ? randomInt(3, 9) : 5
  };
};

export const createAiTrafficTrend = (randomize = false) => {
  const hours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
  return hours.map((hour, index) => {
    const base = index < 2 ? 18 + index * 12 : index < 5 ? 40 + index * 7 : index < 9 ? 70 - (index - 5) * 5 : 28;
    const ai = randomize ? randomInt(base, base + 30) : base + 16;
    const human = randomize ? randomInt(Math.floor(base * 0.35), Math.floor(base * 0.7)) : Math.floor(base * 0.48);
    const resolved = randomize ? randomInt(Math.floor(ai * 0.7), Math.floor(ai * 0.88)) : Math.floor(ai * 0.79);
    return { hour, ai, human, resolved };
  });
};

export const createAiLatencyTrend = (randomize = false) => {
  const hours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
  return hours.map((hour) => ({
    hour,
    asr: randomize ? randomInt(180, 320) : 240 + randomInt(-20, 20),
    tts: randomize ? randomInt(140, 280) : 190 + randomInt(-15, 25)
  }));
};

export const createAiIntentRanking = (randomize = false) => {
  const rows = [
    { name: '\u67e5\u8be2\u8ba2\u5355', count: randomize ? randomInt(120, 220) : 186 },
    { name: '\u8d26\u5355\u54a8\u8be2', count: randomize ? randomInt(90, 180) : 142 },
    { name: '\u5bc6\u7801\u91cd\u7f6e', count: randomize ? randomInt(60, 140) : 98 },
    { name: '\u5957\u9910\u54a8\u8be2', count: randomize ? randomInt(40, 110) : 76 },
    { name: '\u6295\u8bc9\u5efa\u5355', count: randomize ? randomInt(20, 80) : 41 }
  ];
  const max = Math.max(...rows.map((item) => item.count), 1);
  return rows.map((item) => ({ ...item, percent: Math.round((item.count / max) * 100) }));
};

export const createAiOutcomes = (randomize = false) => {
  const resolved = randomize ? randomInt(520, 720) : 638;
  const transfer = randomize ? randomInt(110, 220) : 164;
  const fail = randomize ? randomInt(20, 60) : 38;
  return [
    { label: '\u5df2\u89e3\u51b3', value: resolved, color: '#2ee6a8' },
    { label: '\u8f6c\u4eba\u5de5', value: transfer, color: '#ff9a3c' },
    { label: '\u8bc6\u522b\u5931\u8d25', value: fail, color: '#ff7a7a' }
  ];
};

export const createAiFeed = (randomize = false): AiFeedItem[] => {
  const intents = ['\u67e5\u8be2\u8ba2\u5355', '\u8d26\u5355\u54a8\u8be2', '\u5bc6\u7801\u91cd\u7f6e', '\u6295\u8bc9\u5efa\u5355', '\u5957\u9910\u53d8\u66f4'];
  const reasons = ['\u60c5\u7eea\u6fc0\u70c8', '\u4fe1\u5fc3\u5ea6\u4f4e', '\u7528\u6237\u660e\u786e\u8981\u6c42', '\u591a\u8f6e\u672a\u89e3\u51b3', 'VIP \u4f18\u5148'];
  const statuses = [
    { status: '\u5df2\u8f6c\u63a5', tagClass: 'is-warn' },
    { status: '\u6392\u961f\u4e2d', tagClass: 'is-info' },
    { status: '\u5df2\u63a5\u901a', tagClass: 'is-ok' }
  ];
  return Array.from({ length: 5 }).map((_, index) => {
    const st = statuses[index % statuses.length];
    const minute = String(46 - index).padStart(2, '0');
    return {
      id: `ai-${index}`,
      time: `14:${minute}:${String(10 + index).padStart(2, '0')}`,
      intent: intents[index % intents.length],
      reason: reasons[index % reasons.length],
      status: st.status,
      tagClass: st.tagClass
    };
  });
};
