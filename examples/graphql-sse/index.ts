import http from 'http';
import { envelop, useSchema, useLogger, useTiming } from '@envelop/core';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createHandler } from 'graphql-sse';

const schema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      hello: String!
    }
    type Subscription {
      greetings: String!
    }
  `,
  resolvers: {
    Query: {
      hello: () => 'Hello World!',
    },
    Subscription: {
      greetings: {
        subscribe: async function* sayHiIn5Languages() {
          for (const hi of ['Hi', 'Bonjour', 'Hola', 'Ciao', 'Zdravo']) {
            yield { greetings: hi };
            await new Promise(resolve => setTimeout(resolve, 1000)); // wait 1 second
          }
        },
      },
    },
  },
});

const getEnveloped = envelop({
  plugins: [useSchema(schema), useLogger(), useTiming()],
});

const { execute, subscribe, validate } = getEnveloped();

const handler = createHandler({
  execute,
  subscribe,
  validate,
  onSubscribe: async (req, _res, params) => {
    const { schema, parse, contextFactory } = getEnveloped({ req });
    return {
      schema,
      operationName: params.operationName,
      document: parse(params.query),
      variableValues: params.variables,
      contextValue: await contextFactory(req),
    };
  },
});

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/graphql/stream')) return handler(req, res);
  return res.writeHead(404).end();
});

server.listen(3415);
console.log('Listening to port 3415');
