import { planCapacity, type DemandWindow } from '@lp-labs/capacity-planner';
const windows: DemandWindow[] = [{ id: 'shift', start: 0, end: 3_600_000, demand: 4 }];
const plan = planCapacity(windows, 3);
const peak: number = plan.peakShortfall;
void peak;
