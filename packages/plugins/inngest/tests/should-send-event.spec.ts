import { makeExecutableSchema } from '@graphql-tools/schema';
import { parse } from 'graphql';

import { shouldSendEvent } from '../src/should-send-event';
import { buildLogger } from '../src/logger';
import { defaultUseInngestPluginOptions } from '../src/plugin';

describe.skip('shouldSendEvent', () => {
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

  xit('should send event', async () => {
    const result = await shouldSendEvent({
      params: {
        executeFn: () => {},
        setExecuteFn: () => {},
        setResultAndStopExecution: () => {},
        extendContext: () => {},
        args: {
          operationName: 'foo',
          schema,
          document: parse(`query TestQuery { test }`),
          contextValue: {},
        },
      },
      allowedOperations: defaultUseInngestPluginOptions.allowedOperations,
      result: { errors: [], data: {} },
      logger: buildLogger({ logging: false }),
    });

    console.log('>>>> should send', result);

    expect(result).toBe(true);
  });

  xit('should not send anonymous events', async () => {
    const result = await shouldSendEvent({
      allowAnonymousOperations: false,
      params: {
        executeFn: () => {},
        setExecuteFn: () => {},
        setResultAndStopExecution: () => {},
        extendContext: () => {},
        args: {
          schema,
          document: parse(`query { test }`),
          contextValue: {},
        },
      },
      result: { errors: [], data: {} },
      logger: buildLogger({ logging: false }),
    });

    expect(result).toBe(false);
  });
});
