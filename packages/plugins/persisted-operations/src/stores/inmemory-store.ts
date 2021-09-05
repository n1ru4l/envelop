import { DocumentNode } from 'graphql';
import { PersistedOperationsStore } from '../types';

export type InMemoryStoreDataMap = Map<string, DocumentNode | string>;

export class InMemoryStore implements PersistedOperationsStore {
  private storeData: InMemoryStoreDataMap;
  public storeId: string;

  constructor(options?: { initialData?: InMemoryStoreDataMap; storeId?: string }) {
    this.storeData = options?.initialData ?? new Map();
    this.storeId = options?.storeId ?? `store_${Date.now()}`;
  }

  get(operationId: string): string | DocumentNode | null {
    return this.storeData.get(operationId) || null;
  }

  public prime(operationId: string, document: string | DocumentNode): void {
    this.storeData.set(operationId, document);
  }

  public clear(operationId: string): void {
    this.storeData.delete(operationId);
  }
}
