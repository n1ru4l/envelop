import { Plugin } from '@envelop/core';
import { IMiddlewareGenerator, IMiddleware, applyMiddleware } from 'graphql-middleware';

const middlewaresAppliedSymbol = Symbol('SCHEMA_WITH_MIDDLEWARES');

export const useGraphQLMiddleware = <TSource = any, TContext = any, TArgs = any>(
  middlewares: (IMiddleware<TSource, TContext, TArgs> | IMiddlewareGenerator<TSource, TContext, TArgs>)[]
): Plugin => {
  return {
    onSchemaChange({ schema, replaceSchema }) {
      if (schema[middlewaresAppliedSymbol]) {
        return;
      }

      if (middlewares.length > 0) {
        const wrappedSchema = applyMiddleware(schema, ...middlewares);
        wrappedSchema[middlewaresAppliedSymbol] = true;
        replaceSchema(wrappedSchema);
      }
    },
  };
};
