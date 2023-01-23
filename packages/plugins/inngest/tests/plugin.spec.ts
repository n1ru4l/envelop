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

  beforeEach(() => {
    spiedPlugin.reset();
  });

  const inngestTestClient = createInngestClient({ name: 'TEST', eventKey: testEventKey });

  it('sends', async () => {
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

  it('omits data from event payload', async () => {
    const spyEventName = jest.spyOn(builders, 'buildEventName');
    const spyDataPayload = jest.spyOn(builders, 'buildDataPayload');
    const spyOperationId = jest.spyOn(builders, 'buildOperationId');
    const spyShouldSendEvent = jest.spyOn(shouldSendEvent, 'shouldSendEvent');

    const testInstance = createTestkit(
      [useInngest({ inngestClient: inngestTestClient, omitData: true }), spiedPlugin.plugin],
      schema
    );
    const result = await testInstance.execute(`query TestQuery { test }`);

    assertSingleExecutionValue(result);
    expect(result.data).toEqual({ test: 'hello' });
    expect(result.errors).toBeUndefined();

    expect(spiedPlugin.spies.beforeExecute).toBeCalledTimes(1);

    expect(spyShouldSendEvent).toBeCalledTimes(1);
    expect(spyEventName).toBeCalledTimes(1);
    expect(spyOperationId).toBeCalledTimes(0);
    expect(spyDataPayload).toBeCalledTimes(0);
  });

  it('skips anonymous operations', async () => {
    const spyEventName = jest.spyOn(builders, 'buildEventName');
    const spyDataPayload = jest.spyOn(builders, 'buildDataPayload');
    const spyOperationId = jest.spyOn(builders, 'buildOperationId');
    const spyShouldSendEvent = jest.spyOn(shouldSendEvent, 'shouldSendEvent');

    const testInstance = createTestkit(
      [useInngest({ inngestClient: inngestTestClient, skipAnonymousOperations: true }), spiedPlugin.plugin],
      schema
    );
    const result = await testInstance.execute(`query { test }`);

    assertSingleExecutionValue(result);
    expect(result.data).toEqual({ test: 'hello' });
    expect(result.errors).toBeUndefined();

    expect(spiedPlugin.spies.beforeExecute).toBeCalledTimes(1);

    expect(spyShouldSendEvent).toBeCalledTimes(1);
    expect(spyEventName).toBeCalledTimes(0);
    expect(spyOperationId).toBeCalledTimes(0);
    expect(spyDataPayload).toBeCalledTimes(0);
  });
});
