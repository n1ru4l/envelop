import { assertSingleExecutionValue, createTestkit, createSpiedPlugin } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';

// import { createInngestClient } from '../src/client';
import { useInngest } from '../src/plugin';

import type { EventPayload, Inngest } from 'inngest';

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

  const spiedPlugin = createSpiedPlugin();

  const mockedInngestClient = {
    send: jest.fn(async payload => {
      console.log('>>>> payload', payload);
      Promise.resolve({ payload });
    }),
    name: 'TEST',
    eventKey: testEventKey,
  } as unknown as Inngest<Record<string, EventPayload>>;

  beforeEach(() => {
    spiedPlugin.reset();
    // mockedInngestClient.send.mockClear();
  });

  afterEach(() => {
    // mockedInngestClient.send.mockClear();
    // mockedInngestClient.send.restoreAllMocks();
    // jest.restoreAllMocks();
  });

  it('sends', async () => {
    const testInstance = createTestkit(
      [useInngest({ inngestClient: mockedInngestClient, includeResultData: false }), spiedPlugin.plugin],
      schema
    );

    const result = await testInstance.execute(`query TestQuery1 { test }`);
    assertSingleExecutionValue(result);

    expect(result.data).toEqual({ test: 'hello' });
    expect(result.errors).toBeUndefined();

    expect(spiedPlugin.spies.beforeExecute).toBeCalled();

    expect(mockedInngestClient.send).toBeCalled();
  });

  it('omits data from event payload', async () => {
    const testInstance = createTestkit(
      [useInngest({ inngestClient: mockedInngestClient, includeResultData: false }), spiedPlugin.plugin],
      schema
    );
    const result = await testInstance.execute(`query TestQuery2 { test }`);

    assertSingleExecutionValue(result);
    expect(result.data).toEqual({ test: 'hello' });
    expect(result.errors).toBeUndefined();

    expect(spiedPlugin.spies.beforeExecute).toBeCalled();
    expect(mockedInngestClient.send).toBeCalled();
  });

  it('skips anonymous operations', async () => {
    const testInstance = createTestkit(
      [useInngest({ inngestClient: mockedInngestClient, allowAnonymousOperations: true }), spiedPlugin.plugin],
      schema
    );
    const result = await testInstance.execute(`query { test }`);

    assertSingleExecutionValue(result);
    expect(result.data).toEqual({ test: 'hello' });
    expect(result.errors).toBeUndefined();

    expect(spiedPlugin.spies.beforeExecute).toBeCalled();

    expect(mockedInngestClient.send).toBeCalled();
  });
});
