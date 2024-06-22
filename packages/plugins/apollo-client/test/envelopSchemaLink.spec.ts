import * as graphqlJs from 'graphql';
import { ApolloClient, gql, InMemoryCache } from '@apollo/client';
import { envelop, useEngine, useLogger, useSchema } from '@envelop/core';
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
    let logMock = jest.fn();

    let getEnveloped = envelop({
      plugins: [
        useEngine(graphqlJs),
        useSchema(schema),
        useLogger({
          logFn(eventName, args) {
            logMock(eventName, args);
          },
        }),
      ],
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

    let mockCallResult = logMock.mock.calls[1][1].result;

    expect(mockCallResult.data.hello).toEqual('world');
  });
});
