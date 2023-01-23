import { makeExecutableSchema } from '@graphql-tools/schema';
import { parse } from 'graphql';

import { buildLogger } from '../src/logger';

import { isAnonymousOperation } from '../src/tools';

describe('tools', () => {
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

  it('knows if the operation is anonymous', async () => {
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

  it('knows if the operation is not anonymous', async () => {
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
