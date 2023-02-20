---
'@envelop/core': patch
'@envelop/apollo-federation': patch
'@envelop/graphql-jit': patch
'@envelop/newrelic': patch
'@envelop/opentelemetry': patch
'@envelop/response-cache': patch
'@envelop/sentry': patch
'@envelop/validation-cache': patch
'@envelop/testing': patch
---

- Memoize parsed document string result and use it wherever possible, and export `getDocumentString`
  function to allow users to use it as well.
- Use `WeakMap`s with `DocumentNode` wherever possible instead of using LRU Cache with strings. It
  is more optimal if a parser caching is used
