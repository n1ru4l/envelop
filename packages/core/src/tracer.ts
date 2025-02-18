import type { Plugin, PromiseOrValue, Tracer } from '@envelop/types';
import { isPromise, mapMaybePromise } from './utils';

export function getTracer<PluginsContext extends Record<string, any>>(
  plugins: Plugin[],
): Tracer<PluginsContext> | undefined {
  let tracer: Tracer<PluginsContext> | undefined;
  for (const plugin of plugins) {
    if (plugin.tracer) {
      if (tracer) {
        throw new Error('A plugin has already declared a tracer. Only one tracer is allowed');
      }
      tracer = plugin.tracer;
    }
  }
  return tracer;
}

export const getTraced = <TPayload>(payload: TPayload) => ({
  fn<TResult, TArgs extends any[]>(
    tracer: ((payload: TPayload, wrapped: () => void) => void) | undefined,
    wrapped: (...args: TArgs) => TResult,
  ): (...args: TArgs) => TResult {
    if (!tracer) {
      return wrapped;
    }

    return (...args) => {
      let result: TResult;
      tracer(payload, () => {
        result = wrapped(...args);
      });
      return result!;
    };
  },

  asyncFn<TResult, TArgs extends any[]>(
    tracer:
      | ((payload: TPayload, wrapped: () => PromiseOrValue<void>) => PromiseOrValue<void>)
      | undefined,
    wrapped: (...args: TArgs) => PromiseOrValue<TResult>,
  ): (...args: TArgs) => PromiseOrValue<TResult> {
    if (!tracer) {
      return wrapped;
    }

    return (...args) => {
      let result: PromiseOrValue<TResult>;
      return mapMaybePromise(
        tracer(payload, () => {
          result = wrapped(...args);
          return isPromise(result) ? result.then(undefined) : undefined;
        }),
        () => {
          return result;
        },
      );
    };
  },
});
