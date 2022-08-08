import { Plugin } from '@envelop/core';
import { IMiddlewareGenerator, IMiddleware, applyMiddleware } from 'graphql-middleware';
import { compat } from '@graphql-tools/compat';

const graphqlMiddlewareAppliedTransformSymbol = Symbol('graphqlMiddleware.appliedTransform');

export const useGraphQLMiddleware = <TSource = any, TContext = any, TArgs = any>(
  middlewares: (IMiddleware<TSource, TContext, TArgs> | IMiddlewareGenerator<TSource, TContext, TArgs>)[]
): Plugin => {
  return {
    onSchemaChange({ schema, replaceSchema }) {
      // @ts-expect-error See https://github.com/graphql/graphql-js/pull/3511 - remove this comments once merged
      if (schema.extensions?.[graphqlMiddlewareAppliedTransformSymbol]) {
        return;
      }

      if (middlewares.length > 0) {
        const wrappedSchema = applyMiddleware(compat.toGraphQLJS(schema), ...middlewares);
        wrappedSchema.extensions = {
          ...schema.extensions,
          [graphqlMiddlewareAppliedTransformSymbol]: true,
        };
        replaceSchema(compat.toTools(wrappedSchema));
      }
    },
  };
};
