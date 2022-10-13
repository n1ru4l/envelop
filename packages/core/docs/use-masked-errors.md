#### `useMaskedErrors`

Prevent unexpected error messages from leaking to the GraphQL clients.

```ts
import { envelop, useSchema, useMaskedErrors, useEngine } from '@envelop/core'
import { makeExecutableSchema, GraphQLError, parse, validate, specifiedRules, execute, subscribe } from 'graphql'

const schema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      something: String!
      somethingElse: String!
      somethingSpecial: String!
    }
  `,
  resolvers: {
    Query: {
      something: () => {
        throw new GraphQLError('Error that is propagated to the clients.')
      },
      somethingElse: () => {
        throw new Error("Unsafe error that will be masked as 'Unexpected Error.'.")
      },
      somethingSpecial: () => {
        throw new GraphQLError('The error will have an extensions field.', {
          code: 'ERR_CODE',
          randomNumber: 123
        })
      }
    }
  }
})

const getEnveloped = envelop({
  plugins: [useEngine({ parse, validate, specifiedRules, execute, subscribe }), useSchema(schema), useMaskedErrors()]
})
```

You may customize the default error message `Unexpected error.` with your own `errorMessage`:

```ts
import { envelop, useSchema, useMaskedErrors, useEngine } from '@envelop/core'
import { parse, validate, specifiedRules, execute, subscribe } from 'graphql'
import { schema } from './schema'

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    useSchema(schema),
    useMaskedErrors({ errorMessage: 'Something went wrong.' })
  ]
})
```

Or provide a custom formatter when masking the output:

```ts
import { isGraphQLError, MaskError, useEngine } from '@envelop/core'
import { parse, validate, specifiedRules, execute, subscribe, GraphQLError } from 'graphql'

export const customFormatError: MaskError = err => {
  if (isGraphQLError(err)) {
    return new GraphQLError('Sorry, something went wrong.')
  }

  return err
}

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    useSchema(schema),
    useMaskedErrors({ maskErrorFn: customFormatError })
  ]
})
```
