#### `useTiming`

Simple time metric collection, for every phase in your execution. You can easily customize the behavior of each timing measurement. By default, the timing is printed to the log, using `console.log`.

```ts
import { envelop, useTiming } from '@envelop/core'
import { buildSchema } from '@envelop/graphql'

const getEnveloped = envelop({
  plugins: [
    useTiming({
      // All options are optional. By default it just print it to the log.
      // ResultTiming is an object built with { ms, ns } (milliseconds and nanoseconds)
      onContextBuildingMeasurement: (timing: ResultTiming) => {},
      onExecutionMeasurement: (args: ExecutionArgs, timing: ResultTiming) => {},
      onSubscriptionMeasurement: (args: SubscriptionArgs, timing: ResultTiming) => {},
      onParsingMeasurement: (source: Source | string, timing: ResultTiming) => {},
      onValidationMeasurement: (document: DocumentNode, timing: ResultTiming) => {},
      onResolverMeasurement: (info: GraphQLResolveInfo, timing: ResultTiming) => {}
    })
    // ... other plugins ...
  ]
})
```
