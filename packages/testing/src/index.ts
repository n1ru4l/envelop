import { DocumentNode, ExecutionResult, GraphQLSchema, print } from 'graphql';
import { getGraphQLParameters, processRequest, Push } from 'graphql-helix';
import { envelop, useSchema } from '@envelop/core';
import { Envelop, Plugin } from '@envelop/types';

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

export function createTestkit(
  pluginsOrEnvelop: Envelop | Plugin<any>[],
  schema?: GraphQLSchema
): {
  execute: (
    operation: DocumentNode | string,
    variables?: Record<string, any>,
    initialContext?: any
  ) => Promise<ExecutionResult<any>>;
  subscribe: (operation: DocumentNode | string, variables?: Record<string, any>, initialContext?: any) => Promise<Push<any, any>>;
  replaceSchema: (schema: GraphQLSchema) => void;
  wait: (ms: number) => Promise<void>;
} {
  let replaceSchema: (s: GraphQLSchema) => void = () => {};

  const replaceSchemaPlugin: Plugin = {
    onPluginInit({ setSchema }) {
      replaceSchema = setSchema;
    },
  };

  const initRequest = Array.isArray(pluginsOrEnvelop)
    ? envelop({
        plugins: [useSchema(schema!), replaceSchemaPlugin, ...pluginsOrEnvelop],
      })
    : pluginsOrEnvelop;

  return {
    wait: ms => new Promise(resolve => setTimeout(resolve, ms)),
    replaceSchema,
    execute: async (operation, rawVariables = {}, initialContext = null) => {
      const request = {
        headers: {},
        method: 'POST',
        query: '',
        body: {
          query: typeof operation === 'string' ? operation : print(operation),
          variables: rawVariables,
        },
      };
      const proxy = initRequest();
      const { operationName, query, variables } = getGraphQLParameters(request);

      const r = await processRequest({
        operationName,
        query,
        variables,
        request,
        execute: proxy.execute,
        parse: proxy.parse,
        validate: proxy.validate,
        contextFactory: initialContext ? () => proxy.contextFactory(initialContext) : proxy.contextFactory,
        schema: proxy.schema,
      });

      return (r as any).payload as ExecutionResult;
    },
    subscribe: async (operation, rawVariables = {}, initialContext = null) => {
      const request = {
        headers: {},
        method: 'POST',
        query: '',
        body: {
          query: typeof operation === 'string' ? operation : print(operation),
          variables: rawVariables,
        },
      };
      const proxy = initRequest();
      const { operationName, query, variables } = getGraphQLParameters(request);

      const r = await processRequest({
        operationName,
        query,
        variables,
        request,
        execute: proxy.execute,
        subscribe: proxy.subscribe,
        parse: proxy.parse,
        validate: proxy.validate,
        contextFactory: initialContext ? () => proxy.contextFactory(initialContext) : proxy.contextFactory,
        schema: proxy.schema,
      });

      if (r.type !== 'PUSH') {
        throw new Error('Did not receive subscription operation.');
      }

      return r;
    },
  };
}

export type SubscriptionInterface = Push<any, any>;
