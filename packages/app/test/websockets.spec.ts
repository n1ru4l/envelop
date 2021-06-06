import { createDeferredPromise } from '@envelop/app/extend';

import { PingSubscriptionModule, startFastifyServer } from './utils';

test('handles wrong url', async () => {
  const connectionError = createDeferredPromise<unknown>();
  await startFastifyServer({
    options: {
      buildContext() {
        return {
          foo: 'bar',
        };
      },
      websockets: true,
    },
    buildOptions: {
      prepare(tools) {
        tools.registerModule(PingSubscriptionModule);
      },
    },
    graphqlWsClientOptions: {
      retryAttempts: 0,

      lazy: false,
      onNonLazyError: ({ target, ...event }: any) => {
        connectionError.resolve(event);
      },
    },
    websocketPath: '/wrong_url',
  });

  expect(await connectionError.promise).toMatchInlineSnapshot(`
    Object {
      "code": 1001,
      "reason": "",
      "type": "close",
      "wasClean": true,
    }
  `);
});
