import { createSpiedPlugin, createTestkit, SubscriptionInterface } from '@envelop/testing';
import { useContextPerSubscriptionValue } from '../src';
import { schema, query, subscription, pubSub } from './common';

let result: SubscriptionInterface | null = null;

afterEach(() => {
  result?.unsubscribe();
});

it('it can be used for injecting a context that is different from the subscription context', async done => {
  const subscriptionContextValue = 'I am subscription context';

  let counter = 0;

  const testInstance = createTestkit(
    [
      useContextPerSubscriptionValue(() => ({
        contextValue: `=== ${counter}`,
      })),
    ],
    schema
  );

  result = await testInstance.subscribe(subscription, undefined, subscriptionContextValue);
  result.subscribe(result => {
    expect(result.errors).toBeUndefined();
    if (counter === 0) {
      expect(result.data!.ping).toEqual('0 === 0');
      pubSub.publish('ping', String(counter));
      done();
      return;
    }
    if (counter === 1) {
      expect(result.data!.ping).toEqual('1 === 1');
      done();
      return;
    }
  });

  pubSub.publish('ping', String(counter));
});

it('invokes cleanup function after value is published', async done => {
  let onEnd = jest.fn();
  const testInstance = createTestkit(
    [
      useContextPerSubscriptionValue(() => ({
        contextValue: `hi`,
        onEnd,
      })),
    ],
    schema
  );

  result = await testInstance.subscribe(subscription, undefined);

  result.subscribe(result => {
    expect(result.errors).toBeUndefined();
    expect(result.data!.ping).toEqual('foo hi');
    expect(onEnd.mock.calls).toHaveLength(1);
    done();
  });

  pubSub.publish('ping', 'foo');
});
