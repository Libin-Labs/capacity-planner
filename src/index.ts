export interface DemandWindow {
  id: string;
  start: number;
  end: number;
  demand: number;
}

export interface CapacitySegment {
  readonly start: number;
  readonly end: number;
  readonly demand: number;
  readonly capacity: number;
  readonly shortfall: number;
  readonly contributors: readonly string[];
}

export interface CapacityPlan {
  readonly capacity: number;
  readonly peakDemand: number;
  readonly peakShortfall: number;
  readonly segments: readonly CapacitySegment[];
  readonly shortfalls: readonly CapacitySegment[];
}

function positiveInteger(value: unknown, name: string, allowZero = false): number {
  if (
    !Number.isSafeInteger(value) ||
    (value as number) < (allowZero ? 0 : 1) ||
    (value as number) > 1_000_000_000
  ) {
    throw new RangeError(`${name} must be a safe integer from ${allowZero ? 0 : 1} to 1000000000.`);
  }
  return value as number;
}

function normalizeDemand(value: unknown): DemandWindow {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
  ) {
    throw new TypeError('Demand windows must be plain objects.');
  }
  const allowed = ['id', 'start', 'end', 'demand'];
  const result: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(value)) {
    const descriptor =
      typeof key === 'string' ? Object.getOwnPropertyDescriptor(value, key) : undefined;
    if (
      typeof key !== 'string' ||
      !allowed.includes(key) ||
      !descriptor?.enumerable ||
      !('value' in descriptor)
    ) {
      throw new TypeError('Demand windows contain an unsupported or non-data property.');
    }
    result[key] = descriptor.value;
  }
  if (typeof result.id !== 'string' || result.id.length < 1 || result.id.length > 128) {
    throw new TypeError('Demand ID must contain 1..128 characters.');
  }
  if (
    !Number.isSafeInteger(result.start) ||
    !Number.isSafeInteger(result.end) ||
    (result.start as number) >= (result.end as number)
  ) {
    throw new RangeError('Demand bounds must be increasing safe-integer epoch milliseconds.');
  }
  return Object.freeze({
    id: result.id,
    start: result.start as number,
    end: result.end as number,
    demand: positiveInteger(result.demand, 'demand'),
  });
}

export function planCapacity(windows: readonly DemandWindow[], capacity: number): CapacityPlan {
  if (!Array.isArray(windows)) throw new TypeError('Demand windows must be an array.');
  if (windows.length > 10_000) throw new RangeError('At most 10000 demand windows are supported.');
  const limit = positiveInteger(capacity, 'capacity');
  const normalized = windows.map(normalizeDemand);
  const byId = new Map<string, DemandWindow>();
  for (const window of normalized) {
    if (byId.has(window.id)) throw new TypeError(`Duplicate demand ID: ${window.id}`);
    byId.set(window.id, window);
  }
  if (normalized.length === 0) {
    return Object.freeze({
      capacity: limit,
      peakDemand: 0,
      peakShortfall: 0,
      segments: Object.freeze([]),
      shortfalls: Object.freeze([]),
    });
  }

  const events = new Map<number, { starts: DemandWindow[]; ends: DemandWindow[] }>();
  const eventAt = (time: number) => {
    let event = events.get(time);
    if (!event) {
      event = { starts: [], ends: [] };
      events.set(time, event);
    }
    return event;
  };
  for (const window of normalized) {
    eventAt(window.start).starts.push(window);
    eventAt(window.end).ends.push(window);
  }
  const points = [...events.keys()].sort((a, b) => a - b);
  const active = new Map<string, DemandWindow>();
  const segments: CapacitySegment[] = [];
  let demand = 0;
  let peakDemand = 0;
  let peakShortfall = 0;
  for (let index = 0; index < points.length - 1; index++) {
    const start = points[index]!;
    const event = events.get(start)!;
    for (const ended of event.ends) {
      active.delete(ended.id);
      demand -= ended.demand;
    }
    for (const started of event.starts) {
      active.set(started.id, started);
      demand += started.demand;
    }
    const end = points[index + 1]!;
    if (start === end || demand === 0) continue;
    const shortfall = Math.max(0, demand - limit);
    peakDemand = Math.max(peakDemand, demand);
    peakShortfall = Math.max(peakShortfall, shortfall);
    segments.push(
      Object.freeze({
        start,
        end,
        demand,
        capacity: limit,
        shortfall,
        contributors: Object.freeze([...active.keys()].sort()),
      }),
    );
  }
  const shortfalls = segments.filter((segment) => segment.shortfall > 0);
  return Object.freeze({
    capacity: limit,
    peakDemand,
    peakShortfall,
    segments: Object.freeze(segments),
    shortfalls: Object.freeze(shortfalls),
  });
}
