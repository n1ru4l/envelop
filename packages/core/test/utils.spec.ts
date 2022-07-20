import { useLogger, enableIf } from '@envelop/core';
import { createTestkit, createSpiedPlugin } from '@envelop/testing';
import { getIntrospectionQuery, parse } from '@envelop/graphql';
import { isIntrospectionDocument } from '../src/utils.js';
import { query, schema } from './common.js';

describe('Utils', () => {
  describe('isIntrospectionDocument', () => {
    it('Should detect original introspection query', () => {
      const doc = getIntrospectionQuery();

      expect(isIntrospectionDocument(parse(doc))).toBeTruthy();
    });

    it('Should return false on non-introspection', () => {
      const doc = `query test { f }`;

      expect(isIntrospectionDocument(parse(doc))).toBeFalsy();
    });

    it('Should detect minimal introspection', () => {
      const doc = `query { __schema { test }}`;

      expect(isIntrospectionDocument(parse(doc))).toBeTruthy();
    });

    it('Should detect alias tricks', () => {
      const doc = `query { test: __schema { test }}`;

      expect(isIntrospectionDocument(parse(doc))).toBeTruthy();
    });
  });

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
