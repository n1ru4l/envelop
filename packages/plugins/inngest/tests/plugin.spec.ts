import { assertSingleExecutionValue, createTestkit, createSpiedPlugin } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';

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

  const mockedInngestClient = {
    name: 'TEST',
    eventKey: testEventKey,
    send: jest.fn(),
    setEventKey: jest.fn(),
  } as unknown as Inngest<Record<string, EventPayload>>;

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('sends', async () => {
    const spiedPlugin = createSpiedPlugin();

    const testInstance = createTestkit(
      [useInngest({ inngestClient: mockedInngestClient, includeResultData: false }), spiedPlugin.plugin],
      schema
    );

    const result = await testInstance.execute(`query TestQuery1 { test }`);
    assertSingleExecutionValue(result);

    expect(result.data).toEqual({ test: 'hello' });
    expect(result.errors).toBeUndefined();

    expect(spiedPlugin.spies.beforeExecute).toBeCalled();
    expect(spiedPlugin.spies.afterExecute).toHaveBeenCalled();

    expect(mockedInngestClient.send).toHaveBeenCalledWith({
      name: 'graphql/test-query1.query',
      data: {
        variables: {},
        identifiers: [],
        types: [],
        result: {},
        operation: { id: 'test-query1', name: 'TestQuery1', type: 'query' },
      },
      user: { currentUser: undefined },
    });
  });

  it('sends', async () => {
    const spiedPlugin = createSpiedPlugin();

    const testInstance = createTestkit(
      [useInngest({ inngestClient: mockedInngestClient, includeResultData: false }), spiedPlugin.plugin],
      schema
    );

    const result = await testInstance.execute(`query TestQuery2 { test }`);
    assertSingleExecutionValue(result);

    expect(result.data).toEqual({ test: 'hello' });
    expect(result.errors).toBeUndefined();

    expect(spiedPlugin.spies.beforeExecute).toBeCalled();
    expect(spiedPlugin.spies.afterExecute).toHaveBeenCalled();

    expect(mockedInngestClient.send).toHaveBeenCalledWith({
      name: 'graphql/test-query2.query',
      data: {
        variables: {},
        identifiers: [],
        types: [],
        result: {},
        operation: { id: 'test-query2', name: 'TestQuery2', type: 'query' },
      },
      user: { currentUser: undefined },
    });
  });

  it('does not send anonymous operations', async () => {
    const spiedPlugin = createSpiedPlugin();

    const testInstance = createTestkit(
      [useInngest({ inngestClient: mockedInngestClient, includeResultData: false }), spiedPlugin.plugin],
      schema
    );

    const result = await testInstance.execute(`query { test }`);
    assertSingleExecutionValue(result);

    expect(result.data).toEqual({ test: 'hello' });
    expect(result.errors).toBeUndefined();

    expect(spiedPlugin.spies.beforeExecute).toBeCalled();
    expect(spiedPlugin.spies.afterExecute).toHaveBeenCalled();

    expect(mockedInngestClient.send).not.toHaveBeenCalled();
  });
});
