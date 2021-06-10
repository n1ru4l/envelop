import { useLiveQuery } from '../src';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { InMemoryLiveQueryStore } from '@n1ru4l/in-memory-live-query-store';
import { createTestkit } from '@envelop/testing';
import { parse } from 'graphql';

const schema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      greetings: [String!]
    }
  `,
  resolvers: {
    Query: {
      greetings: (_: unknown, __: unknown, context) => context.greetings,
    },
  },
});

function assertAsyncIterable(input: object): asserts input is AsyncIterableIterator<any> {
  if (Symbol.asyncIterator in input) {
    return;
  }
  throw new Error('Expected AsyncIterableIterator.');
}

describe('useLiveQuery', () => {
  it('works with simple schema', async () => {
    const liveQueryStore = new InMemoryLiveQueryStore();
    const testKit = createTestkit([useLiveQuery({ liveQueryStore })], schema);
    const contextValue = {
      greetings: ['Hi', 'Sup', 'Ola'],
    };
    const result = await testKit.executeRaw({
      schema,
      contextValue,
      document: parse(/* GraphQL */ `
        query @live {
          greetings
        }
      `),
    });
    assertAsyncIterable(result);
    let current = await result.next();
    expect(current.value).toMatchInlineSnapshot(`
Object {
  "data": Object {
    "greetings": Array [
      "Hi",
      "Sup",
      "Ola",
    ],
  },
  "isLive": true,
}
`);
    contextValue.greetings.reverse();
    liveQueryStore.invalidate('Query.greetings');
    current = await result.next();
    expect(current.value).toMatchInlineSnapshot(`
Object {
  "data": Object {
    "greetings": Array [
      "Ola",
      "Sup",
      "Hi",
    ],
  },
  "isLive": true,
}
`);
    result.return?.();
  });
});
