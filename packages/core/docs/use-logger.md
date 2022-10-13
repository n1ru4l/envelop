#### `useLogger`

Logs parameters and information about the execution phases. You can easily plug your custom logger.

```ts
import { envelop, useEngine, specifiedRules, useLogger } from '@envelop/core'
import { parse, validate, execute, subscribe } from 'graphql'

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    useLogger({
      logFn: (eventName, args) => {
        // Event could be `execute-start` / `execute-end` / `subscribe-start` / `subscribe-end`
        // `args` will include the arguments passed to execute/subscribe (in case of "start" event) and additional result in case of "end" event.
      }
    })
    // ... other plugins ...
  ]
})
```
