/* eslint-disable no-console */
import 'reflect-metadata';
import fastify from 'fastify';
import { envelop, useLogger, useSchema, useTiming } from '@envelop/core';
import { getGraphQLParameters, processRequest, renderGraphiQL, shouldRenderGraphiQL } from 'graphql-helix';
import { arg, enumType, intArg, interfaceType, makeSchema, objectType, queryType, stringArg, list } from 'nexus';

const Node = interfaceType({
  name: 'Node',
  definition(t) {
    t.id('id', { description: 'Unique identifier for the resource' });
  },
});
const Account = objectType({
  name: 'Account',
  isTypeOf(source) {
    return 'email' in source;
  },
  definition(t) {
    t.implements(Node); // or t.implements("Node")
    t.string('username');
    t.string('email');
  },
});
const StatusEnum = enumType({
  name: 'StatusEnum',
  members: ['ACTIVE', 'DISABLED'],
});
const Query = queryType({
  definition(t) {
    t.field('account', {
      type: Account, // or "Account"
      args: {
        name: stringArg(),
        status: arg({ type: 'StatusEnum' }),
      },
      resolve: () => ({ id: 1, username: 'test', email: 'test@mail.com' }),
    });
    t.field('accountsById', {
      type: list(Account), // or "Account"
      args: {
        ids: list(intArg()),
      },
      resolve: () => [{ id: 1, username: 'test', email: 'test@mail.com' }],
    });
  },
});

const schema = makeSchema({
  types: [Account, Node, Query, StatusEnum],
});

const getEnveloped = envelop({
  plugins: [useSchema(schema), useLogger(), useTiming()],
});

const app = fastify();

app.route({
  method: ['GET', 'POST'],
  url: '/graphql',
  async handler(req, res) {
    const { parse, validate, contextFactory, execute, schema } = getEnveloped({ req });
    const request = {
      body: req.body,
      headers: req.headers,
      method: req.method,
      query: req.query,
    };

    if (shouldRenderGraphiQL(request)) {
      res.type('text/html');
      res.send(renderGraphiQL({}));
    } else {
      const { operationName, query, variables } = getGraphQLParameters(request);
      const result = await processRequest({
        operationName,
        query,
        variables,
        request,
        schema,
        parse,
        validate,
        execute,
        contextFactory,
      });

      if (result.type === 'RESPONSE') {
        res.status(result.status);
        res.send(result.payload);
      } else {
        // You can find a complete example with GraphQL Subscriptions and stream/defer here:
        // https://github.com/contrawork/graphql-helix/blob/master/examples/fastify/server.ts
        res.send({ errors: [{ message: 'Not Supported in this demo' }] });
      }
    }
  },
});

app.listen(3000, () => {
  console.log(`GraphQL server is running.`);
});
