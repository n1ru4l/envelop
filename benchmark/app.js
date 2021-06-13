/// @ts-check
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { envelop, useSchema, useExtendContext } = require('../packages/core/dist');
const { useParserCache } = require('../packages/plugins/parser-cache/dist');
const { useValidationCache } = require('../packages/plugins/validation-cache/dist');
const { fastify } = require('fastify');
const { getGraphQLParameters, processRequest } = require('graphql-helix');

const HR_TO_NS = 1e9;
const NS_TO_MS = 1e6;

const deltaFrom = hrtime => {
  const delta = process.hrtime(hrtime);
  const ns = delta[0] * HR_TO_NS + delta[1];

  return ns / NS_TO_MS;
};

let count = 0;

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
    {
      onParse() {
        const hrtime = process.hrtime();

        return ({ extendContext }) => {
          const time = deltaFrom(hrtime);

          extendContext({
            k6_parse: time,
          });
        };
      },
      onValidate() {
        const hrtime = process.hrtime();

        return ({ extendContext }) => {
          const time = deltaFrom(hrtime);

          extendContext({
            k6_validate: time,
          });
        };
      },
      onContextBuilding() {
        const hrtime = process.hrtime();

        return ({ extendContext }) => {
          const time = deltaFrom(hrtime);

          extendContext({
            k6_context: time,
          });
        };
      },
      onExecute({ args }) {
        const hrtime = process.hrtime();

        return {
          onExecuteDone: ({ result }) => {
            result.extensions = {
              k6_execute: deltaFrom(hrtime),
              ...(args.contextValue || {}),
            };
          },
        };
      },
    },
    useParserCache(),
    useValidationCache(),
  ],
});
const app = fastify();

app.route({
  method: ['GET', 'POST'],
  url: '/graphql',
  async handler(req, res) {
    const sharedObj = {};
    const { parse, validate, contextFactory, execute, schema } = getEnveloped(sharedObj);
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
  },
});

app.listen(5000, () => {
  // eslint-disable-next-line no-console
  console.log(`GraphQL server is running.`);
});
