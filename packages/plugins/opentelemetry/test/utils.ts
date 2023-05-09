import * as api from '@opentelemetry/api';
import { AsyncHooksContextManager } from '@opentelemetry/context-async-hooks';
import { Resource } from '@opentelemetry/resources';
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  ReadableSpan,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

type Tree = {
  span: ReadableSpan;
  children?: Tree[];
};

export function otelSetup(): InMemorySpanExporter {
  const exporter = new InMemorySpanExporter();

  const contextManager = new AsyncHooksContextManager().enable();

  api.context.setGlobalContextManager(contextManager);

  const provider = new BasicTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'graphql-otel',
      [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    }),
  });

  provider.addSpanProcessor(new SimpleSpanProcessor(exporter));

  provider.register();

  return exporter;
}

export type SpanTree = {
  span: ReadableSpan;
  children: SpanTree[];
};

export function buildSpanTree(tree: SpanTree, spans: ReadableSpan[]): SpanTree {
  const childrenSpans = spans.filter(span => span.parentSpanId === tree.span.spanContext().spanId);

  if (childrenSpans.length) {
    tree.children = childrenSpans.map(span => buildSpanTree({ span, children: [] }, spans));
  } else {
    tree.children = [];
  }

  const simpleTree = JSON.stringify(
    tree,
    (key, value) => {
      const removedKeys = [
        'endTime',
        'startTime',
        '_spanLimits',
        'instrumentationLibrary',
        '_spanProcessor',
        '_attributeValueLengthLimit',
        '_duration',
      ];

      if (removedKeys.includes(key)) {
        return undefined;
      } else {
        return value;
      }
    },
    2,
  );

  return JSON.parse(simpleTree);
}

export function cleanSpanTreeForSnapshot(tree: Tree) {
  return JSON.parse(JSON.stringify(tree), (key, value) => {
    if (key[0] === '_') return undefined;
    if (key === 'parentSpanId') return '<parentSpanId>';
    if (key === 'itx_id') return '<itxId>';
    if (key === 'endTime') return '<endTime>';
    if (key === 'startTime') return '<startTime>';
    if (key === 'db.type') return '<dbType>';
    if (key === 'db.statement') return '<dbStatement>';
    if (key === 'resource') return undefined;
    if (key === 'spanId') return '<spanId>';
    if (key === 'traceId') return '<traceId>';

    return value;
  });
}
