import { Plugin } from './plugin';
import { GraphQLSchema } from 'graphql';
import { PromiseOrValue } from 'graphql/jsutils/PromiseOrValue';
import { ExecuteFunction, ParseFunction, SubscribeFunction, ValidateFunction } from './graphql';
import { ArbitraryObject, Spread } from './utils';
export { ArbitraryObject } from './utils';

export type EnvelopContextFnWrapper<TFunction extends Function, ContextType = unknown> = (context: ContextType) => TFunction;

export type GetEnvelopedFn<PluginsContext> = {
  <InitialContext extends ArbitraryObject>(initialContext?: InitialContext): {
    execute: ExecuteFunction;
    validate: ValidateFunction;
    subscribe: SubscribeFunction;
    parse: ParseFunction;
    contextFactory: <ContextExtension>(
      contextExtension?: ContextExtension
    ) => PromiseOrValue<Spread<[InitialContext, PluginsContext, ContextExtension]>>;
    schema: GraphQLSchema;
  };
  _plugins: Plugin[];
};
