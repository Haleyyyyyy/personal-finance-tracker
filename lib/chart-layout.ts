export function lineChartDomain(values: number[]) {
  if (!values.length) return { min: -1, max: 1 };
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const magnitude = Math.max(1, Math.abs(rawMin), Math.abs(rawMax));
  const honestSpan = Math.max(rawMax - rawMin, magnitude * 0.08);
  const center = (rawMin + rawMax) / 2;
  const padding = honestSpan * 0.14;
  return { min: center - honestSpan / 2 - padding, max: center + honestSpan / 2 + padding };
}

export function visibleTickIndexes(count: number, maximumTicks = 8) {
  if (count <= maximumTicks) return Array.from({ length: count }, (_, index) => index);
  const step = Math.ceil((count - 1) / (maximumTicks - 1));
  const ticks = Array.from({ length: count }, (_, index) => index).filter(index => index % step === 0);
  if (ticks.at(-1) !== count - 1) ticks.push(count - 1);
  return ticks;
}

export function barChartMinWidth(monthCount: number, viewportFitMonths = 6, monthWidth = 78) {
  return monthCount <= viewportFitMonths ? "100%" : `${monthCount * monthWidth}px`;
}
