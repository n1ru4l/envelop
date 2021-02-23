import { buildSchema } from 'graphql';
import { getGraphQLParameters, processRequest } from 'graphql-helix';
import { useTiming, useSchema, useLogger, configureServer } from '../src';

describe('configureServer', () => {
  it('test', async () => {
    const schema = buildSchema(`type Query { dummy: String }`);
    const requestInit = configureServer({
      plugins: [useSchema(schema), useTiming(), useLogger()],
    });

    const request = {
      headers: {},
      method: 'POST',
      query: '',
      body: {
        query: `query test { dummy }`,
      },
    };

    const proxy = requestInit(request);
    const { operationName, query, variables } = getGraphQLParameters(request);

    await processRequest({
      operationName,
      query,
      variables,
      request,
      execute: proxy.execute,
      parse: proxy.parse,
      validate: proxy.validate,
      contextFactory: proxy.contextFactory,
      schema: proxy.schema,
    });

    proxy.dispose();
  });
});
