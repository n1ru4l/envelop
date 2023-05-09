import { GraphQLOTELContext, traceDirective } from 'graphql-otel';
import { Plugin } from '@envelop/core';
import * as opentelemetry from '@opentelemetry/api';

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
