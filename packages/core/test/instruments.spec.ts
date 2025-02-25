import { chain, envelop, GenericInstruments, Instruments, useEngine } from '@envelop/core';

describe('instruments', () => {
  it('should instrument all graphql phases', async () => {
    const result: string[] = [];
    const instrument: Instruments<any> = {
      init: (_, w) => {
        result.push('pre-init');
        expect(w()).toBeUndefined();
        result.push('post-init');
        return 'instrument';
      },
      parse: (_, w) => {
        result.push('pre-parse');
        expect(w()).toBeUndefined();
        result.push('post-parse');
        return 'instrument';
      },
      validate: (_, w) => {
        result.push('pre-validate');
        expect(w()).toBeUndefined();
        result.push('post-validate');
        return 'instrument';
      },
      context: (_, w) => {
        result.push('pre-context');
        expect(w()).toBeUndefined();
        result.push('post-context');
        return 'instrument';
      },
      // @ts-expect-error Returning something other than undefined should not be allowed
      execute: async (_, w) => {
        result.push('pre-execute');
        expect(await w()).toBeUndefined();
        result.push('post-execute');
        return 'instrument';
      },
      // @ts-expect-error Returning something other than undefined shoould not be allowed
      subscribe: async (_, w) => {
        result.push('pre-subscribe');
        expect(await w()).toBeUndefined();
        result.push('post-subscribe');
        return 'instrument';
      },
    };

    const getEnveloped = envelop({
      plugins: [
        useEngine({
          execute: () => {
            result.push('execute');
            return new Promise(r => setTimeout(() => r('test'), 10));
          },
          subscribe: () => {
            result.push('subscribe');
            return new Promise(r => setTimeout(() => r('test'), 10));
          },
          parse: () => {
            result.push('parse');
            return { test: 'foo' };
          },
          validate: () => {
            result.push('validate');
            return 'test';
          },
        }),
        { instruments: instrument },
      ],
    });

    const gql = getEnveloped({ test: 'foo' });
    expect(gql.parse('')).toEqual({ test: 'foo' });
    expect(gql.validate({}, {})).toEqual('test');
    expect(gql.contextFactory()).toEqual({ test: 'foo' });
    expect(await gql.execute({ document: {}, schema: {} })).toEqual('test');
    expect(await gql.subscribe({ document: {}, schema: {} })).toEqual('test');

    expect(result).toEqual([
      'pre-init',
      'post-init',
      'pre-parse',
      'parse',
      'post-parse',
      'pre-validate',
      'validate',
      'post-validate',
      'pre-context',
      'post-context',
      'pre-execute',
      'execute',
      'post-execute',
      'pre-subscribe',
      'subscribe',
      'post-subscribe',
    ]);
  });
});
