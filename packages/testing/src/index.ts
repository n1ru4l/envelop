import { DocumentNode, ExecutionResult, GraphQLSchema, print } from 'graphql';
import { getGraphQLParameters, processRequest } from 'graphql-helix';
import { configureServer } from '@guildql/server';
import { EventsHandler, PluginFn, ServerProxy } from '@guildql/types';

export async function createTestkit(
  schema: GraphQLSchema,
  plugins: PluginFn[]
): Promise<{
  emitter: EventsHandler;
  onSpy: jest.SpyInstance;
  proxy: ServerProxy;
  execute: (operation: DocumentNode | string) => Promise<ExecutionResult<any>>;
  replaceSchema: (schema: GraphQLSchema) => void;
  wait: (ms: number) => Promise<void>;
}> {
  const emitter = new EventsHandler();
  const onSpy = jest.spyOn(emitter, 'on');
  let replaceSchema: (s: GraphQLSchema) => void;

  const replaceSchemaPlugin: PluginFn = api => {
    api.on('onInit', support => {
      replaceSchema = support.replaceSchema;
    });
  };

  const executionProxy = await configureServer({
    plugins: [replaceSchemaPlugin, ...plugins],
    emitter,
    initialSchema: schema,
  });

  return {
    emitter,
    wait: ms => new Promise(resolve => setTimeout(resolve, ms)),
    onSpy,
    proxy: executionProxy,
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

      const { operationName, query, variables } = getGraphQLParameters(request);

      const r = await processRequest({
        operationName,
        query,
        variables,
        request,
        ...executionProxy,
      });

      return (r as any).payload as ExecutionResult;
    },
  };
}
