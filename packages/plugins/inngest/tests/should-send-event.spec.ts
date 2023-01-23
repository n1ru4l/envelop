import { makeExecutableSchema } from '@graphql-tools/schema';
import { parse } from 'graphql';

import { shouldSendEvent } from '../src/should-send-event';
import { buildLogger } from '../src/logger';

describe('shouldSendEvent', () => {
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

  it('should send event', async () => {
    const result = shouldSendEvent({
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
      result: { errors: [], data: {} },
      logger: buildLogger({ logging: false }),
    });

    expect(result).toBe(true);
  });

  it('should not send anonymous events', async () => {
    const result = shouldSendEvent({
      skipAnonymousOperations: true,
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
