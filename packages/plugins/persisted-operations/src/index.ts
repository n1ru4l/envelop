import { Plugin } from '@envelop/types';
import { DocumentNode, parse } from 'graphql';

export class NonPersistedOperationError extends Error {}

export interface PersistedOperationsStore {
  /**
   * Check if the provided string content can be handled by the store or not.
   * @param idOrSdl persisted id/hash, or SDL, provided for `parse`
   */
  canHandle(idOrSdl: string): boolean;
  /**
   * Transfroms a hash/id into a DocumentNode or SDL string. Returns `null` in case of a store miss.
   * @param id
   */
  get(id: string): string | DocumentNode | null;
}

export const usePersistedOperations = (options: { store: PersistedOperationsStore }): Plugin => {
  return {
    onParse({ params, setParsedDocument }) {
      if (typeof params.source === 'string' && options.store.canHandle(params.source)) {
        const rawResult = options.store.get(params.source);

        if (rawResult) {
          const result = typeof rawResult === 'string' ? parse(rawResult) : rawResult;
          setParsedDocument(result);
        } else {
          throw new NonPersistedOperationError(`The operation hash "${params.source}" is not valid`);
        }
      }
    },
  };
};
