/* eslint-disable no-console */
import { ApolloServer } from 'apollo-server';
import { envelop, useSchema, useTiming } from '@envelop/core';
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
    const { schema, execute, contextFactory } = getEnveloped({ req: requestContext.request.http });

    return execute({
      schema: schema,
      document: requestContext.document,
      contextValue: await contextFactory(),
      variableValues: requestContext.request.variables,
      operationName: requestContext.operationName,
    });
  },
  plugins: [ApolloServerPluginLandingPageGraphQLPlayground({ endpoint: '/graphql' })],
});

server.listen(3000);
