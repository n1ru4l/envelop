import { handleMaybePromise, isPromise, MaybePromise } from '@whatwg-node/promise-helpers';

export type GenericInstruments = Record<
  string,
  (payload: any, wrapped: () => MaybePromise<void>) => MaybePromise<void>
>;

/**
 * Composes 2 instrumentations together into one instrumentation.
 * The first one will be the outer call, the second one the inner call.
 */
export function chain<First extends GenericInstruments, Next extends GenericInstruments>(
  first: First,
  next: Next,
) {
  const merged: GenericInstruments = { ...next, ...first };

  for (const key of Object.keys(merged)) {
    if (key in first && key in next) {
      merged[key] = (payload, wrapped) => first[key](payload, () => next[key](payload, wrapped));
    }
  }
  return merged as First & Next;
}

/**
 * Composes a list of instruments together into one instruments object.
 * The order of execution will respect the order of the array,
 * the first one being the outter most call, the last one the inner most call.
 */
export function composeInstruments<T extends GenericInstruments>(instruments: T[]): T | undefined {
  return instruments.length > 0 ? instruments.reduce(chain) : undefined;
}

/**
 * Extract instruments from a list of plugins.
 * It returns instruments found, and the list of plugins without their insturments.
 *
 * You can use this to easily customize the composition of the instruments if the default one
 * doesn't suits your needs.
 */
export function getInstrumentsAndPlugins<T, P extends { instruments?: T }>(
  plugins: P[],
): { pluginInstruments: T[]; plugins: Omit<P, 'instruments'>[] } {
  const pluginInstruments: T[] = [];
  const newPlugins: Omit<P, 'instruments'>[] = [];
  for (const { instruments, ...plugin } of plugins) {
    if (instruments) {
      pluginInstruments.push(instruments);
    }
    newPlugins.push(plugin);
  }
  return { pluginInstruments, plugins: newPlugins };
}

/**
 * A helper to instrument a function.
 *
 * @param payload: The first argument that will be passed to the instruments on each function call
 * @returns Function and Async Functions factories allowing to wrap a function with a given instrument.
 */
export const getInstrumented = <TPayload>(payload: TPayload) => ({
  /**
   * Wraps the `wrapped` function with the given `instrument` wrapper.
   * @returns The wrapped function, or `undefined` if the instrument is `undefined`.
   */
  fn<TResult, TArgs extends any[]>(
    instrument: ((payload: TPayload, wrapped: () => void) => void) | undefined,
    wrapped: (...args: TArgs) => TResult,
  ): (...args: TArgs) => TResult {
    if (!instrument) {
      return wrapped;
    }

    return (...args) => {
      let result: TResult;
      instrument(payload, () => {
        result = wrapped(...args);
      });
      return result!;
    };
  },

  /**
   * Wraps the `wrapped` function with the given `instrument` wrapper.
   * @returns The wrapped function, or `undefined` if the instrument is `undefined`.
   */
  asyncFn<TResult, TArgs extends any[]>(
    instrument:
      | ((payload: TPayload, wrapped: () => MaybePromise<void>) => MaybePromise<void>)
      | undefined,
    wrapped: (...args: TArgs) => MaybePromise<TResult>,
  ): (...args: TArgs) => MaybePromise<TResult> {
    if (!instrument) {
      return wrapped;
    }

    return (...args) => {
      let result: MaybePromise<TResult>;
      return handleMaybePromise(
        () =>
          instrument(payload, () => {
            result = wrapped(...args);
            return isPromise(result) ? result.then(() => undefined) : undefined;
          }),
        () => {
          return result;
        },
      );
    };
  },
});
