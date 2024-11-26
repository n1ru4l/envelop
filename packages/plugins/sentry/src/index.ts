import { type Plugin } from '@envelop/core';
import { useOpenTelemetry, type TracingOptions } from '@envelop/opentelemetry';
import { Attributes, SpanKind, TracerProvider } from '@opentelemetry/api';
import { BasicTracerProvider } from '@opentelemetry/sdk-trace-base';
import * as Sentry from '@sentry/node';
import { SentryPropagator, SentrySampler, SentrySpanProcessor } from '@sentry/opentelemetry';
import type { Client } from '@sentry/types';

export type SentryPluginOptions = {
  otel?: TracingOptions;
  tracingProvider?: TracerProvider;
  spanKind?: SpanKind;
  spanAdditionalAttributes?: Attributes;
  serviceName?: string;
  spanPrefix?: string;
};

export const useSentry = <PluginContext extends Record<string, any> = {}>({
  otel = {},
  tracingProvider,
  spanKind,
  spanAdditionalAttributes,
  serviceName,
  spanPrefix,
}: SentryPluginOptions = {}): Plugin<PluginContext> => {
  const client = Sentry.getClient();
  if (!client) {
    throw new Error(
      "Sentry is not initialized. This plugin doesn't initialize Sentry automatically" +
        'Please call `Sentry.init` as describe in Sentry documentation',
    );
  }

  if (!tracingProvider) {
    const provider = new BasicTracerProvider({
      sampler: new SentrySampler(client as Client),
    });
    provider.addSpanProcessor(new SentrySpanProcessor());
    provider.register({
      propagator: new SentryPropagator(),
      contextManager: new Sentry.SentryContextManager(),
    });

    Sentry.validateOpenTelemetrySetup();
    tracingProvider = provider;
  }

  return {
    onPluginInit({ addPlugin }) {
      addPlugin(
        // @ts-expect-error TODO: fix types
        useOpenTelemetry(
          otel ?? {},
          tracingProvider,
          spanKind,
          spanAdditionalAttributes,
          serviceName,
          spanPrefix,
        ),
      );
    },
  };
};
