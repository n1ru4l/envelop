import {
  AsyncIterableIteratorOrValue,
  ExecuteFunction,
  PolymorphicExecuteArguments,
  PolymorphicSubscribeArguments,
  SubscribeFunction,
  PromiseOrValue,
  DefaultContext,
  OnExecuteDoneEventPayload,
  OnExecuteDoneHookResult,
  OnExecuteDoneHookResultOnNextHook,
  ExecutionArgs,
} from '@envelop/types';

export const envelopIsIntrospectionSymbol = Symbol('ENVELOP_IS_INTROSPECTION');

export function isOperationDefinition(def: any): boolean {
  return def.kind === 'OperationDefinition';
}

export function isIntrospectionOperation(operation: any): boolean {
  if (operation.kind === 'OperationDefinition') {
    if (operation.name?.value === '__schema') {
      return true;
    }

    const nodesWithSchema = operation.selectionSet.selections.filter((selection: any) => {
      if (selection.kind === 'Field' && selection.name.value === '__schema') {
        return true;
      }
      return false;
    });

    if (nodesWithSchema.length > 0) {
      return true;
    }
  }

  return false;
}

export function isIntrospectionDocument(document: any): boolean {
  const operations = document.definitions.filter(isOperationDefinition);

  return operations.some((op: any) => isIntrospectionOperation(op));
}

export function isIntrospectionOperationString(operation: string | any): boolean {
  return (typeof operation === 'string' ? operation : operation.body).indexOf('__schema') !== -1;
}

function getSubscribeArgs(args: PolymorphicSubscribeArguments): ExecutionArgs {
  return args.length === 1
    ? args[0]
    : {
        schema: args[0],
        document: args[1],
        rootValue: args[2],
        contextValue: args[3],
        variableValues: args[4],
        operationName: args[5],
        fieldResolver: args[6],
        subscribeFieldResolver: args[7],
      };
}

/**
 * Utility function for making a subscribe function that handles polymorphic arguments.
 */
export const makeSubscribe = (subscribeFn: (args: ExecutionArgs) => any): SubscribeFunction =>
  ((...polyArgs: PolymorphicSubscribeArguments): PromiseOrValue<AsyncIterableIterator<any>> =>
    subscribeFn(getSubscribeArgs(polyArgs))) as SubscribeFunction;

export function mapAsyncIterator<T, O>(
  source: AsyncIterable<T>,
  mapper: (input: T) => Promise<O> | O
): AsyncGenerator<O> {
  const iterator = source[Symbol.asyncIterator]();

  async function mapResult(result: IteratorResult<T, O>): Promise<IteratorResult<O>> {
    if (result.done) {
      return result;
    }
    try {
      return { value: await mapper(result.value), done: false };
    } catch (error) {
      try {
        await iterator.return?.();
      } catch (_error) {
        /* ignore error */
      }
      throw error;
    }
  }

  const stream: AsyncGenerator<O> = {
    [Symbol.asyncIterator]() {
      return stream;
    },
    async next() {
      return await mapResult(await iterator.next());
    },
    async return() {
      const promise = iterator.return?.();
      return promise ? await mapResult(await promise) : { value: undefined as any, done: true };
    },
    async throw(error: unknown) {
      const promise = iterator.throw?.();
      if (promise) {
        return await mapResult(await promise);
      }
      // if the source has no throw method we just re-throw error
      // usually throw is not called anyways
      throw error;
    },
  };

  return stream;
}

function getExecuteArgs(args: PolymorphicExecuteArguments): ExecutionArgs {
  return args.length === 1
    ? args[0]
    : {
        schema: args[0],
        document: args[1],
        rootValue: args[2],
        contextValue: args[3],
        variableValues: args[4],
        operationName: args[5],
        fieldResolver: args[6],
        typeResolver: args[7],
      };
}

/**
 * Utility function for making a execute function that handles polymorphic arguments.
 */
export const makeExecute = (
  executeFn: (args: ExecutionArgs) => PromiseOrValue<AsyncIterableIteratorOrValue<any>>
): ExecuteFunction =>
  ((...polyArgs: PolymorphicExecuteArguments): PromiseOrValue<AsyncIterableIteratorOrValue<any>> =>
    executeFn(getExecuteArgs(polyArgs))) as unknown as ExecuteFunction;

/**
 * Returns true if the provided object implements the AsyncIterator protocol via
 * implementing a `Symbol.asyncIterator` method.
 *
 * Source: https://github.com/graphql/graphql-js/blob/main/src/jsutils/isAsyncIterable.ts
 */
export function isAsyncIterable<TType>(maybeAsyncIterable: unknown): maybeAsyncIterable is AsyncIterable<TType> {
  return (
    typeof maybeAsyncIterable === 'object' &&
    maybeAsyncIterable != null &&
    typeof maybeAsyncIterable[Symbol.asyncIterator] === 'function'
  );
}

/**
 * A utility function for handling `onExecuteDone` hook result, for simplifying the handling of AsyncIterable returned from `execute`.
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
  }
  fn({
    args: payload.args,
    result: payload.result,
    setResult: payload.setResult,
  });

  return undefined;
}

export function finalAsyncIterator<TInput>(source: AsyncIterable<TInput>, onFinal: () => void): AsyncGenerator<TInput> {
  const iterator = source[Symbol.asyncIterator]();
  let isDone = false;
  const stream: AsyncGenerator<TInput> = {
    [Symbol.asyncIterator]() {
      return stream;
    },
    async next() {
      const result = await iterator.next();
      if (result.done && isDone === false) {
        isDone = true;
        onFinal();
      }
      return result;
    },
    async return() {
      const promise = iterator.return?.();
      if (isDone === false) {
        isDone = true;
        onFinal();
      }
      return promise ? await promise : { done: true, value: undefined };
    },
    async throw(error: unknown) {
      const promise = iterator.throw?.();
      if (promise) {
        return await promise;
      }
      // if the source has no throw method we just re-throw error
      // usually throw is not called anyways
      throw error;
    },
  };

  return stream;
}

export function errorAsyncIterator<TInput>(
  source: AsyncIterable<TInput>,
  onError: (err: unknown) => void
): AsyncGenerator<TInput> {
  const iterator = source[Symbol.asyncIterator]();
  const stream: AsyncGenerator<TInput> = {
    [Symbol.asyncIterator]() {
      return stream;
    },
    async next() {
      try {
        return await iterator.next();
      } catch (error) {
        onError(error);
        return { done: true, value: undefined };
      }
    },
    async return() {
      const promise = iterator.return?.();
      return promise ? await promise : { done: true, value: undefined };
    },
    async throw(error: unknown) {
      const promise = iterator.throw?.();
      if (promise) {
        return await promise;
      }
      // if the source has no throw method we just re-throw error
      // usually throw is not called anyways
      throw error;
    },
  };

  return stream;
}
