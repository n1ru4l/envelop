import { Plugin } from '@envelop/types';
import { DocumentNode, GraphQLError, parse } from 'graphql';

export class NonPersistedOperationError extends Error {}

export interface PersistedOperationsStore {
  /**
   * Check if the provided string content can be handled by the store or not.
   * @param idOrSdl persisted id/hash, or SDL, provided for `parse`
   */
  canHandle(idOrSdl: string): boolean;
  /**
   * Transfroms a hash/id into a DocumentNode or SDL string.
   * Prefer returning `DocumentNode` if available to avoid additional parsing phase.
   * Return `null` in case of a store miss.
   * @param id
   */
  get(id: string): string | DocumentNode | null;
}

export type UsePersistedOperationsOptions = {
  /**
   * Set to `false` to allow running operations that are not available in the store.
   * Set to `true` to allow running only persisted operations.
   */
  onlyPersistedOperations: boolean;
  /**
   * The store to use. You can implement any custom store that loads the data from any source.
   */
  store: PersistedOperationsStore;
  /**
   * Writes operation id to the context (enabled by default)
   */
  writeToContext?: boolean;
};

const symbolInContext = Symbol('operationId');

export interface PluginContext {
  [symbolInContext]?: string;
}

export function readOperationId(context: PluginContext) {
  return context[symbolInContext];
}

export const usePersistedOperations = (options: UsePersistedOperationsOptions): Plugin<PluginContext> => {
  const writeToContext = options.writeToContext !== false;

  return {
    onParse({ params, setParsedDocument, extendContext }) {
      if (typeof params.source === 'string') {
        if (options.store.canHandle(params.source)) {
          const rawResult = options.store.get(params.source);

          if (rawResult) {
            const result = typeof rawResult === 'string' ? parse(rawResult) : rawResult;

            if (writeToContext) {
              extendContext({
                [symbolInContext]: params.source,
              });
            }

            setParsedDocument(result);
          } else {
            throw new NonPersistedOperationError(`The operation hash "${params.source}" is not valid`);
          }
        } else {
          if (options.onlyPersistedOperations) {
            throw new GraphQLError(`Failed to handle GraphQL persisted operation.`);
          }
        }
      }
    },
  };
};
