/// @ts-check
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { envelop, useSchema, useEngine } = require('../packages/core');
const { useParserCache } = require('../packages/plugins/parser-cache');
const { usePrometheus } = require('../packages/plugins/prometheus');
const { useGraphQlJit } = require('../packages/plugins/graphql-jit');
const { useValidationCache } = require('../packages/plugins/validation-cache');
const { fastify } = require('fastify');
const faker = require('faker');
const { parse, validate, specifiedRules, subscribe, execute } = require('graphql');
const { monitorEventLoopDelay } = require('perf_hooks');
const eventLoopMonitor = monitorEventLoopDelay({ resolution: 20 });

faker.seed(4321);

function generateData() {
  const authors = [];
  for (let i = 0; i < 20; i++) {
    const books = [];

    for (let k = 0; k < 3; k++) {
      books.push({
        id: faker.datatype.uuid(),
        name: faker.internet.domainName(),
        numPages: faker.datatype.number(),
      });
    }

    authors.push({
      id: faker.datatype.uuid(),
      name: faker.name.findName(),
      company: faker.company.bs(),
      books,
    });
  }

  return authors;
}

const data = generateData();

const createSchema = () =>
  makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Author {
        id: ID!
        name: String!
        company: String!
        books: [Book!]!
      }

      type Book {
        id: ID!
        name: String!
        numPages: Int!
      }

      type Query {
        authors: [Author!]!
      }
    `,
    resolvers: {
      Author: {},
      Query: {
        authors: () => data,
      },
    },
  });

const envelopsMap = {
  'graphql-js': envelop({
    plugins: [useEngine({ parse, validate, specifiedRules, execute, subscribe }), useSchema(createSchema())],
    enableInternalTracing: true,
  }),
  'envelop-just-cache': envelop({
    plugins: [
      useEngine({ parse, validate, specifiedRules, execute, subscribe }),
      useSchema(createSchema()),
      useParserCache(),
      useValidationCache(),
    ],
    enableInternalTracing: true,
  }),
  'envelop-cache-and-no-internal-tracing': envelop({
    plugins: [
      useEngine({ parse, validate, specifiedRules, execute, subscribe }),
      useSchema(createSchema()),
      useParserCache(),
      useValidationCache(),
    ],
  }),
  'envelop-cache-jit': envelop({
    plugins: [
      useEngine({ parse, validate, specifiedRules, execute, subscribe }),
      useSchema(createSchema()),
      useGraphQlJit(),
      useParserCache(),
      useValidationCache(),
    ],
    enableInternalTracing: true,
  }),
  'prom-tracing': envelop({
    plugins: [
      useEngine({ parse, validate, specifiedRules, execute, subscribe }),
      useSchema(createSchema()),
      useParserCache(),
      useValidationCache(),
      usePrometheus({
        contextBuilding: true,
        deprecatedFields: true,
        errors: true,
        execute: true,
        parse: true,
        resolvers: true,
        validate: true,
      }),
    ],
    enableInternalTracing: true,
  }),
};

const app = fastify();

app.route({
  method: 'POST',
  url: '/graphql',
  async handler(req, res) {
    try {
      eventLoopMonitor.enable();
      const getEnveloped = envelopsMap[req.headers['x-test-scenario']];
      const proxy = getEnveloped({ req });
      const document = proxy.parse(req.body.query);
      const errors = proxy.validate(proxy.schema, document);

      if (errors.length) {
        res.send({ errors });
        return;
      }

      const result = await proxy.execute({
        schema: proxy.schema,
        operationName: req.body.operationName,
        document,
        variableValues: req.body.variable,
        contextValue: await proxy.contextFactory(),
      });
      eventLoopMonitor.disable();

      result.extensions = {
        ...(result.extensions || {}),
        eventLoopLag: eventLoopMonitor.max,
      };

      eventLoopMonitor.reset();

      res.status(200).send(result);
    } catch (error) {
      console.error(error);
      res.status(500).send(error);
    }
  },
});

app.listen(3000, (error, address) => {
  if (error) {
    console.error(error);
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.log(`GraphQL Test Server is running... Ready for K6! - ${address}`);
});
