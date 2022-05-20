import type { OperationComplexityStore } from './operation-complexity-store';

type Record = {
  consumedBudget: number;
  lastFlush: number;
  timeout?: NodeJS.Timeout;
};

export type InMemoryOperationComplexityStoreParams = {
  /** Interval after which points should be reclaimed. */
  reclaimInterval?: number;
  /** Amount of points that should be reclaimed on each interval. */
  reclaimAmountPoints?: number;
};

export const defaultReclaimInterval = 1000;
export const defaultReclaimPointAmount = 50;

/**
 * Create a store for keeping track of the consumed query cost budget per API consumer in memory.
 * For deployments with replicas we recommend the usage of a distributed store based on Redis or similar technologies.
 */
export const createInMemoryOperationComplexityStore = (
  params?: InMemoryOperationComplexityStoreParams
): OperationComplexityStore => {
  const reclaimInterval = params?.reclaimInterval ?? defaultReclaimInterval;
  const reclaimAmount = params?.reclaimAmountPoints ?? defaultReclaimPointAmount;

  const values = new Map<string, Record>();

  const updateCurrentBudgetConsumption = (record: Record, currentTimestamp: number) => {
    const consumedBudget = record.consumedBudget;
    const lastFlushTime = record.lastFlush;

    const timePassedSinceLastFlush = currentTimestamp - lastFlushTime;
    const passedIntervals = Math.floor(timePassedSinceLastFlush / reclaimInterval);

    record.lastFlush = currentTimestamp;
    record.consumedBudget = Math.max(0, consumedBudget - passedIntervals * reclaimAmount);

    return record.consumedBudget;
  };

  return {
    get(id) {
      const record = values.get(id);
      if (record === undefined) {
        return 0;
      }

      return updateCurrentBudgetConsumption(record, new Date().getTime());
    },
    add(id, amount) {
      let record = values.get(id);
      if (record === undefined) {
        record = {
          consumedBudget: amount,
          lastFlush: new Date().getTime(),
          //   timeout:
        };
        values.set(id, record);
      } else {
        // update value right now
        updateCurrentBudgetConsumption(record, new Date().getTime());
        // then add new value
        record.consumedBudget += amount;
      }

      const timeTillExpire = (record.consumedBudget / reclaimAmount) * reclaimInterval;

      if (record.timeout) {
        record.timeout && clearTimeout(record.timeout);
      }

      record.timeout = setTimeout(() => {
        values.delete(id);
      }, timeTillExpire);
    },
  };
};
