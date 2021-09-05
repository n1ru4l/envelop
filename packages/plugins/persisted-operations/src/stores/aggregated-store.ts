import { DocumentNode } from 'graphql';
import { PersistedOperationsStore } from '../types';

export class AggregatedStore implements PersistedOperationsStore {
  constructor(private stores: PersistedOperationsStore[]) {}

  get(operationId: string): string | DocumentNode | null {
    for (const store of this.stores) {
      const item = store.get(operationId);

      if (item) {
        return item;
      }
    }

    return null;
  }
}
