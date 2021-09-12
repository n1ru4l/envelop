import { useOperationComplexity } from '../src/use-operation-complexity';
import { assertSingleExecutionValue, createTestkit } from '@envelop/testing';
import { buildSchema } from 'graphql';
import { useSchema } from '@envelop/core';
import { createInMemoryOperationComplexityStore } from '../src';

const schema = buildSchema(/* GraphQL */ `
  type Query {
    user(id: ID!): User
  }

  type User {
    id: ID!
  }
`);

describe('useOperationComplexity', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });
  it('allows execution if the document cost is within limit', async () => {
    const testkit = createTestkit([
      useSchema(schema),
      useOperationComplexity({
        maximumPoints: 1,
      }),
    ]);

    const result = await testkit.execute(/* GraphQL */ `
      query {
        user1: user(id: "1") {
          id
        }
      }
    `);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeUndefined();
  });
  it('prevents execution if the document cost exceeds the cost', async () => {
    const testkit = createTestkit([
      useSchema(schema),
      useOperationComplexity({
        maximumPoints: 1,
      }),
    ]);

    const result = await testkit.execute(/* GraphQL */ `
      query {
        user1: user(id: "1") {
          id
        }
        user2: user(id: "1") {
          id
        }
      }
    `);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeDefined();
    expect(result.errors).toHaveLength(1);
    const [error] = result.errors!;
    expect(error.message).toMatchInlineSnapshot(`"Operation complexity exceeds the limit."`);
  });
  it('allows rate-limiting with provided store', async () => {
    jest.useFakeTimers();
    const store = createInMemoryOperationComplexityStore();
    const testkit = createTestkit([
      useSchema(schema),
      useOperationComplexity({
        maximumPoints: 2,
        rateLimit: {
          store,
          identify: (context: any) => context.id,
        },
      }),
    ]);

    const operation = /* GraphQL */ `
      query {
        user1: user(id: "1") {
          id
        }
      }
    `;
    const context = { id: 'abc' };

    let result = await testkit.execute(operation, undefined, context);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeUndefined();
    expect(store.get(context.id)).toEqual(1);
    result = await testkit.execute(operation, undefined, context);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeUndefined();
    expect(store.get(context.id)).toEqual(2);
    result = await testkit.execute(operation, undefined, context);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeDefined();
    expect(store.get(context.id)).toEqual(2);
    jest.runAllTimers();
    result = await testkit.execute(operation, undefined, context);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeUndefined();
  });
});
