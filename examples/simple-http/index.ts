import { createServer } from 'http';
import { envelop, useLogger, useSchema } from '@envelop/core';
import { parse, validate, execute, subscribe } from 'graphql';
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
  parse,
  validate,
  execute,
  subscribe,
  plugins: [useSchema(schema), useLogger()],
});

const server = createServer((req, res) => {
  const { perform } = getEnveloped({ req });
  let payload = '';

  req.on('data', chunk => {
    payload += chunk.toString();
  });

  req.on('end', async () => {
    const { query, variables } = JSON.parse(payload);

    const result = await perform({ query, variables });

    res.end(JSON.stringify(result));
  });
});

server.listen(3000);
