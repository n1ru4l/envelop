import { envelop, useLogger, useSchema, useTiming } from '@envelop/core';
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
  plugins: [useSchema(schema), useLogger(), useTiming()],
});

const app = express();

/**
 * Because all functions are executed in sync order within express-graphql,
 * we can use this hack for ensuring the same scope across all three functions.
 * @source https://github.com/graphql/express-graphql/blob/f4414b44996f25a5328e523d9a4b213fd1d70b16/src/index.ts#L267-L323
 */
let latestEnvelop: ReturnType<typeof getEnveloped>;

app.use(
  '/graphql',
  graphqlHTTP({
    schema,
    graphiql: true,
    customParseFn: source => {
      latestEnvelop = getEnveloped();
      return latestEnvelop.parse(source);
    },
    customValidateFn: (...args) => {
      return latestEnvelop.validate(...args);
    },
    customExecuteFn: async args => {
      const { execute, contextFactory } = latestEnvelop;
      return execute({
        ...args,
        contextValue: await contextFactory(),
      });
    },
  })
);

app.listen(4000);
