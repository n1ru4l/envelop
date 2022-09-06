## `@envelop/on-resolve`

This plugin allows you to hook into resolves of every field in the GraphQL schema.

Useful for tracing or augmenting resolvers (and their results) with custom logic.

## Getting Started

```
yarn add @envelop/on-resolve
```

## Usage Example

### Custom field resolutions

```ts
import { envelop } from '@envelop/core'
import { useOnResolve } from '@envelop/on-resolve'
import { specialResolver } from './my-resolvers'

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useOnResolve(async function onResolve({ context, root, args, info, replaceResolver }) {
      // replace special field's resolver
      if (info.fieldName === 'special') {
        replaceResolver(specialResolver)
      }

      // replace field's result
      if (info.fieldName === 'alwaysHello') {
        return ({ setResult }) => {
          setResult('hello')
        }
      }
    })
  ]
})
```

### Tracing

```ts
import { envelop, Plugin } from '@envelop/core'
import { useOnResolve } from '@envelop/on-resolve'

interface FieldTracingPluginContext {
  tracerUrl: string
}

function useFieldTracing() {
  return {
    onPluginInit({ addPlugin }) {
      addPlugin(
        useOnResolve(async function onResolve({ context, root, args, info }) {
          await fetch(context.tracerUrl, {
            method: 'POST',
            headers: {
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              startedResolving: {
                ...info,
                parent: root,
                args
              }
            })
          })

          return async () => {
            await fetch(context.tracerUrl, {
              method: 'POST',
              headers: {
                'content-type': 'application/json'
              },
              body: JSON.stringify({
                endedResolving: {
                  ...info,
                  parent: root,
                  args
                }
              })
            })
          }
        })
      )
    }
  }
}

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useSpecialResolve()
  ]
})
```
