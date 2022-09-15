import { envelop, useLogger, useSchema } from '@envelop/core';
import { parse, validate, execute, subscribe } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import express from 'express';
import { graphqlHTTP } from 'express-graphql';

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
  parse,
  validate,
  execute,
  subscribe,
  plugins: [useSchema(schema), useLogger()],
});

const app = express();

app.use(
  '/graphql',
  graphqlHTTP(async (req, res) => {
    const { parse, validate, contextFactory, execute } = getEnveloped({ req, res });
    return {
      schema,
      graphiql: true,
      customParseFn: parse,
      customValidateFn: validate,
      customExecuteFn: async args => {
        return execute({
          ...args,
          contextValue: await contextFactory(),
        });
      },
    };
  })
);

app.listen(4000);
