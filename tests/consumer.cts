import { planCapacity, type CapacityPlan } from '@lp-labs/capacity-planner';
const plan: CapacityPlan = planCapacity([{ id: 'job', start: 0, end: 5, demand: 2 }], 2);
const segments = plan.segments.length;
void segments;
