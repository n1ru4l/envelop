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

    expect(spiedPlugin.spies.beforeExecute).toHaveBeenCalledWith({
      onExecuteDone: expect(spiedPlugin.spies.afterExecute).toHaveBeenCalled(),
      // expect(mockedInngestClient.send).toHaveBeenCalledWith({
      //   name: 'graphql/test-query1.query',
      //   data: {
      //     variables: {},
      //     identifiers: [],
      //     types: [],
      //     result: {},
      //     operation: { id: 'test-query1', name: 'TestQuery1', type: 'query' },
      //   },
      //   user: { currentUser: undefined },
      // });
      // },
    });
  });
});
