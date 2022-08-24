import { useLogger, enableIf } from '@envelop/core';
import { createTestkit, createSpiedPlugin } from '@envelop/testing';
import { query, schema } from './common.js';

describe('Utils', () => {
  describe('enableIf', () => {
    it('Should return a plugin', () => {
      const plugin = enableIf(true, useLogger());
      expect(plugin).toBeTruthy();
    });

    it('Should return null', () => {
      const plugin = enableIf(false, useLogger());
      expect(plugin).toBeFalsy();
    });

    it('Should not init plugin', async () => {
      const spiedPlugin = createSpiedPlugin();
      const testkit = createTestkit([enableIf(false, spiedPlugin.plugin)], schema);
      await testkit.execute(query);
      expect(spiedPlugin.spies.beforeExecute).not.toHaveBeenCalled();
    });

    it('Should init plugin', async () => {
      const spiedPlugin = createSpiedPlugin();
      const testkit = createTestkit([enableIf(true, spiedPlugin.plugin)], schema);
      await testkit.execute(query);
      expect(spiedPlugin.spies.beforeExecute).toHaveBeenCalled();
    });
  });
});
