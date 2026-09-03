export const screenColors = ['#3de7ff', '#8b7cff', '#2ee6a8', '#ff9a3c', '#ff5a9a', '#f0c040'];

export const screenTooltip = {
  trigger: 'axis' as const,
  backgroundColor: 'rgba(4, 14, 32, 0.94)',
  borderColor: 'rgba(61, 231, 255, 0.35)',
  borderWidth: 1,
  textStyle: { color: '#c8e4f5', fontSize: 12 },
  extraCssText: 'box-shadow: 0 8px 28px rgba(0,0,0,0.45), 0 0 16px rgba(0,140,220,0.2); border-radius:2px;'
};

export const screenLegend = {
  top: 0,
  itemWidth: 12,
  itemHeight: 8,
  itemGap: 16,
  textStyle: { color: 'rgba(140,185,220,0.8)', fontSize: 11 }
};

export const screenAxisStyle = {
  axisLine: { lineStyle: { color: 'rgba(40, 130, 180, 0.18)' } },
  axisTick: { show: false },
  axisLabel: { color: 'rgba(110,160,195,0.72)', fontSize: 11 },
  splitLine: { lineStyle: { color: 'rgba(40, 100, 160, 0.1)', type: 'dashed' as const } }
};

export const screenGrid = {
  left: 8,
  right: 8,
  top: 32,
  bottom: 4,
  containLabel: true
};

export const areaColor = (hex: string, alpha = 0.4) => {
  const map: Record<string, string> = {
    '#38bdf8': `rgba(61, 231, 255, ${alpha})`,
    '#00f2ff': `rgba(61, 231, 255, ${alpha})`,
    '#3de7ff': `rgba(61, 231, 255, ${alpha})`,
    '#818cf8': `rgba(139, 124, 255, ${alpha})`,
    '#34d399': `rgba(46, 230, 168, ${alpha})`
  };
  return map[hex] || hex;
};

export const buildAreaStyle = (color: string) => ({
  color: {
    type: 'linear' as const,
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: areaColor(color, 0.38) },
      { offset: 1, color: areaColor(color, 0) }
    ]
  }
});
