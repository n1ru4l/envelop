## `@envelop/instruments`

This package contains uitility functions and types to ease the use of instruments accross Envelop,
Yoga, wathwg-node and Hive Gateway plugins.

### `getInstrumentsAndPlugins(plugins: Plugin[]): { pluginInstruments: Instruments[], plugins: Plugin[] }`

This function extracts the instruments from the plugins and returns both the extracted instruments
and the plugins without their `instruments` field.

This is usefull when you want to customize the execution order of the instruments.

```ts
import { getInstrumentsAndPlugins } from '@envelop/instruments'

const { pluginInstruments, plugins } = getInstrumentsAndPlugins([
  // put you plugin list here. This list can contain plugins with and without instruments.
])
```

## `composeInstruments(instruments: Instruments[]): Instruments`

This function composes all the instruments into one. The instruments will be called in the same
order than they are in the array (first is outter most call, last is inner most).

This can be used in conjonction with `getInstrumentsAndPlugins` function to customize the order of
execution of the instruments if the default one doesn't suites your needs.

```ts
import { getInstrumentsAndPlugins } from '@envelop/instruments'

const { pluginInstruments, plugins } = getInstrumentsAndPlugins([
  // put you plugin list here. This list can contain plugins with and without instruments.
])

const instruments = composeInstruments(pluginInstruments)

const getEnveloped = envelop({
  plugins: [...plugins, { instruments }]
})
```
