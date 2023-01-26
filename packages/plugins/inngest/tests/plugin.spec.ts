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

  const spiedPlugin = createSpiedPlugin();

  const mockedInngestClient = {
    send: jest.fn(payload => {
      console.log('>>>> payload', payload);
      return payload;
    }),
    name: 'TEST',
    eventKey: testEventKey,
    setEventKey: jest.fn(payload => {
      console.log('>>>> payload', payload);
      return payload;
    }),
  } as unknown as Inngest<Record<string, EventPayload>>;

  beforeEach(() => {
    spiedPlugin.reset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.only('sends', async () => {
    const testInstance = createTestkit(
      [useInngest({ inngestClient: mockedInngestClient, includeResultData: false }), spiedPlugin.plugin],
      schema
    );

    const result = await testInstance.execute(`query TestQuery1 { test }`);
    assertSingleExecutionValue(result);

    expect(result.data).toEqual({ test: 'hello' });
    expect(result.errors).toBeUndefined();

    expect(spiedPlugin.spies.beforeExecute).toBeCalled();

    expect(mockedInngestClient.setEventKey).toHaveBeenCalledWith('name');

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

    expect(mockedInngestClient.send).toHaveBeenCalledWith({
      name: 'graphql/anonymous-7b06f59976962bf7b47e2f2f29142661407818808663d8cf5a68c9cee38c11ff.query',
      data: {
        variables: {},
        identifiers: [],
        types: [],
        result: {},
        operation: {
          id: 'anonymous-d32327f2ad0fef67462baf2b8410a2b4b2cc8db57e67bb5b3c95efa595b39f30',
          name: '',
          type: 'query',
        },
      },
      user: { currentUser: undefined },
    });
  });
});
