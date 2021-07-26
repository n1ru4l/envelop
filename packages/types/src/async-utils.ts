import { OnExecuteDoneEventPayload, OnExecuteDoneHookResult, OnExecuteDoneHookResultOnNextHook } from '@envelop/core';
import isAsyncIterable from 'graphql/jsutils/isAsyncIterable.js';

export function handleMaybeStream(
  payload: OnExecuteDoneEventPayload,
  fn: OnExecuteDoneHookResultOnNextHook
): void | OnExecuteDoneHookResult {
  if (isAsyncIterable(payload.result)) {
    return { onNext: fn };
  } else {
    fn({
      result: payload.result,
      setResult: payload.setResult,
    });

    return undefined;
  }
}
