import { Plugin } from '@envelop/core';
import { IMiddlewareGenerator, IMiddleware, applyMiddleware } from 'graphql-middleware';

const graphqlMiddlewareAppliedTransformSymbol = Symbol('graphqlMiddleware.appliedTransform');

export const useGraphQLMiddleware = <TSource = any, TContext = any, TArgs = any>(
  middlewares: (IMiddleware<TSource, TContext, TArgs> | IMiddlewareGenerator<TSource, TContext, TArgs>)[]
): Plugin => {
  return {
    onSchemaChange({ schema, replaceSchema }) {
      if (schema.extensions?.[graphqlMiddlewareAppliedTransformSymbol]) {
        return;
      }

      if (middlewares.length > 0) {
        const wrappedSchema = applyMiddleware(schema, ...middlewares);
        wrappedSchema.extensions = {
          ...schema.extensions,
          [graphqlMiddlewareAppliedTransformSymbol]: true,
        };
        replaceSchema(wrappedSchema);
      }
    },
  };
};
