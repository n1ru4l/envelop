import { makeExecutableSchema } from '@graphql-tools/schema';
import { parse } from 'graphql';

import { buildLogger } from '../src/logger';

import { buildDataPayload, buildEventName } from '../src/builders';

describe('builders', () => {
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

  describe('buildEventName', () => {
    it('builds an event nam from parsed document ast', async () => {
      const result = await buildEventName({
        params: {
          executeFn: () => {},
          setExecuteFn: () => {},
          setResultAndStopExecution: () => {},
          extendContext: () => {},
          args: {
            schema,
            document: parse(`query TestQuery { test }`),
            contextValue: {},
          },
        },
        eventNamePrefix: 'graphql-test',
        logger: buildLogger({ logging: false }),
      });

      expect(result).toEqual('graphql-test/test-query.query');
    });

    xit('builds an event name from a given operation name', async () => {
      const result = await buildEventName({
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
        eventNamePrefix: 'graphql-test',
        logger: buildLogger({ logging: false }),
      });

      // it cannot figure out the operation is a query when the operationName isn't present and matches
      expect(result).toEqual('graphql-test/foo.query');
    });

    it('builds an event name for an anonymous query', async () => {
      const result = await buildEventName({
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
        eventNamePrefix: 'graphql-test',
        logger: buildLogger({ logging: false }),
      });

      expect(result).toEqual(
        'graphql-test/anonymous-d32327f2ad0fef67462baf2b8410a2b4b2cc8db57e67bb5b3c95efa595b39f30.query'
      );
    });
  });

  describe('buildDataPayload', () => {
    it('builds named query', async () => {
      const payload = await buildDataPayload({
        params: {
          executeFn: () => {},
          setExecuteFn: () => {},
          setResultAndStopExecution: () => {},
          extendContext: () => {},
          args: {
            schema,
            document: parse(`query TestQuery { test }`),
            contextValue: {},
          },
        },
        result: { errors: [], data: { test: 'hello' } },
        logger: buildLogger({ logging: false }),
      });

      expect(payload).toEqual({
        __graphql: { operation: 'query', operationId: 'test-query', operationName: 'TestQuery', variables: {} },
        test: 'hello',
      });
    });

    it('builds anonymous query', async () => {
      const payload = await buildDataPayload({
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
        result: { errors: [], data: { test: 'hello' } },
        logger: buildLogger({ logging: false }),
      });

      expect(payload).toEqual({
        __graphql: {
          operation: 'query',
          operationId: 'anonymous-d32327f2ad0fef67462baf2b8410a2b4b2cc8db57e67bb5b3c95efa595b39f30',
          operationName: '',
          variables: {},
        },
        test: 'hello',
      });
    });
  });

  it('builds data for a redacted query', async () => {
    const payload = await buildDataPayload({
      params: {
        executeFn: () => {},
        setExecuteFn: () => {},
        setResultAndStopExecution: () => {},
        extendContext: () => {},
        args: {
          schema,
          document: parse(`query TestRedactedQuery { test }`),
          contextValue: {},
        },
      },
      redaction: { paths: ['test'], censor: '***' },
      result: { errors: [], data: { test: 'hello' } },
      logger: buildLogger({ logging: false }),
    });

    expect(payload).toEqual({
      __graphql: {
        operation: 'query',
        operationId: 'test-redacted-query',
        operationName: 'TestRedactedQuery',
        variables: {},
      },
      test: '***',
    });
  });
});
