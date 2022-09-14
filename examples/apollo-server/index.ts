/* eslint-disable no-console */
import { ApolloServer } from 'apollo-server';
import { envelop, isAsyncIterable, useSchema, useTiming } from '@envelop/core';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { ApolloServerPluginLandingPageGraphQLPlayground } from 'apollo-server-core';

const schema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      hello: String!
    }
  `,
  resolvers: {
    Query: {
      hello: () => 'World',
    },
  },
});

const getEnveloped = envelop({
  plugins: [useSchema(schema), useTiming()],
});

const server = new ApolloServer({
  schema,
  executor: async requestContext => {
    const { perform } = getEnveloped({ req: requestContext.request.http });
    const result = await perform(requestContext.request);
    if (isAsyncIterable(result)) {
      throw new Error('Unsupported streaming result');
    }
    return result;
  },
  plugins: [ApolloServerPluginLandingPageGraphQLPlayground({ endpoint: '/graphql' })],
});

server.listen(3000);
