import { DocumentNode, ExecutionResult, GraphQLSchema, print } from 'graphql';
import { getGraphQLParameters, processRequest } from 'graphql-helix';
import { configureServer } from '@guildql/server';
import { Plugin } from '@guildql/types';

export function createSpiedPlugin() {
  const afterResolver = jest.fn();

  const baseSpies = {
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
      onParse: spies.beforeParse,
      onValidate: spies.beforeValidate,
      onExecute: spies.beforeExecute,
      onContextBuilding: spies.beforeContextBuilding,
    },
  };
}

export function createTestkit(
  plugins: Plugin[],
  schema?: GraphQLSchema
): {
  execute: (operation: DocumentNode | string, initialContext?: any) => Promise<ExecutionResult<any>>;
  replaceSchema: (schema: GraphQLSchema) => void;
  wait: (ms: number) => Promise<void>;
} {
  let replaceSchema: (s: GraphQLSchema) => void;

  const replaceSchemaPlugin: Plugin = {
    onPluginInit({ setSchema }) {
      replaceSchema = setSchema;
    },
  };

  const initRequest = configureServer({
    plugins: [replaceSchemaPlugin, ...plugins],
    initialSchema: schema,
  });

  return {
    wait: ms => new Promise(resolve => setTimeout(resolve, ms)),
    replaceSchema,
    execute: async (operation, initialContext = null) => {
      const request = {
        headers: {},
        method: 'POST',
        query: '',
        body: {
          query: typeof operation === 'string' ? operation : print(operation),
        },
      };
      const proxy = initRequest({ request });
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
  };
}
