import { applyMiddleware, IMiddleware, IMiddlewareGenerator } from 'graphql-middleware';
import type { Plugin } from '@envelop/core';

const appliedSchemaSet = new WeakSet();

export const useGraphQLMiddleware = <TSource = any, TContext = any, TArgs = any>(
  middlewares: (
    | IMiddleware<TSource, TContext, TArgs>
    | IMiddlewareGenerator<TSource, TContext, TArgs>
  )[],
): Plugin => {
  return {
    onSchemaChange({ schema, replaceSchema }) {
      if (appliedSchemaSet.has(schema)) {
        return;
      }

      if (middlewares.length > 0) {
        const wrappedSchema = applyMiddleware(schema, ...middlewares);
        appliedSchemaSet.add(schema);
        replaceSchema(wrappedSchema);
      }
    },
  };
};
