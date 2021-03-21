/* eslint-disable no-console */
import { ApolloServer } from 'apollo-server';
import { envelop, useSchema, useTiming } from '@envelop/core';
import { makeExecutableSchema } from '@graphql-tools/schema';

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

const { schema: envelopedSchema, execute, contextFactory } = getEnveloped();

const server = new ApolloServer({
  context: contextFactory,
  schema: envelopedSchema,
  executor: requestContext =>
    execute({
      schema: requestContext.schema,
      document: requestContext.document,
      contextValue: requestContext.context,
      variableValues: requestContext.request.variables,
      operationName: requestContext.operationName,
    }),
});

server.listen(3000);
