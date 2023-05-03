## `@envelop/opentelemetry`

This plugins integrates [Open Telemetry](https://opentelemetry.io/) tracing with your GraphQL
execution. It also collects GraphQL execution errors and reports it as Exceptions.

You can use this plugin with any kind of Open Telemetry
[tracer](https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/trace/api.md#tracer),
and integrate it to any tracing/metric platform that supports this standard.

## Getting Started

```
yarn add @envelop/opentelemetry
```

## Usage Example

By default, this plugin prints the collected telemetry to the console:

```ts
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import { envelop, useEngine } from '@envelop/core'
import { useOpenTelemetry } from '@envelop/opentelemetry'

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    // ... other plugins ...
    useOpenTelemetry({
      resolvers: true, // Tracks resolvers calls, and tracks resolvers thrown errors
      variables: true, // Includes the operation variables values as part of the metadata collected
      result: true // Includes execution result object as part of the metadata collected
    })
  ]
})
```

If you wish to use custom tracer/exporter, create it and pass it. This example integrates Jaeger
tracer:

```ts
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import { envelop, useEngine } from '@envelop/core'
import { useOpenTelemetry } from '@envelop/opentelemetry'
import { JaegerExporter } from '@opentelemetry/exporter-jaeger'
import { BasicTracerProvider, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base'

const exporter = new JaegerExporter({
  serviceName: 'my-service-name'
})

const provider = new BasicTracerProvider()
provider.addSpanProcessor(new SimpleSpanProcessor(exporter))
provider.register()

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    // ... other plugins ...
    useOpenTelemetry(
      {
        resolvers: true, // Tracks resolvers calls, and tracks resolvers thrown errors
        variables: true, // Includes the operation variables values as part of the metadata collected
        result: true // Includes execution result object as part of the metadata collected
      },
      provider
    )
  ]
})
```
