import { useSentry } from '@envelop/sentry';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { assertSingleExecutionValue, createTestkit } from '@envelop/testing';
import createSentryTestkit from 'sentry-testkit';
import * as Sentry from '@sentry/node';
import '@sentry/tracing';
import { GraphQLError } from 'graphql';
import { useMaskedErrors } from '@envelop/core';

describe('sentry', () => {
  test('report unexpected error', async () => {
    const { testkit: sentryTestkit, sentryTransport } = createSentryTestkit();
    Sentry.init({
      dsn: 'https://public@sentry.example.com/1',
      transport: sentryTransport,
    });

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          hello: String
        }
      `,
      resolvers: {
        Query: {
          hello: async () => {
            throw new Error('Unexpected Error, ok?');
          },
        },
      },
    });

    const envelopTestkit = createTestkit([useSentry()], schema);
    const result = await envelopTestkit.execute('{ hello }');
    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "hello": null,
        },
        "errors": Array [
          [GraphQLError: Unexpected Error, ok?],
        ],
      }
    `);

    await Sentry.flush();

    const reports = sentryTestkit.reports();
    expect(reports).toHaveLength(1);
    expect(reports[0].error).toMatchObject({
      message: 'Unexpected Error, ok?',
      name: 'Error',
    });
  });

  test('skip reporting expected error', async () => {
    const { testkit: sentryTestkit, sentryTransport } = createSentryTestkit();
    Sentry.init({
      dsn: 'https://public@sentry.example.com/1',
      transport: sentryTransport,
    });

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          hello: String
        }
      `,
      resolvers: {
        Query: {
          hello: () => {
            throw new GraphQLError('Expected Error, ok?');
          },
        },
      },
    });
    const envelopTestkit = createTestkit([useSentry()], schema);
    const result = await envelopTestkit.execute('{ hello }');

    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "hello": null,
        },
        "errors": Array [
          [GraphQLError: Expected Error, ok?],
        ],
      }
    `);

    await Sentry.flush();

    expect(sentryTestkit.reports()).toHaveLength(0);
  });

  test('report unexpected error with masking', async () => {
    const { testkit: sentryTestkit, sentryTransport } = createSentryTestkit();
    Sentry.init({
      dsn: 'https://public@sentry.example.com/1',
      transport: sentryTransport,
    });

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          hello: String
        }
      `,
      resolvers: {
        Query: {
          hello: async () => {
            throw new Error('Unexpected Error, ok?');
          },
        },
      },
    });

    const envelopTestkit = createTestkit([useSentry(), useMaskedErrors()], schema);
    const result = await envelopTestkit.execute('{ hello }');
    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "hello": null,
        },
        "errors": Array [
          [GraphQLError: Unexpected error.],
        ],
      }
    `);

    await Sentry.flush();

    const reports = sentryTestkit.reports();
    expect(reports).toHaveLength(1);
    expect(reports[0].error).toMatchObject({
      message: 'Unexpected Error, ok?',
      name: 'Error',
    });
  });

  test('skip reporting expected error with error masking', async () => {
    const { testkit: sentryTestkit, sentryTransport } = createSentryTestkit();
    Sentry.init({
      dsn: 'https://public@sentry.example.com/1',
      transport: sentryTransport,
    });

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          hello: String
        }
      `,
      resolvers: {
        Query: {
          hello: () => {
            throw new GraphQLError('Expected Error, ok?');
          },
        },
      },
    });
    const envelopTestkit = createTestkit([useSentry(), useMaskedErrors()], schema);
    const result = await envelopTestkit.execute('{ hello }');

    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "hello": null,
        },
        "errors": Array [
          [GraphQLError: Expected Error, ok?],
        ],
      }
    `);

    await Sentry.flush();

    expect(sentryTestkit.reports()).toHaveLength(0);
  });

  test('attaches event id to error', async () => {
    const { sentryTransport } = createSentryTestkit();
    Sentry.init({
      dsn: 'https://public@sentry.example.com/1',
      transport: sentryTransport,
    });

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          hello: String
        }
      `,
      resolvers: {
        Query: {
          hello: () => {
            throw new Error('Unexpected Error, ok?');
          },
        },
      },
    });
    const envelopTestkit = createTestkit([useSentry()], schema);
    const result = await envelopTestkit.execute('{ hello }');

    assertSingleExecutionValue(result);

    expect(result.errors?.[0].extensions).toEqual({
      sentryEventId: expect.any(String),
    });
  });

  test('reports runtime error', async () => {
    const { testkit: sentryTestkit, sentryTransport } = createSentryTestkit();
    Sentry.init({
      dsn: 'https://public@sentry.example.com/1',
      transport: sentryTransport,
    });

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          hello: String!
        }
      `,
      resolvers: {
        Query: {
          hello: async () => {
            return null;
          },
        },
      },
    });

    const envelopTestkit = createTestkit([useSentry()], schema);
    const result = await envelopTestkit.execute('{ hello }');
    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": null,
        "errors": Array [
          [GraphQLError: Cannot return null for non-nullable field Query.hello.],
        ],
      }
    `);

    await Sentry.flush();

    const reports = sentryTestkit.reports();
    expect(reports).toHaveLength(1);
    expect(reports[0].error).toMatchObject({
      message: 'Cannot return null for non-nullable field Query.hello.',
      name: 'Error',
    });
  });
});

test('sets the span in the query context', async () => {
  const { testkit: sentryTestkit, sentryTransport } = createSentryTestkit();
  Sentry.init({
    dsn: 'https://public@sentry.example.com/2',
    transport: sentryTransport,
  });

  // The test verifies that the span is set in the context, which would be
  // available as the third argument
  const schema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        hasSentryInContext: String!
      }
    `,
    resolvers: {
      Query: {
        hasSentryInContext: async (args, info, ctx) => {
          return !!ctx.sentry;
        },
      },
    },
  });

  const envelopTestkit = createTestkit([useSentry()], schema);
  const result = await envelopTestkit.execute('{ hasSentryInContext }');
  expect(result).toMatchInlineSnapshot(`
    Object {
      "data": Object {
        "hasSentryInContext": "true",
      },
    }
  `);

  await Sentry.flush();
});
