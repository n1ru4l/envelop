/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import {
  DefaultContext,
  OnExecuteDoneEventPayload,
  OnExecuteDoneHookResult,
  OnExecuteDoneHookResultOnNextHook,
} from '@envelop/core';

/**
 * Returns true if the provided object implements the AsyncIterator protocol via
 * implementing a `Symbol.asyncIterator` method.
 *
 * Source: https://github.com/graphql/graphql-js/blob/main/src/jsutils/isAsyncIterable.ts
 */
export function isAsyncIterable(maybeAsyncIterable: any): maybeAsyncIterable is AsyncIterable<any> {
  return typeof maybeAsyncIterable?.[Symbol.asyncIterator] === 'function';
}

/**
 * A utility function for hanlding `onExecuteDone` hook result, for simplifying the hanlding of AsyncIterable returned from `execute`.
 *
 * @param payload The payload send to `onExecuteDone` hook function
 * @param fn The handler to be executed on each result
 * @returns a subscription for streamed results, or undefined in case of an non-async
 */
export function handleStreamOrSingleExecutionResult<ContextType = DefaultContext>(
  payload: OnExecuteDoneEventPayload<ContextType>,
  fn: OnExecuteDoneHookResultOnNextHook<ContextType>
): void | OnExecuteDoneHookResult<ContextType> {
  if (isAsyncIterable(payload.result)) {
    return { onNext: fn };
  } else {
    fn({
      args: payload.args,
      result: payload.result,
      setResult: payload.setResult,
    });

    return undefined;
  }
}
