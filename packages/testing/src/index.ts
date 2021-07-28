import { DocumentNode, ExecutionResult, getOperationAST, GraphQLError, GraphQLSchema, print } from 'graphql';
import { envelop, useSchema } from '@envelop/core';
import { GetEnvelopedFn, Plugin, isAsyncIterable } from '@envelop/types';
import { cloneSchema, isDocumentNode } from '@graphql-tools/utils';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function createSpiedPlugin() {
  const afterResolver = jest.fn();

  const baseSpies = {
    onSchemaChange: jest.fn(),
    afterParse: jest.fn(),
    afterValidate: jest.fn(),
    afterContextBuilding: jest.fn(),
    afterExecute: jest.fn(),
    afterResolver,
    beforeResolver: jest.fn(() => afterResolver),
  };

  const spies = {
    ...baseSpies,
    beforeParse: jest.fn(() => baseSpies.afterParse),
    beforeValidate: jest.fn(() => baseSpies.afterValidate),
    beforeContextBuilding: jest.fn(() => baseSpies.afterContextBuilding),
    beforeExecute: jest.fn(() => ({
      onExecuteDone: baseSpies.afterExecute,
      onResolverCalled: baseSpies.beforeResolver,
    })),
  };

  return {
    reset: () => {
      for (const [, value] of Object.entries(spies)) {
        value.mockReset();
      }
    },
    spies,
    plugin: <Plugin>{
      onSchemaChange: spies.onSchemaChange,
      onParse: spies.beforeParse,
      onValidate: spies.beforeValidate,
      onExecute: spies.beforeExecute,
      onContextBuilding: spies.beforeContextBuilding,
    },
  };
}

type MaybePromise<T> = T | Promise<T>;
type MaybeAsyncIterableIterator<T> = T | AsyncIterableIterator<T>;

type ExecutionReturn = MaybeAsyncIterableIterator<ExecutionResult>;

export function createTestkit(
  pluginsOrEnvelop: GetEnvelopedFn<any> | Plugin<any>[],
  schema?: GraphQLSchema
): {
  execute: (
    operation: DocumentNode | string,
    variables?: Record<string, any>,
    initialContext?: any
  ) => MaybePromise<ExecutionReturn>;
  replaceSchema: (schema: GraphQLSchema) => void;
  wait: (ms: number) => Promise<void>;
} {
  let replaceSchema: (s: GraphQLSchema) => void = () => {};

  const replaceSchemaPlugin: Plugin = {
    onPluginInit({ setSchema }) {
      replaceSchema = setSchema;
    },
  };

  const toGraphQLErrorOrThrow = (thrownThing: unknown): GraphQLError => {
    if (thrownThing instanceof GraphQLError) {
      return thrownThing;
    }
    throw thrownThing;
  };

  const initRequest = Array.isArray(pluginsOrEnvelop)
    ? envelop({
        plugins: [...(schema ? [useSchema(cloneSchema(schema))] : []), replaceSchemaPlugin, ...pluginsOrEnvelop],
      })
    : pluginsOrEnvelop;

  return {
    wait: ms => new Promise(resolve => setTimeout(resolve, ms)),
    replaceSchema,
    execute: async (operation, variableValues = {}, initialContext = {}) => {
      const proxy = initRequest(initialContext);

      let document: DocumentNode;
      try {
        document = isDocumentNode(operation) ? operation : proxy.parse(operation);
      } catch (err: unknown) {
        return {
          errors: [toGraphQLErrorOrThrow(err)],
        };
      }

      let validationErrors: ReadonlyArray<GraphQLError>;
      try {
        validationErrors = proxy.validate(proxy.schema, document);
      } catch (err: unknown) {
        return {
          errors: [toGraphQLErrorOrThrow(err)],
        };
      }

      if (validationErrors.length > 0) {
        return {
          errors: validationErrors,
        };
      }

      const mainOperation = getOperationAST(document);

      if (mainOperation == null) {
        return {
          errors: [new GraphQLError('Could not identify main operation.')],
        };
      }

      let contextValue: any;

      try {
        contextValue = await proxy.contextFactory({
          request: {
            headers: {},
            method: 'POST',
            query: '',
            body: {
              query: print(document),
              variables: variableValues,
            },
          },
          document,
          operation: print(document),
          variables: variableValues,
          ...initialContext,
        });
      } catch (err: unknown) {
        return {
          errors: [toGraphQLErrorOrThrow(err)],
        };
      }

      if (mainOperation.operation === 'subscription') {
        return proxy.subscribe({
          variableValues,
          contextValue,
          schema: proxy.schema,
          document,
          rootValue: {},
        });
      }
      return proxy.execute({
        variableValues,
        contextValue,
        schema: proxy.schema,
        document,
        rootValue: {},
      });
    },
  };
}

export function assertSingleExecutionValue(input: ExecutionReturn): asserts input is ExecutionResult {
  if (isAsyncIterable(input)) {
    throw new Error('Received stream but expected single result');
  }
}

export function assertStreamExecutionValue(input: ExecutionReturn): asserts input is AsyncIterableIterator<ExecutionResult> {
  if (!isAsyncIterable(input)) {
    throw new Error('Received single result but expected stream.');
  }
}

export const collectAsyncIteratorValues = async <TType>(asyncIterable: AsyncIterableIterator<TType>): Promise<Array<TType>> => {
  const values: Array<TType> = [];
  for await (const value of asyncIterable) {
    values.push(value);
  }
  return values;
};
