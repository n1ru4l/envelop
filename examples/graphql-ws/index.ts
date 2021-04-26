import { envelop, useSchema, useLogger, useTiming } from '@envelop/core';
import { makeExecutableSchema } from '@graphql-tools/schema';
import ws from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';

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
      greetings: function* sayHiIn5Languages() {
        for (const hi of ['Hi', 'Bonjour', 'Hola', 'Ciao', 'Zdravo']) {
          yield { greetings: hi };
        }
      },
    },
  },
});

const getEnveloped = envelop({
  plugins: [useSchema(schema), useLogger(), useTiming()],
});

const { execute, subscribe, parse, validate, contextFactory } = getEnveloped();

useServer(
  {
    execute,
    subscribe,
    onSubscribe: (ctx, msg) => {
      const { schema } = getEnveloped();

      const args = {
        schema,
        operationName: msg.payload.operationName,
        document: parse(msg.payload.query),
        variableValues: msg.payload.variables,
        contextValue: contextFactory({
          connectionParams: ctx.connectionParams,
          socket: ctx.extra.socket,
          request: ctx.extra.request,
        }),
      };

      const errors = validate(args.schema, args.document);
      if (errors.length) return errors;

      return args;
    },
  },
  new ws.Server({
    port: 3415,
    path: '/graphql',
  })
);
