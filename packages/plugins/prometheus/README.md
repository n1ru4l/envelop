## `@envelop/prometheus`

This plugin tracks the complete execution flow, and reports metrics using Prometheus tracing (based on `prom-client`).

You can opt-in to collect tracing from the following phases:

- Sucessfull requests (`requestCount`)
- Request summary (`requestSummary`)
- errors (categorized by `phase`)
- resolvers tracing and runtime
- deprecated fields usage
- count of graphql operations
- `parse` execution time
- `validate` execution time
- `contextBuilding` execution time
- `execute` execution time

> You can also customize each phase reporter, and add custom metadata and labels to the metrics.

## Getting Started

```
yarn add prom-client @envelop/prometheus
```

## Usage Example

```ts
import { envelop } from '@envelop/core'
import { usePrometheus } from '@envelop/prometheus'

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    usePrometheus({
      // all optional, and by default, all set to false, please opt-in to the metrics you wish to get
      requestCount: true, // requries `execute` to be true as well
      requestSummary: true, // requries `execute` to be true as well
      parse: true,
      validate: true,
      contextBuilding: true,
      execute: true,
      errors: true,
      resolvers: true, // requires "execute" to be `true` as well
      resolversWhitelist: ['Mutation.*', 'Query.user'], // reports metrics als for these resolvers, leave `undefined` to report all fields
      deprecatedFields: true,
      registry: myRegistry // If you are using a custom prom-client registry, please set it here
    })
  ]
})
```

> Note: Tracing resolvers using `resovlers: true` might have a performance impact on your GraphQL runtime. Please consider to test it locally first and then decide if it's needed.

### Custom registry

You can customize the `prom-client` `Registry` object if you are using a custom one, by passing it along with the configuration object:

```ts
import { Registry } from 'prom-client'

const myRegistry = new Registry()

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    usePrometheus({
      // ... config ...
      registry: myRegistry
    })
  ]
})
```

> Note: if you are using custom `prom-client` instances, you need to make sure to pass your registry there as well.

### Introspection

If you wish to disable introspection logging, you can use `skipIntrospection: true` in your config object.

### Custom `prom-client` instances

Each tracing field supports custom `prom-client` objects, and custom `labels` a metadata, you can create a custom extraction function for every `Histogram` / `Summary` / `Counter`:

```ts
import { Histogram } from 'prom-client'
import { envelop } from '@envelop/core'
import { createHistogram, usePrometheus } from '@envelop/prometheus'

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    usePrometheus({
      // all optional, and by default, all set to false, please opt-in to the metrics you wish to get
      parse: createHistogram({
        histogram: new Histogram({
          name: 'my_custom_name',
          help: 'HELP ME',
          labelNames: ['opText'] as const,
          registers: [registry] // make sure to add your custom registry, if you are not using the default one
        }),
        fillLabelsFn: params => {
          // if you wish to fill your `lables` with metadata, you can use the params in order to get access to things like DocumentNode, operationName, operationType, `error` (for error metrics) and `info` (for resolvers metrics)
          return {
            opText: print(params.document)
          }
        }
      })
    })
  ]
})
```
