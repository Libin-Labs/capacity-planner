# @lp-labs/capacity-planner

An exact event sweep over finite demand windows that reports peak demand and explains every
capacity shortfall with its precise bounds and contributing demand IDs.

```js
import { planCapacity } from '@lp-labs/capacity-planner';

const plan = planCapacity(
  [
    {
      id: 'support',
      start: 1_800_000_000_000,
      end: 1_800_003_600_000,
      demand: 4,
    },
    {
      id: 'on-call',
      start: 1_800_001_800_000,
      end: 1_800_005_400_000,
      demand: 2,
    },
  ],
  5,
);
console.log(plan.peakDemand, plan.shortfalls);
```

## Install

```sh
npm install @lp-labs/capacity-planner
```

## API

- `planCapacity(windows, capacity): CapacityPlan` sweeps an array of `DemandWindow` values against
  an explicit positive integer capacity (maximum 1,000,000,000).
- `DemandWindow` contains a unique `id` (1–128 characters), increasing safe-integer `start` and
  `end` epoch milliseconds, and positive integer `demand` (maximum 1,000,000,000).
- `CapacityPlan` contains `capacity`, `peakDemand`, `peakShortfall`, and frozen `segments` and
  `shortfalls` arrays. Every `CapacitySegment` has exact `[start, end)` bounds, summed demand,
  capacity, non-negative `shortfall`, and sorted `contributors` IDs. Adjacent windows share an
  endpoint without overlapping.
- `CapacitySegment` and `CapacityPlan` are exported type definitions.

The planner accepts at most 10,000 demand windows; an empty input yields an empty plan. Windows
must be plain own-data-property records. Duplicate IDs, unknown fields, accessors, invalid bounds,
and zero or unsafe demand/capacity values are rejected with `TypeError` or `RangeError`.
Timestamps are explicit numeric epoch milliseconds; no local date or implicit time-zone conversion
is performed.

## Customization and limits

Choose a capacity in the same integer unit as each window's demand. Each shortfall segment identifies
the exact overlapping requests contributing to the overage; use these intervals to explain
constraints or evaluate a proposed capacity change. This is deterministic arithmetic over supplied
windows, not a forecasting system: it does not infer demand, assign probabilities, or guarantee that
future demand will match the input.

Package scripts: `npm run build`, `npm run typecheck`, `npm test`, `npm run format`, and
`npm run format:check`. Requires Node.js 18 or newer. There are no runtime or peer dependencies.

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
