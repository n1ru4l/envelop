import { assertSingleExecutionValue, createTestkit } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';

import { useInngest } from '../src/index';

describe('useInngest', () => {
  const testEventKey = 'foo-bar-baz-test';

  const schema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        test: String!
      }
    `,
    resolvers: {
      Query: {
        test: () => 'hello',
      },
    },
  });

  const originalFetch = global.fetch;

  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    global.fetch = jest.fn(() =>
      Promise.resolve({
        status: 200,
        json: () => Promise.resolve({}),
      })
    ) as any;
  });

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    (global.fetch as any).mockClear();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('', async () => {
    const testInstance = createTestkit(
      [useInngest({ inngestClient: { name: 'TEST', eventKey: testEventKey } })],
      schema
    );
    const result = await testInstance.execute(`query { test }`);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeUndefined();
  });
});
