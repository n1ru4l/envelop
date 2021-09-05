import { DefaultContext } from '@envelop/core';
import { DocumentNode } from 'graphql';

export interface PersistedOperationsStore {
  /**
   * Transfroms a hash/id into a DocumentNode or SDL string.
   * Prefer returning `DocumentNode` if available to avoid additional parsing phase.
   * Return `null` in case of a store miss.
   * @param operationId
   */
  get(operationId: string): string | DocumentNode | null;
}

export type PersistedOperationsFunctionStore<ContextType = DefaultContext> = (
  context: Readonly<ContextType>
) => PersistedOperationsStore;
