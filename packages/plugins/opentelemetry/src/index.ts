import { GraphQLOTELContext, traceDirective } from 'graphql-otel';
import { Plugin } from '@envelop/core';
import * as opentelemetry from '@opentelemetry/api';

export enum AttributeName {
  EXECUTION_ERROR = 'graphql.execute.error',
  EXECUTION_RESULT = 'graphql.execute.result',
  RESOLVER_EXCEPTION = 'graphql.resolver.exception',
  RESOLVER_FIELD_NAME = 'graphql.resolver.fieldName',
  RESOLVER_TYPE_NAME = 'graphql.resolver.typeName',
  RESOLVER_RESULT_TYPE = 'graphql.resolver.resultType',
  RESOLVER_ARGS = 'graphql.resolver.args',
  EXECUTION_OPERATION_NAME = 'graphql.execute.operationName',
  EXECUTION_OPERATION_DOCUMENT = 'graphql.execute.document',
  EXECUTION_VARIABLES = 'graphql.execute.variables',
}

const tracingSpanSymbol = Symbol('OPEN_TELEMETRY_GRAPHQL');

type PluginContext = {
  [tracingSpanSymbol]: opentelemetry.Span;
};

const graphqlMiddlewareAppliedTransformSymbol = Symbol('graphqlMiddleware.appliedTransform');

export const useOpenTelemetry = (): Plugin<PluginContext> => {
  return {
    onContextBuilding({ extendContext }) {
      extendContext({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - dafuck
        GraphQLOTELContext: new GraphQLOTELContext(),
      });
    },
    onSchemaChange({ schema, replaceSchema }) {
      if (schema.extensions?.[graphqlMiddlewareAppliedTransformSymbol]) {
        return;
      }

      const directive = traceDirective('trace');

      const transformedSchema = directive.transformer(schema);

      replaceSchema(transformedSchema);
    },
  };
};
