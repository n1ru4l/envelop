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

  xit('sends', async () => {
    const spyEventName = jest.spyOn(builders, 'buildEventName');
    const spyEventPayload = jest.spyOn(builders, 'buildEventPayload');
    const spyOperationId = jest.spyOn(builders, 'buildOperationId');
    const spyShouldSendEvent = jest.spyOn(shouldSendEvent, 'shouldSendEvent');

    const testInstance = createTestkit(
      [useInngest({ inngestClient: inngestTestClient, includeResultData: true }), spiedPlugin.plugin],
      schema
    );
    const result = await testInstance.execute(`query TestQuery { test }`);

    assertSingleExecutionValue(result);
    expect(result.data).toEqual({ test: 'hello' });
    expect(result.errors).toBeUndefined();

    expect(spiedPlugin.spies.beforeExecute).toBeCalled();

    expect(spyShouldSendEvent).toBeCalled();
    expect(spyEventName).toBeCalledTimes(2);
    expect(spyOperationId).not.toBeCalled();
    expect(spyEventPayload).toBeCalled();
  });

  xit('omits data from event payload', async () => {
    const spyEventName = jest.spyOn(builders, 'buildEventName');
    const spyEventPayload = jest.spyOn(builders, 'buildEventPayload');
    const spyOperationId = jest.spyOn(builders, 'buildOperationId');
    const spyShouldSendEvent = jest.spyOn(shouldSendEvent, 'shouldSendEvent');

    const testInstance = createTestkit(
      [useInngest({ inngestClient: inngestTestClient, includeResultData: false }), spiedPlugin.plugin],
      schema
    );
    const result = await testInstance.execute(`query TestQuery { test }`);

    assertSingleExecutionValue(result);
    expect(result.data).toEqual({ test: 'hello' });
    expect(result.errors).toBeUndefined();

    expect(spiedPlugin.spies.beforeExecute).toBeCalled();

    expect(spyShouldSendEvent).toBeCalled();
    expect(spyEventName).toBeCalledTimes(2);
    expect(spyOperationId).not.toBeCalled();
    expect(spyEventPayload).not.toBeCalled();
  });

  xit('skips anonymous operations', async () => {
    const spyEventName = jest.spyOn(builders, 'buildEventName');
    const spyEventPayload = jest.spyOn(builders, 'buildEventPayload');
    const spyOperationId = jest.spyOn(builders, 'buildOperationId');
    const spyShouldSendEvent = jest.spyOn(shouldSendEvent, 'shouldSendEvent');

    const testInstance = createTestkit(
      [useInngest({ inngestClient: inngestTestClient, allowAnonymousOperations: false }), spiedPlugin.plugin],
      schema
    );
    const result = await testInstance.execute(`query { test }`);

    assertSingleExecutionValue(result);
    expect(result.data).toEqual({ test: 'hello' });
    expect(result.errors).toBeUndefined();

    expect(spiedPlugin.spies.beforeExecute).toBeCalled();

    expect(spyShouldSendEvent).toBeCalled();
    expect(spyEventName).toBeCalled();
    expect(spyOperationId).not.toBeCalled();
    expect(spyEventPayload).not.toBeCalled();
  });
});
