import { makeExecutableSchema } from '@graphql-tools/schema';
import { parse } from 'graphql';

import { buildLogger } from '../src/logger';

import { isAnonymousOperation, allowOperation, extractOperationName, getOperation } from '../src/tools';

import { SendableOperation } from '../index';
import type { UseInngestExecuteOptions } from '../src/types';

describe.only('tools', () => {
  const logger = buildLogger({ logging: true });

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

  describe('isAnonymousOperation', () => {
    it('knows if the operation is anonymous', () => {
      const isAnon = isAnonymousOperation({
        executeFn: () => {},
        setExecuteFn: () => {},
        setResultAndStopExecution: () => {},
        extendContext: () => {},
        args: {
          schema,
          document: parse(`query { test }`),
          contextValue: {},
        },
      });

      expect(isAnon).toBe(true);
    });

    it('knows if the operation is not anonymous', () => {
      const isAnon = isAnonymousOperation({
        executeFn: () => {},
        setExecuteFn: () => {},
        setResultAndStopExecution: () => {},
        extendContext: () => {},
        args: {
          schema,
          document: parse(`query TestQuery { test }`),
          contextValue: {},
        },
      });

      expect(isAnon).toBe(false);
    });
  });

  describe('getOperation', () => {
    it('gets a query', () => {
      const operation = getOperation({
        executeFn: () => {},
        setExecuteFn: () => {},
        setResultAndStopExecution: () => {},
        extendContext: () => {},
        args: {
          schema,
          document: parse(`query TestQuery { test }`),
          contextValue: {},
        },
      });

      expect(operation).toBe('query');
    });

    it('gets a mutation', () => {
      const operation = getOperation({
        executeFn: () => {},
        setExecuteFn: () => {},
        setResultAndStopExecution: () => {},
        extendContext: () => {},
        args: {
          schema,
          document: parse(`mutation TestMutation { test }`),
          contextValue: {},
        },
      });

      expect(operation).toBe('mutation');
    });

    it('gets a subscription', () => {
      const operation = getOperation({
        executeFn: () => {},
        setExecuteFn: () => {},
        setResultAndStopExecution: () => {},
        extendContext: () => {},
        args: {
          schema,
          document: parse(`subscription TestSubscription { test }`),
          contextValue: {},
        },
      });

      expect(operation).toBe('subscription');
    });
  });

  describe('extractOperationName', () => {
    it('gets a named query operation', () => {
      const executeOptions = {
        executeFn: () => {},
        setExecuteFn: () => {},
        setResultAndStopExecution: () => {},
        extendContext: () => {},
        args: {
          schema,
          document: parse(`query TestQuery { test }`),
          contextValue: {},
        },
      };
      const options: Pick<UseInngestExecuteOptions, 'params'> = { params: executeOptions };
      const operationName = extractOperationName(options);

      expect(operationName).toBe('TestQuery');
    });

    it('gets a named mutation operation', () => {
      const executeOptions = {
        executeFn: () => {},
        setExecuteFn: () => {},
        setResultAndStopExecution: () => {},
        extendContext: () => {},
        args: {
          schema,
          document: parse(`query TestMutation { test }`),
          contextValue: {},
        },
      };
      const options: Pick<UseInngestExecuteOptions, 'params'> = { params: executeOptions };
      const operationName = extractOperationName(options);

      expect(operationName).toBe('TestMutation');
    });

    it('gets a named subscription operation', () => {
      const executeOptions = {
        executeFn: () => {},
        setExecuteFn: () => {},
        setResultAndStopExecution: () => {},
        extendContext: () => {},
        args: {
          schema,
          document: parse(`query TestSubscription { test }`),
          contextValue: {},
        },
      };
      const options: Pick<UseInngestExecuteOptions, 'params'> = { params: executeOptions };
      const operationName = extractOperationName(options);

      expect(operationName).toBe('TestSubscription');
    });

    it('handles an unnamed query operation', () => {
      const executeOptions = {
        executeFn: () => {},
        setExecuteFn: () => {},
        setResultAndStopExecution: () => {},
        extendContext: () => {},
        args: {
          schema,
          document: parse(`query { test }`),
          contextValue: {},
        },
      };
      const options: Pick<UseInngestExecuteOptions, 'params'> = { params: executeOptions };
      const operationName = extractOperationName(options);

      expect(operationName).toBeUndefined();
    });
  });

  describe('allowOperation', () => {
    it('checks if queries are allowed', () => {
      const executeOptions = {
        executeFn: () => {},
        setExecuteFn: () => {},
        setResultAndStopExecution: () => {},
        extendContext: () => {},
        args: {
          schema,
          document: parse(`query { test }`),
          contextValue: {},
        },
      };

      const options: Pick<UseInngestExecuteOptions, 'params'> = { params: executeOptions };

      const allowed = allowOperation({
        params: options.params,
        sendOperations: [SendableOperation.QUERY],
        logger,
      });

      expect(allowed).toBe(true);
    });

    it('checks if mutations are allowed', () => {
      const executeOptions = {
        executeFn: () => {},
        setExecuteFn: () => {},
        setResultAndStopExecution: () => {},
        extendContext: () => {},
        args: {
          schema,
          document: parse(`mutation { test }`),
          contextValue: {},
        },
      };

      const options: Pick<UseInngestExecuteOptions, 'params'> = { params: executeOptions };

      const allowed = allowOperation({
        params: options.params,
        sendOperations: [SendableOperation.MUTATION],
        logger,
      });

      expect(allowed).toBe(true);
    });

    it('checks if queries are not allowed', () => {
      const executeOptions = {
        executeFn: () => {},
        setExecuteFn: () => {},
        setResultAndStopExecution: () => {},
        extendContext: () => {},
        args: {
          schema,
          document: parse(`query { test }`),
          contextValue: {},
        },
      };

      const options: Pick<UseInngestExecuteOptions, 'params'> = { params: executeOptions };

      const allowed = allowOperation({
        params: options.params,
        sendOperations: [SendableOperation.MUTATION],
        logger,
      });

      expect(allowed).toBe(false);
    });
  });
});
