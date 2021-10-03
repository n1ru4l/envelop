import { useLogger, enableIf } from '@envelop/core';
import { getIntrospectionQuery, parse } from 'graphql';
import { isIntrospectionDocument } from '../src/utils';

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
  });
});
