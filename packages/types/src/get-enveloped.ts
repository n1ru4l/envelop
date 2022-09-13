import { Plugin } from './plugin.js';
import { ExecuteFunction, ExecutionResult, ParseFunction, SubscribeFunction, ValidateFunction } from './graphql.js';
import { ArbitraryObject, Spread, PromiseOrValue, AsyncIterableIteratorOrValue } from './utils.js';
import { PerformParams } from './hooks.js';
export { ArbitraryObject } from './utils.js';

export type EnvelopContextFnWrapper<TFunction extends Function, ContextType = unknown> = (
  context: ContextType
) => TFunction;

export type GetEnvelopedFn<PluginsContext> = {
  <InitialContext extends ArbitraryObject>(initialContext?: InitialContext): {
    execute: ExecuteFunction;
    validate: ValidateFunction;
    subscribe: SubscribeFunction;
    parse: ParseFunction;
    contextFactory: <ContextExtension>(
      contextExtension?: ContextExtension
    ) => PromiseOrValue<Spread<[InitialContext, PluginsContext, ContextExtension]>>;
    schema: any;
    /**
     * Parse, validate, assemble context and execute/subscribe.
     *
     * Returns a ready-to-use GraphQL response.
     *
     * This function will NEVER throw GraphQL errors, it will instead place them in the result.
     */
    perform: <ContextExtension = unknown>(
      params: PerformParams,
      contextExtension?: ContextExtension
    ) => Promise<AsyncIterableIteratorOrValue<ExecutionResult>>;
  };
  _plugins: Plugin[];
};
