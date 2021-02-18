import { buildSchema } from 'graphql';
import { getGraphQLParameters, processRequest } from 'graphql-helix';
import { configureServer } from '../src/configure-server';
import { useLogger } from '../src/plugins/use-logger';
import { useSchema } from '../src/plugins/use-schema';
import { useTiming } from '../src/plugins/use-timing';

describe('configureServer', () => {
  it('test', async () => {
    const schema = buildSchema(`type Query { dummy: String }`);
    const executionProxy = await configureServer({
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

    const { operationName, query, variables } = getGraphQLParameters(request);

    const result = await processRequest({
      operationName,
      query,
      variables,
      request,
      ...executionProxy,
    });
  });
});
