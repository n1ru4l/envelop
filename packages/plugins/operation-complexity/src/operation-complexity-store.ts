import type { PromiseOrValue } from '@envelop/core';

export type OperationComplexityStore = {
  /** Get the current consumed credit amount. */
  get(id: string): PromiseOrValue<number>;
  /** Add to the current consumed credit count. */
  add(id: string, amount: number): PromiseOrValue<void>;
};
