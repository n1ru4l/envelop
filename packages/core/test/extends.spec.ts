import { createSpiedPlugin, createTestkit } from '@envelop/testing';
import { FieldNode, parse, visit } from 'graphql';
import { envelop, useLogger, useSchema } from '../src';
import { schema, query } from './common';

describe('extending envelops', () => {
  it('should allow to extend envelops', async () => {
    const spiedPlugin = createSpiedPlugin();

    const baseEnvelop = envelop({
      plugins: [useLogger(), spiedPlugin.plugin],
    });

    const onExecuteChildSpy = jest.fn();

    const instance = envelop({
      extends: [baseEnvelop],
      plugins: [
        useSchema(schema),
        {
          onExecute: onExecuteChildSpy,
        },
      ],
    });
    const teskit = createTestkit(instance);
    const result = await teskit.execute(query, {});
    expect(onExecuteChildSpy).toHaveBeenCalledTimes(1);
    expect(spiedPlugin.spies.beforeExecute).toHaveBeenCalledTimes(1);
    expect(spiedPlugin.spies.afterExecute).toHaveBeenCalledTimes(1);
  });
});
