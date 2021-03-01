import { createSpiedPlugin, createTestkit } from '@guildql/testing';
import { GraphQLSchema } from 'graphql';
import { schema, query } from './common';

describe('execute', () => {
  it('Should wrap and trigger events correctly', async () => {
    const spiedPlugin = createSpiedPlugin();
    const teskit = createTestkit([spiedPlugin.plugin], schema);
    await teskit.execute(query, { test: 1 });
    expect(spiedPlugin.spies.beforeExecute).toHaveBeenCalledTimes(1);
    expect(spiedPlugin.spies.beforeResolver).toHaveBeenCalledTimes(3);
    expect(spiedPlugin.spies.beforeExecute).toHaveBeenCalledWith({
      executeFn: expect.any(Function),
      setExecuteFn: expect.any(Function),
      extendContext: expect.any(Function),
      args: {
        contextValue: expect.objectContaining({ test: 1 }),
        rootValue: {},
        schema,
        operationName: undefined,
        fieldResolver: undefined,
        typeResolver: undefined,
        variableValues: undefined,
        document: expect.objectContaining({
          definitions: expect.any(Array),
        }),
      },
    });

    expect(spiedPlugin.spies.afterResolver).toHaveBeenCalledTimes(3);
    expect(spiedPlugin.spies.afterExecute).toHaveBeenCalledTimes(1);
    expect(spiedPlugin.spies.afterExecute).toHaveBeenCalledWith({
      result: {
        data: {
          me: {
            id: '1',
            name: 'Dotan Simha',
          },
        },
      },
    });
  });
});
