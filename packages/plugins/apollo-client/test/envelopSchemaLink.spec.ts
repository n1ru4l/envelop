import * as graphqlJs from 'graphql';
import { ApolloClient, gql, InMemoryCache } from '@apollo/client';
import { envelop, Plugin, useEngine, useSchema } from '@envelop/core';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { EnvelopSchemaLink } from '../src';

describe('EnvelopSchemaLink', () => {
  let schema = makeExecutableSchema({
    typeDefs: `type Query { hello: String! }`,
    resolvers: {
      Query: {
        hello: () => 'world',
      },
    },
  });

  it('plugin function gets called when querying Apollo', async () => {
    let onResult = jest.fn();

    let testPlugin: Plugin = {
      onExecute() {
        return {
          onExecuteDone({ result }) {
            onResult(result);
          },
        };
      },
    };

    let getEnveloped = envelop({
      plugins: [useEngine(graphqlJs), useSchema(schema), testPlugin],
    });

    let envelope = getEnveloped();

    let apollo = new ApolloClient({
      cache: new InMemoryCache(),
      link: new EnvelopSchemaLink(envelope),
    });

    let query = gql`
      query {
        hello
      }
    `;

    await apollo.query({
      query,
    });

    let mockResult = onResult.mock.calls[0][0];
    expect(mockResult.data.hello).toEqual('world');
  });
});
