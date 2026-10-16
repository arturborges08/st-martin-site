export function startTimes(
  openMin: number,
  closeMin: number,
  duration: number,
  step: number,
): number[] {
  if (step <= 0 || duration <= 0 || closeMin <= openMin) return [];
  const starts: number[] = [];
  for (let time = openMin; time + duration <= closeMin; time += step) starts.push(time);
  return starts;
}

export function rangesOverlap(start: number, end: number, otherStart: number, otherEnd: number): boolean {
  return start < otherEnd && otherStart < end;
}
