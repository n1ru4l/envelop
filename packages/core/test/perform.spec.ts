import { parse, validate, execute, subscribe } from 'graphql';
import { envelop, useSchema } from '../src/index.js';
import { assertSingleExecutionValue, assertStreamExecutionValue } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';

const graphqlFuncs = { parse, validate, execute, subscribe };

const greetings = ['Hello', 'Bonjour', 'Ciao'];
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
      hello() {
        return 'world';
      },
    },
    Subscription: {
      greetings: {
        async *subscribe() {
          for (const greet of greetings) {
            yield { greetings: greet };
          }
        },
      },
    },
  },
});

describe('perform', () => {
  it('should parse, validate, assemble context and execute', async () => {
    const getEnveloped = envelop({ ...graphqlFuncs, plugins: [useSchema(schema)] });

    const { perform } = getEnveloped();

    const result = await perform({ query: '{ hello }' });
    assertSingleExecutionValue(result);

    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "hello": "world",
        },
      }
    `);
  });

  it('should parse, validate, assemble context and subscribe', async () => {
    const getEnveloped = envelop({ ...graphqlFuncs, plugins: [useSchema(schema)] });

    const { perform } = getEnveloped();

    const result = await perform({ query: 'subscription { greetings }' });
    assertStreamExecutionValue(result);

    let i = 0;
    for await (const part of result) {
      expect(part).toEqual({
        data: {
          greetings: greetings[i],
        },
      });
      i++;
    }
  });

  it('should include parsing errors in result', async () => {
    const getEnveloped = envelop({ ...graphqlFuncs, plugins: [useSchema(schema)] });

    const { perform } = getEnveloped();

    const result = await perform({ query: '{' });
    assertSingleExecutionValue(result);

    expect(result).toMatchInlineSnapshot(`
      Object {
        "errors": Array [
          [GraphQLError: Syntax Error: Expected Name, found <EOF>.],
        ],
      }
    `);
  });

  it('should include validation errors in result', async () => {
    const getEnveloped = envelop({ ...graphqlFuncs, plugins: [useSchema(schema)] });

    const { perform } = getEnveloped();

    const result = await perform({ query: '{ idontexist }' });
    assertSingleExecutionValue(result);

    expect(result).toMatchInlineSnapshot(`
      Object {
        "errors": Array [
          [GraphQLError: Cannot query field "idontexist" on type "Query".],
        ],
      }
    `);
  });
});
