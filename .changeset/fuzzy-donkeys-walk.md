---
'@envelop/rate-limiter': minor
---

New directive SDL;

```graphql
directive @rateLimit(
  max: Int
  window: String
  message: String
  identityArgs: [String]
  arrayLengthField: String
  readOnly: Boolean
  uncountRejected: Boolean
) on FIELD_DEFINITION
```
