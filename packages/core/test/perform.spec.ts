import { parse, validate, execute, subscribe, GraphQLError } from 'graphql';
import { envelop, OnPerformDoneHook, OnPerformHook, useSchema } from '../src/index.js';
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

  it('should include thrown validation errors in result', async () => {
    const getEnveloped = envelop({
      ...graphqlFuncs,
      plugins: [
        useSchema(schema),
        {
          onValidate: ({ addValidationRule }) => {
            addValidationRule(() => {
              throw new GraphQLError('Invalid!');
            });
          },
        },
      ],
    });

    const { perform } = getEnveloped();

    const result = await perform({ query: '{ hello }' });
    assertSingleExecutionValue(result);

    expect(result).toMatchInlineSnapshot(`
      Object {
        "errors": Array [
          [GraphQLError: Invalid!],
        ],
      }
    `);
  });

  it('should invoke onPerform plugin hooks', async () => {
    const onPerformDoneFn = jest.fn((() => {
      // noop
    }) as OnPerformDoneHook<any>);
    const onPerformFn = jest.fn((() => ({
      onPerformDone: onPerformDoneFn,
    })) as OnPerformHook<any>);

    const getEnveloped = envelop({
      ...graphqlFuncs,
      plugins: [
        useSchema(schema),
        {
          onPerform: onPerformFn,
        },
      ],
    });

    const params = { query: '{ hello }' };
    const { perform } = getEnveloped({ initial: 'context' });
    await perform(params, { extension: 'context' });

    expect(onPerformFn).toBeCalled();
    expect(onPerformFn.mock.calls[0][0].context).toEqual({ initial: 'context' });
    expect(onPerformFn.mock.calls[0][0].params).toBe(params);

    expect(onPerformDoneFn).toBeCalled();
    expect(onPerformDoneFn.mock.calls[0][0].context).toEqual({ initial: 'context', extension: 'context' });
    expect(onPerformDoneFn.mock.calls[0][0].result).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "hello": "world",
        },
      }
    `);
  });

  it('should replace params in onPerform plugin', async () => {
    const getEnveloped = envelop({
      ...graphqlFuncs,
      plugins: [
        useSchema(schema),
        {
          onPerform: ({ setParams }) => {
            setParams({ query: '{ hello }' });
          },
        },
      ],
    });

    const { perform } = getEnveloped();
    const result = await perform({ query: 'subscribe { greetings }' });
    assertSingleExecutionValue(result);

    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "hello": "world",
        },
      }
    `);
  });

  it('should replace result in onPerformDone plugin', async () => {
    const replacedResult = { data: { something: 'else' } };

    const getEnveloped = envelop({
      ...graphqlFuncs,
      plugins: [
        useSchema(schema),
        {
          onPerform: () => ({
            onPerformDone: ({ setResult }) => {
              setResult(replacedResult);
            },
          }),
        },
      ],
    });

    const { perform } = getEnveloped();
    const result = await perform({ query: '{ hello }' });
    assertSingleExecutionValue(result);

    expect(result).toBe(replacedResult);
  });

  it('should early result in onPerform plugin', async () => {
    const earlyResult = { data: { hi: 'hello' } };

    const getEnveloped = envelop({
      ...graphqlFuncs,
      plugins: [
        useSchema(schema),
        {
          onPerform: ({ setResult }) => {
            setResult(earlyResult);
          },
        },
      ],
    });

    const { perform } = getEnveloped();
    const result = await perform({ query: '{ hello }' });
    assertSingleExecutionValue(result);

    expect(result).toBe(earlyResult);
  });

  it('should provide result with parsing errors to onPerformDone hook', async () => {
    const onPerformDoneFn = jest.fn((() => {
      // noop
    }) as OnPerformDoneHook<any>);

    const getEnveloped = envelop({
      ...graphqlFuncs,
      plugins: [
        useSchema(schema),
        {
          onPerform: () => ({
            onPerformDone: onPerformDoneFn,
          }),
        },
      ],
    });

    const { perform } = getEnveloped();
    await perform({ query: '{' });

    expect(onPerformDoneFn).toBeCalled();
    expect(onPerformDoneFn.mock.calls[0][0].result).toMatchInlineSnapshot(`
      Object {
        "errors": Array [
          [GraphQLError: Syntax Error: Expected Name, found <EOF>.],
        ],
      }
    `);
  });
});
