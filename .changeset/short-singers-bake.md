---
'@envelop/generic-auth': minor
---

give access to execute args in `validateUser` function.

This is useful in conjunction with the `fieldAuthExtension` parameter to achieve custom per field validation:

```ts
import { ValidateUserFn } from '@envelop/generic-auth'

const validateUser: ValidateUserFn<UserType> = async ({ user, executionArgs, fieldAuthExtension }) => {
  if (!user) {
    throw new Error(`Unauthenticated!`)
  }

  // You have access to the object define in the resolver tree, allowing to define any custom logic you want.
  const validate = fieldAuthExtension?.validate
  if (validate) {
    await validate({ user, variables: executionArgs.variableValues, context: executionArgs.contextValue })
  }
}

const resolvers = {
  Query: {
    user: {
      resolve: (_, { userId }) => getUser(userId),
      extensions: {
        auth: {
          validate: ({ user, variables, context }) => {
            // We can now have access to the operation and variables to decide if the user can execute the query
            if (user.id !== variables.userId) {
              throw new Error(`Unauthorized`)
            }
          }
        }
      }
    }
  }
}
```
