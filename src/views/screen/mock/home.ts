export interface HomeKpi {
  label: string;
  value: string;
  extra: string;
  tone?: 'is-up' | 'is-down';
}

export interface HomeLiveFeedItem {
  id: string;
  time: string;
  type: string;
  phone: string;
  target: string;
  status: string;
  tagClass: string;
}

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const randomFloat = (min: number, max: number, digits = 1) => Number((Math.random() * (max - min) + min).toFixed(digits));

export const createHomeKpis = (randomize = false): HomeKpi[] => {
  const online = randomize ? randomInt(42, 58) : 51;
  const waiting = randomize ? randomInt(3, 18) : 9;
  const outbound = randomize ? randomInt(560, 720) : 648;
  const voicemail = randomize ? randomInt(4, 16) : 7;

  return [
    { label: '\u5728\u7EBF\u5750\u5E2D', value: `${online}`, extra: '\u7B7E\u5165\u7387 78%', tone: undefined },
    { label: '\u5F53\u524D\u6392\u961F', value: `${waiting}`, extra: waiting > 12 ? '\u9700\u5173\u6CE8' : '\u6B63\u5E38', tone: waiting > 12 ? 'is-down' : undefined },
    { label: '\u5916\u547C\u4EFB\u52A1', value: `${outbound}`, extra: '\u5B8C\u6210\u7387 72%', tone: undefined },
    { label: '\u7559\u8A00\u5F85\u5904\u7406', value: `${voicemail}`, extra: '\u4F18\u5148\u5904\u7406', tone: voicemail > 10 ? 'is-down' : undefined }
  ];
};

export const createHomeHeroCore = (randomize = false) => {
  const inbound = randomize ? randomInt(820, 980) : 960;
  const answerRate = randomize ? randomFloat(86, 93) : 86.8;
  return {
    inbound: `${inbound}`,
    inboundExtra: '\u8F83\u6628\u65E5 +6.2%',
    inboundTone: 'is-up' as const,
    answerRate
  };
};

export const createHomeTrendHours = (randomize = false) => {
  const hours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
  return hours.map((hour, index) => {
    const base = index < 2 ? 20 + index * 15 : index < 5 ? 55 + index * 8 : index < 9 ? 90 - (index - 5) * 6 : 40;
    const inbound = randomize ? randomInt(base - 15, base + 20) : base + 12;
    const outbound = randomize ? randomInt(base - 25, base) : Math.max(8, base - 18);
    const answered = randomize ? randomInt(Math.floor(inbound * 0.82), Math.floor(inbound * 0.93)) : Math.floor(inbound * 0.89);
    return { hour, inbound, outbound, answered };
  });
};

export const createHomeAgentSummary = (randomize = false) => {
  const idle = randomize ? randomInt(10, 18) : 14;
  const talking = randomize ? randomInt(18, 28) : 22;
  const wrap = randomize ? randomInt(6, 12) : 8;
  const away = randomize ? randomInt(4, 10) : 7;
  const total = idle + talking + wrap + away;
  return {
    total,
    items: [
      { label: '\u7A7A\u95F2', value: idle, color: '#34d399' },
      { label: '\u901A\u8BDD\u4E2D', value: talking, color: '#38bdf8' },
      { label: '\u8BDD\u540E\u5904\u7406', value: wrap, color: '#818cf8' },
      { label: '\u5C0F\u4F11/\u79BB\u5F00', value: away, color: '#fbbf24' }
    ]
  };
};

export const createHomeQueueRanking = (randomize = false) => {
  const rows = [
    { name: '\u552E\u524D\u54A8\u8BE2\u961F\u5217', waiting: randomize ? randomInt(4, 16) : 11 },
    { name: '\u552E\u540E\u652F\u6301\u961F\u5217', waiting: randomize ? randomInt(2, 10) : 6 },
    { name: 'VIP \u4E13\u5C5E\u961F\u5217', waiting: randomize ? randomInt(0, 5) : 2 },
    { name: '\u6295\u8BC9\u5904\u7406\u961F\u5217', waiting: randomize ? randomInt(1, 8) : 4 },
    { name: '\u56DE\u8BBF\u4EFB\u52A1\u961F\u5217', waiting: randomize ? randomInt(0, 6) : 3 }
  ];
  const max = Math.max(...rows.map((item) => item.waiting), 1);
  return rows.map((item) => ({ ...item, percent: Math.round((item.waiting / max) * 100) }));
};

export const createHomeSkillGroups = (randomize = false) => [
  { name: '\u552E\u524D\u4E00\u7EC4', rate: randomize ? randomInt(86, 95) : 91 },
  { name: '\u552E\u524D\u4E8C\u7EC4', rate: randomize ? randomInt(82, 92) : 88 },
  { name: '\u552E\u540E\u4E00\u7EC4', rate: randomize ? randomInt(78, 90) : 85 },
  { name: 'VIP \u7EC4', rate: randomize ? randomInt(90, 98) : 94 },
  { name: '\u56DE\u8BBF\u7EC4', rate: randomize ? randomInt(75, 88) : 82 }
];

const feedTemplates = [
  { type: '\u547C\u5165', phone: '138****6201', target: '\u552E\u524D\u54A8\u8BE2\u961F\u5217', status: '\u6392\u961F\u4E2D', tagClass: 'is-warning' },
  { type: '\u547C\u51FA', phone: '159****8832', target: '\u5750\u5E2D 1003', status: '\u632F\u94C3', tagClass: 'is-info' },
  { type: '\u547C\u5165', phone: '186****0048', target: '\u5750\u5E2D 1007', status: '\u901A\u8BDD\u4E2D', tagClass: 'is-success' },
  { type: '\u547C\u51FA', phone: '137****9920', target: '\u5916\u547C\u4EFB\u52A1 A12', status: '\u5DF2\u63A5\u901A', tagClass: 'is-success' },
  { type: '\u547C\u5165', phone: '021-****6688', target: '\u552E\u540E\u652F\u6301\u961F\u5217', status: '\u5DF2\u653E\u5F03', tagClass: 'is-danger' },
  { type: '\u7559\u8A00', phone: '135****7710', target: '\u8BED\u97F3\u4FE1\u7BB1', status: '\u5F85\u5904\u7406', tagClass: 'is-warning' },
  { type: '\u547C\u51FA', phone: '177****3309', target: '\u5750\u5E2D 1011', status: '\u8BDD\u540E\u5904\u7406', tagClass: 'is-info' },
  { type: '\u547C\u5165', phone: '188****5560', target: 'VIP \u4E13\u5C5E\u961F\u5217', status: '\u5DF2\u63A5\u901A', tagClass: 'is-success' }
];

export const createHomeLiveFeed = (randomize = false): HomeLiveFeedItem[] => {
  const now = new Date();
  return feedTemplates.slice(0,5).map((item, index) => {
    const minute = (now.getMinutes() - index + 60) % 60;
    const second = randomize ? randomInt(10, 59) : (index * 7 + 12) % 60;
    return {
      id: `${index}-${minute}`,
      time: `${`${now.getHours()}`.padStart(2, '0')}:${`${minute}`.padStart(2, '0')}:${`${second}`.padStart(2, '0')}`,
      ...item
    };
  });
};
