import { Plugin, DefaultContext } from '@envelop/types';
import { GraphQLError, parse } from 'graphql';
import { PersistedOperationsFunctionStore, PersistedOperationsStore } from './types';
import { operationIdFromSource } from './utils';

export type UsePersistedOperationsOptions<ContextType = DefaultContext> = {
  /**
   * Set to `false` to allow running operations that are not available in the store.
   * Set to `true` to allow running only persisted operations.
   */
  onlyPersistedOperations?: boolean;
  /**
   * The store to use. You can implement a store that loads data from any source.
   * You can even support multiple stores and implement a function that returns one of those stores based on context values.
   */
  store: PersistedOperationsStore | PersistedOperationsFunctionStore<ContextType>;
  /**
   * Function that returns the operation id, e.g. by retrieving it from cusotm properties within context
   */
  setOperationId?: (context: Readonly<DefaultContext>) => string | undefined;
  /**
   * Writes operation id to the context (enabled by default)
   */
  writeToContext?: boolean;
};

const DEFAULT_OPTIONS: Omit<UsePersistedOperationsOptions, 'store'> = {
  onlyPersistedOperations: false,
  writeToContext: true,
};

const contextProperty = Symbol('persistedOperationId');

export type PersistedOperationPluginContext<TOptions extends Partial<UsePersistedOperationsOptions>> =
  TOptions['writeToContext'] extends true ? { [contextProperty]: string } : {};

export function readOperationId<TOptions extends UsePersistedOperationsOptions>(
  context: PersistedOperationPluginContext<TOptions>
): string {
  return context[contextProperty];
}

export const usePersistedOperations = <TOptions extends UsePersistedOperationsOptions>(
  rawOptions: TOptions
): Plugin<PersistedOperationPluginContext<TOptions>> => {
  const options: UsePersistedOperationsOptions = {
    ...DEFAULT_OPTIONS,
    ...(rawOptions || {}),
  };

  return {
    onParse({ context, params, extendContext, setParsedDocument }) {
      const operationId = options.setOperationId ? options.setOperationId(context) : operationIdFromSource(params.source);

      if (!operationId) {
        if (options.onlyPersistedOperations) {
          throw new GraphQLError('Must provide operation id');
        }

        return;
      }

      const store = typeof options.store === 'function' ? options.store(context) : options.store;

      if (!store) {
        throw new GraphQLError('Must provide store for persisted-operations!');
      }

      const rawResult = store.get(operationId);

      if (rawResult) {
        const document = typeof rawResult === 'string' ? parse(rawResult) : rawResult;

        if (options.writeToContext) {
          extendContext({ [contextProperty]: operationId } as PersistedOperationPluginContext<{ writeToContext: true }>);
        }

        setParsedDocument(document);

        return;
      }

      if (options.onlyPersistedOperations) {
        // we want to throw an error only when "onlyPersistedOperations" is true, otherwise we let execution continue normally
        throw new GraphQLError(`Unable to match operation with id '${operationId}'`);
      }

      // if we reach this stage we could not retrieve a persisted operation and we didn't throw any error as onlyPersistedOperations is false
      // hence we let operation continue assuming consumer is not passing an operation id, but a plain query string, with current request.
    },
  };
};
