import { createSpiedPlugin, createTestkit } from '@envelop/testing';
import { envelop, useExtendContext, useLogger, useSchema } from '../src/index.js';
import { useEnvelop } from '../src/plugins/use-envelop.js';
import { schema, query } from './common.js';
import { parse, execute, validate, subscribe } from 'graphql';

describe('extending envelops', () => {
  it('should allow to extend envelops', async () => {
    const spiedPlugin = createSpiedPlugin();

    const baseEnvelop = envelop({
      plugins: [useLogger(), spiedPlugin.plugin],
      parse,
      execute,
      validate,
      subscribe,
    });

    const onExecuteChildSpy = jest.fn();

    const instance = envelop({
      plugins: [
        useEnvelop(baseEnvelop),
        useSchema(schema),
        {
          onExecute: onExecuteChildSpy,
        },
      ],
      parse,
      execute,
      validate,
      subscribe,
    });

    const teskit = createTestkit(instance);
    await teskit.perform({ query });
    expect(onExecuteChildSpy).toHaveBeenCalledTimes(1);
    expect(spiedPlugin.spies.beforeExecute).toHaveBeenCalledTimes(1);
    expect(spiedPlugin.spies.afterExecute).toHaveBeenCalledTimes(1);
  });
});
