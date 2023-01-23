import { assertSingleExecutionValue, createTestkit, createSpiedPlugin } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';

import { createInngestClient } from '../src/client';
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

  const builders = require('../src/builders');
  const shouldSendEvent = require('../src/should-send-event');

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const spiedPlugin = createSpiedPlugin();

  const expectOnExecuteContains = (obj: any) => {
    expect(spiedPlugin.spies.beforeExecute).toHaveBeenCalledWith(obj);
  };

  beforeEach(() => {
    spiedPlugin.reset();
  });

  it('', async () => {
    const inngestTestClient = createInngestClient({ name: 'TEST', eventKey: testEventKey });

    const spyEventName = jest.spyOn(builders, 'buildEventName');
    const spyDataPayload = jest.spyOn(builders, 'buildDataPayload');
    const spyOperationId = jest.spyOn(builders, 'buildOperationId');
    const spyShouldSendEvent = jest.spyOn(shouldSendEvent, 'shouldSendEvent');

    const testInstance = createTestkit([useInngest({ inngestClient: inngestTestClient }), spiedPlugin.plugin], schema);

    const result = await testInstance.execute(`query TestQuery { test }`);

    assertSingleExecutionValue(result);
    expect(result.data).toEqual({ test: 'hello' });
    expect(result.errors).toBeUndefined();

    expect(spiedPlugin.spies.beforeExecute).toBeCalledTimes(1);

    expect(spyShouldSendEvent).toBeCalledTimes(1);
    expect(spyEventName).toBeCalledTimes(1);
    expect(spyOperationId).toBeCalledTimes(0);
    expect(spyDataPayload).toBeCalledTimes(1);
  });
});
