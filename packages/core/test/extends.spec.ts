import { createSpiedPlugin, createTestkit, useGraphQLJSEngine } from '@envelop/testing';
import { envelop, useLogger, useSchema } from '../src/index.js';
import { useEnvelop } from '../src/plugins/use-envelop.js';
import { query, schema } from './common.js';

describe('extending envelops', () => {
  it('should allow to extend envelops', async () => {
    const spiedPlugin = createSpiedPlugin();

    const baseEnvelop = envelop({
      plugins: [useGraphQLJSEngine(), useLogger(), spiedPlugin.plugin],
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
    });

    const teskit = createTestkit(instance);
    await teskit.execute(query, {});
    expect(onExecuteChildSpy).toHaveBeenCalledTimes(1);
    expect(spiedPlugin.spies.beforeExecute).toHaveBeenCalledTimes(1);
    expect(spiedPlugin.spies.afterExecute).toHaveBeenCalledTimes(1);
  });
});
