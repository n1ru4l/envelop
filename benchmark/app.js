/// @ts-check
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { envelop, useSchema, useExtendContext } = require('../packages/core');
const { useParserCache } = require('../packages/plugins/parser-cache');
const { useGraphQlJit } = require('../packages/plugins/graphql-jit');
const { useValidationCache } = require('../packages/plugins/validation-cache');
const { fastify } = require('fastify');
const { getGraphQLParameters, processRequest } = require('graphql-helix');

const schema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      me: User!
    }

    type User {
      id: ID!
    }
  `,
  resolvers: {
    Query: {
      me: () => ({
        _id: '1',
      }),
    },
    User: {
      id: obj => obj._id,
    },
  },
});

const getEnveloped = envelop({
  plugins: [
    useSchema(schema),
    useGraphQlJit(),
    useParserCache(),
    useValidationCache(),
    useExtendContext(() => {
      return {
        customContext: 'test',
      };
    }),
  ],
  enableInternalTracing: true,
});
const app = fastify();

app.route({
  method: ['GET', 'POST'],
  url: '/graphql',
  async handler(req, res) {
    const proxy = getEnveloped({ req });
    const request = {
      body: req.body,
      headers: req.headers,
      method: req.method,
      query: req.query,
    };

    const { operationName, query, variables } = getGraphQLParameters(request);
    const result = await processRequest({
      operationName,
      query,
      variables,
      request,
      schema,
      parse: proxy.parse,
      validate: proxy.validate,
      execute: proxy.execute,
      contextFactory: proxy.contextFactory,
    });

    if (result.type === 'RESPONSE') {
      res.status(result.status);
      res.send(result.payload);
    } else {
      // You can find a complete example with GraphQL Subscriptions and stream/defer here:
      // https://github.com/contrawork/graphql-helix/blob/master/examples/fastify/server.ts
      res.send({ errors: [{ message: 'Not Supported in this demo' }] });
    }
  },
});

app.listen(5000, () => {
  // eslint-disable-next-line no-console
  console.log(`GraphQL server is running.`);
});
