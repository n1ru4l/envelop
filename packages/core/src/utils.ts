import {
  ASTNode,
  DocumentNode,
  Kind,
  OperationDefinitionNode,
  visit,
  BREAK,
  Source,
  ExecutionResult,
  SubscriptionArgs,
  ExecutionArgs,
} from 'graphql';
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
} from '@envelop/types';

export const envelopIsIntrospectionSymbol = Symbol('ENVELOP_IS_INTROSPECTION');

export function isOperationDefinition(def: ASTNode): def is OperationDefinitionNode {
  return def.kind === Kind.OPERATION_DEFINITION;
}

export function isIntrospectionOperation(operation: OperationDefinitionNode): boolean {
  if (operation.kind === 'OperationDefinition') {
    let hasIntrospectionField = false;

    visit(operation, {
      Field: node => {
        if (node.name.value === '__schema') {
          hasIntrospectionField = true;
          return BREAK;
        }
      },
    });

    return hasIntrospectionField;
  }

  return false;
}

export function isIntrospectionDocument(document: DocumentNode): boolean {
  const operations = document.definitions.filter(isOperationDefinition);

  return operations.some(op => isIntrospectionOperation(op));
}

export function isIntrospectionOperationString(operation: string | Source): boolean {
  return (typeof operation === 'string' ? operation : operation.body).indexOf('__schema') !== -1;
}

function getSubscribeArgs(args: PolymorphicSubscribeArguments): SubscriptionArgs {
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
export const makeSubscribe = (
  subscribeFn: (args: SubscriptionArgs) => PromiseOrValue<AsyncIterableIterator<ExecutionResult>>
): SubscribeFunction =>
  ((...polyArgs: PolymorphicSubscribeArguments): PromiseOrValue<AsyncIterableIterator<ExecutionResult>> =>
    subscribeFn(getSubscribeArgs(polyArgs))) as SubscribeFunction;

export function mapAsyncIterator<T, O>(source: AsyncIterable<T>, mapper: (input: T) => Promise<O> | O): AsyncGenerator<O> {
  const iterable = source[Symbol.asyncIterator]();

  const stream: AsyncGenerator<O> = {
    [Symbol.asyncIterator]() {
      return stream;
    },
    async next() {
      const value = await iterable.next();
      if (value.done) {
        return value;
      }
      return { done: false, value: await mapper(value.value) };
    },
    async return() {
      iterable.return?.();
      return { done: true, value: undefined };
    },
    async throw(error: unknown) {
      iterable.throw?.(error);
      return { done: true, value: undefined };
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
  executeFn: (args: ExecutionArgs) => PromiseOrValue<AsyncIterableIteratorOrValue<ExecutionResult>>
): ExecuteFunction =>
  ((...polyArgs: PolymorphicExecuteArguments): PromiseOrValue<AsyncIterableIteratorOrValue<ExecutionResult>> =>
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
  } else {
    fn({
      args: payload.args,
      result: payload.result,
      setResult: payload.setResult,
    });

    return undefined;
  }
}

export function finalAsyncIterator<TInput>(source: AsyncIterable<TInput>, onFinal: () => void): AsyncGenerator<TInput> {
  const iterable = source[Symbol.asyncIterator]();
  let isDone = false;
  const stream: AsyncGenerator<TInput> = {
    [Symbol.asyncIterator]() {
      return stream;
    },
    async next() {
      const result = await iterable.next();
      if (result.done && isDone === false) {
        isDone = true;
        onFinal();
      }
      return result;
    },
    async return() {
      iterable.return?.();
      if (isDone === false) {
        isDone = true;
        onFinal();
      }
      return { done: true, value: undefined };
    },
    async throw(error: unknown) {
      iterable.throw?.(error);
      return { done: true, value: undefined };
    },
  };

  return stream;
}

export function errorAsyncIterator<TInput>(
  source: AsyncIterable<TInput>,
  onError: (err: unknown) => void
): AsyncGenerator<TInput> {
  const iterable = source[Symbol.asyncIterator]();
  const stream: AsyncGenerator<TInput> = {
    [Symbol.asyncIterator]() {
      return stream;
    },
    async next() {
      try {
        return await iterable.next();
      } catch (error) {
        onError(error);
        throw error;
      }
    },
    async return() {
      iterable.return?.();
      return { done: true, value: undefined };
    },
    async throw(error: unknown) {
      iterable.throw?.(error);
      return { done: true, value: undefined };
    },
  };

  return stream;
}
