## `@envelop/apollo-inline-trace`

This plugin integrates Apollo's FTV1 tracing. Read more about it on [Apollo's website about federated trace data](https://www.apollographql.com/docs/federation/metrics/).

## Getting Started

```
yarn add @envelop/apollo-inline-trace
```

## Usage Example

```ts
import { parse, validate, execute, subscribe } from 'graphql'
import { envelop } from '@envelop/core'
import { useApolloInlineTrace } from '@envelop/apollo-inline-trace'

const getEnveloped = envelop({
  parse,
  validate,
  execute,
  subscribe,
  plugins: [
    useApolloInlineTrace({
      // request must specify the ftv1 tracing protocol
      shouldTrace: ctx => ctx.req.headers['apollo-federation-include-trace'] === 'ftv1'
    })
  ]
})

const server = createServer((req, res) => {
  let payload = ''

  req.on('data', chunk => {
    payload += chunk.toString()
  })

  req.on('end', async () => {
    const { perform } = getEnveloped({ req })

    const { query, variables } = JSON.parse(payload)

    const result = await perform({ query, variables })

    res.end(JSON.stringify(result))
  })
})

server.listen(3000)
```

## Note

For accurate tracing behaviour, you MUST use the `perform` function from `getEnveloped`.
