import { DocumentNode, ExecutionResult, GraphQLSchema, print } from 'graphql';
import { getGraphQLParameters, processRequest } from 'graphql-helix';
import { configureServer } from '@guildql/server';
import { Plugin, GraphQLServerOptions } from '@guildql/types';

export function createTestkit(
  plugins: Plugin[],
  schema?: GraphQLSchema
): {
  execute: (operation: DocumentNode | string) => Promise<ExecutionResult<any>>;
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
    execute: async operation => {
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
        contextFactory: () => proxy.contextFactory({}),
        schema: proxy.schema,
      });

      return (r as any).payload as ExecutionResult;
    },
  };
}
