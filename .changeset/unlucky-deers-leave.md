---
'@envelop/core': patch
---

Ensure error thrown from the context factory is wrapped within a GraphQLError for proper formatting. Previously this caused an unexpected error to be swallowed completly when error masking is enabled.
