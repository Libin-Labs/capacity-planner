import test from 'node:test';
import assert from 'node:assert/strict';
import { planCapacity } from '../dist/esm/index.js';

test('sweeps overlapping demand into exact bounded segments', () => {
  const result = planCapacity(
    [
      { id: 'a', start: 0, end: 10, demand: 2 },
      { id: 'b', start: 5, end: 15, demand: 3 },
    ],
    4,
  );
  assert.deepEqual(
    result.segments.map(({ start, end, demand, shortfall }) => [start, end, demand, shortfall]),
    [
      [0, 5, 2, 0],
      [5, 10, 5, 1],
      [10, 15, 3, 0],
    ],
  );
  assert.deepEqual(result.shortfalls[0].contributors, ['a', 'b']);
});

test('removes ending demand before adding demand at an exact shared endpoint', () => {
  const result = planCapacity(
    [
      { id: 'before', start: 0, end: 5, demand: 10 },
      { id: 'after', start: 5, end: 9, demand: 2 },
    ],
    3,
  );
  assert.deepEqual(
    result.segments.map((segment) => segment.demand),
    [10, 2],
  );
  assert.deepEqual(
    result.shortfalls.map(({ start, end }) => [start, end]),
    [[0, 5]],
  );
});

test('reports contributors and peak shortfall at each exact segment', () => {
  const plan = planCapacity(
    [
      { id: 'alpha', start: 0, end: 4, demand: 3 },
      { id: 'beta', start: 2, end: 6, demand: 4 },
      { id: 'gamma', start: 3, end: 5, demand: 1 },
    ],
    5,
  );
  assert.equal(plan.peakDemand, 8);
  assert.equal(plan.peakShortfall, 3);
  assert.deepEqual(plan.segments[2].contributors, ['alpha', 'beta', 'gamma']);
});

test('returns an empty immutable plan for no demand', () => {
  const plan = planCapacity([], 10);
  assert.equal(plan.peakDemand, 0);
  assert.equal(plan.peakShortfall, 0);
  assert.deepEqual(plan.segments, []);
  assert.equal(Object.isFrozen(plan), true);
  assert.equal(Object.isFrozen(plan.segments), true);
});

test('does not claim forecasts, and capacity is treated as an explicit deterministic limit', () => {
  const plan = planCapacity([{ id: 'need', start: 100, end: 200, demand: 5 }], 5);
  assert.equal(plan.shortfalls.length, 0);
  assert.equal(plan.segments[0].capacity, 5);
  assert.deepEqual([plan.segments[0].start, plan.segments[0].end], [100, 200]);
});

test('orders contributors deterministically regardless of input order', () => {
  const first = planCapacity(
    [
      { id: 'z', start: 0, end: 5, demand: 1 },
      { id: 'a', start: 0, end: 5, demand: 1 },
    ],
    1,
  );
  const second = planCapacity(
    [
      { id: 'a', start: 0, end: 5, demand: 1 },
      { id: 'z', start: 0, end: 5, demand: 1 },
    ],
    1,
  );
  assert.deepEqual(first.segments, second.segments);
});

test('accepts safe-integer epoch bounds without inferring local time zones', () => {
  const result = planCapacity([{ id: 'epoch', start: 0, end: 60_000, demand: 1 }], 1);
  assert.deepEqual([result.segments[0].start, result.segments[0].end], [0, 60_000]);
});

test('rejects duplicate IDs, malformed windows, and zero demand', () => {
  assert.throws(
    () =>
      planCapacity(
        [
          { id: 'dup', start: 0, end: 1, demand: 1 },
          { id: 'dup', start: 2, end: 3, demand: 1 },
        ],
        1,
      ),
    /Duplicate demand ID/,
  );
  assert.throws(() => planCapacity([{ id: 'bad', start: 1, end: 1, demand: 1 }], 1), /increasing/);
  assert.throws(() => planCapacity([{ id: 'bad', start: 0, end: 1, demand: 0 }], 1), /demand/);
});

test('rejects unexpected, inherited, and accessor demand fields', () => {
  assert.throws(
    () =>
      planCapacity(
        [
          Object.assign(Object.create({ secret: 1 }), {
            id: 'x',
            start: 0,
            end: 1,
            demand: 1,
          }),
        ],
        1,
      ),
    /plain/,
  );
  assert.throws(
    () => planCapacity([{ id: 'x', start: 0, end: 1, demand: 1, extra: true }], 1),
    /unsupported/,
  );
  const demand = { id: 'x', start: 0, end: 1, demand: 1 };
  Object.defineProperty(demand, 'end', { enumerable: true, get: () => 1 });
  assert.throws(() => planCapacity([demand], 1), /non-data/);
});

test('enforces input count and positive safe-integer capacities', () => {
  assert.throws(() => planCapacity([], 0), /capacity/);
  assert.throws(
    () => planCapacity(new Array(10_001).fill({ id: 'x', start: 0, end: 1, demand: 1 }), 1),
    /10000/,
  );
});
