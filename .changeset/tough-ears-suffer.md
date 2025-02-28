---
'@envelop/types': minor
'@envelop/core': minor
'@envelop/instruments': major
---

## New `Instruments` API

Introducation of a new API allowing to instrument the graphql pipeline.

This new API differs from already existing Hooks by not having access to intup/output of phases.
The goal of `Instruments` is to run allow running code before, after or araound the **whole process
of a phase**, incuding plugins hooks executions.

The main use case of this new API is observability (monitoring, tracing, etc...).

### Basic usage

```ts
import Sentry from '@sentry/node'
import { envelop } from '@envelop/core'

const getEnveloped = envelop({
  plugins: [
    {
      instruments: {
        execute: ({ context }, wrapped) =>
          Sentry.startSpan(
            { name: 'Graphql Operation' },
            async () => {
              try {
                await wrapped();
              } catch (err) {
                Sentry.captureException(err);
              }
            }
          ),
      }
    }
  ]
})

```

### Mutliple instruments plugins

It is possilbe to have multiple instruments plugins (Prometheus and Sentry for example), they will
be automatically composed by envelop in the same order than the plugin array (first is outtermost, last is inner most).

```ts
import { useSentry } from '@envelop/sentry'
import { useOpentelemetry } from '@envelop/opentelemetry'

const getEnveloped = envelop({
  plugins: [useSentry(), useOpentelemetry()]
})
```

```mermaid
sequenceDiagram
    Sentry->>Opentelemetry: 
    Opentelemetry->>Envelop: 
    Envelop->>Opentelemetry: 
    Opentelemetry->>Sentry: 
```

### Custom instruments ordering

If the default composition ordering doesn't suite your need, you can mannually compose instruments.
This allows to have a different execution order of hooks and instruments.


```ts
import { useSentry } from '@envelop/sentry'
import { useOpentelemetry } from '@envelop/opentelemetry'

const { instruments: sentryInstruments, ...sentryPlugin } = useSentry();
const { instruments: otelInstruments, ...otelPlugin } = useOpentelemetry();
const instruments = composeInstruments([otelInstruments, sentryInstruments])

const getEnveloped = envelop({
  plugins: [ { instruments }, sentryPlugin, otelPlugin ],
})
```

```mermaid
sequenceDiagram
    Opentelemetry->>Sentry: 
    Sentry->>Envelop: 
    Envelop->>Sentry: 
    Sentry->>Opentelemetry: 
```
