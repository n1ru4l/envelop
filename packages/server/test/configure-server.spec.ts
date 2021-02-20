import { buildSchema } from 'graphql';
import { getGraphQLParameters, processRequest } from 'graphql-helix';
import { useTiming, useSchema, useLogger, configureServer } from '../src';

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
