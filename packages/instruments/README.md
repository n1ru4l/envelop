## `@envelop/instruments`

This package contains utility functions and types to ease the use of instruments accross Envelop,
Yoga, whatwg-node and Hive Gateway plugins.

> [!NOTE] Instruments are automatically composed together. This should only be used if the default
> ordering doesn't suit your needs (ie. instruments and hooks should be executed in different order)

## `composeInstruments(instruments: Instruments[]): Instruments`

This function composes all the instruments into one. The instruments will be called in the same
order as they are in the array (from top to bottom).

```ts
import { composeInstruments } from '@envelop/instruments'

// Extract instruments to compose from their plugins
const { instruments: instruments1, ...plugin1 } = usePlugin1()
const { instruments: instruments2, ...plugin2 } = usePlugin2()

const getEnveloped = envelop({
  plugins: [
    plugin1,
    plugin2,
    // Plugin instruments and plugin hooks will be executed in a different order
    { instruments: composeInstruments([instruments1, instruments2]) }
  ]
})
```
