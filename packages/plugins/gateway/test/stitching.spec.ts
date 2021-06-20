import { makeExecutableSchema } from '@graphql-tools/schema';
import { GraphQLSchema } from 'graphql';
import { createServer } from 'http';
import { createStitchingOrchestrator, endpoint, pollingProbe, useGateway } from '../src';
import { envelop, useSchema } from '@envelop/core';

describe('Stitching Loader', () => {
  const startService = async (initialSchema: GraphQLSchema, port: number) => {
    return new Promise<{
      stop: () => void;
      changeSchema: (schema: GraphQLSchema) => void;
    }>(resolve => {
      const getEnvelped = envelop({
        plugins: [useSchema(initialSchema)],
      });

      let schemaOverride: GraphQLSchema | undefined;

      const server = createServer(async (req, res) => {
        const { schema, parse, validate, execute } = getEnvelped({ req });
        let data = '';

        req.on('data', chunk => {
          data += chunk;
        });

        req.on('end', async () => {
          const { query, operationName = undefined, variables = {} } = JSON.parse(data);
          const document = parse(query);
          const errors = validate(schemaOverride || schema, document);

          res.setHeader('Content-Type', 'application/json');

          if (errors.length > 0) {
            res.end(JSON.stringify({ errors }));
            return;
          }

          console.log('running on child', query, schemaOverride);

          const result = await execute({
            schema: schemaOverride || schema,
            document,
            contextValue: {},
            operationName,
            variableValues: variables,
          });

          res.end(JSON.stringify(result));
        });
      });

      server.listen(port, () => {
        resolve({
          stop: () => server.close(),
          changeSchema: (override: GraphQLSchema) => {
            schemaOverride = override;
          },
        });
      });
    });
  };

  let disposables: any[] = [];

  beforeEach(() => {
    jest.useFakeTimers();
    disposables = [];
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();

    for (const d of disposables) {
      d();
    }
  });

  it('test', async () => {
    const svc1 = await startService(
      makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            ping: String
          }
        `,
        resolvers: {
          Query: {
            ping: () => 'pong',
          },
        },
      }),
      5001
    );

    const svc2 = await startService(
      makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            pong: String
          }
        `,
        resolvers: {
          Query: {
            pong: () => 'ping',
          },
        },
      }),
      5002
    );

    disposables.push(svc1.stop, svc2.stop);

    const orchestrator = createStitchingOrchestrator({
      services: [
        {
          name: 'service-a',
          loader: endpoint({ url: 'http://localhost:5001/graphql' }),
          reloadProbe: pollingProbe({ interval: 5000 }),
        },
        {
          name: 'service-b',
          loader: endpoint({ url: 'http://localhost:5002/graphql' }),
          // reloadProbe: pollingProbe({ interval: 1000 }),
        },
      ],
    });

    const getEnveloped = envelop({
      plugins: [useGateway({ orchestrator })],
    });

    await orchestrator.start();

    const runQuery = async (query: string) => {
      const { schema, parse, execute } = getEnveloped();

      console.log(schema.getQueryType()?.getFields());

      const result = await execute({
        schema,
        document: parse(query),
      });

      console.log('Query result', JSON.stringify(result, null, 2));

      return result;
    };

    const result = await runQuery(`query { ping pong }`);

    expect(result.data).toEqual({
      ping: 'pong',
      pong: 'ping',
    });

    svc1.changeSchema(
      makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            flip: String
          }
        `,
        resolvers: {
          Query: {
            flip: () => 'flop',
          },
        },
      })
    );

    svc2.changeSchema(
      makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            flop: String
          }
        `,
        resolvers: {
          Query: {
            flop: () => 'flip',
          },
        },
      })
    );

    jest.runAllTimers();

    const result2 = await runQuery(`query { flip flop }`);

    expect(result2.data).toEqual({
      flip: 'flop',
      flop: 'flip',
    });
  });
});
