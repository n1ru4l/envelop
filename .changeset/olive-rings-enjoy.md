---
'@envelop/rate-limiter': minor
---

Programmatic API to define rate limit configuration in addition to directives

```ts
useRateLimiter({
  configByField: [
    {
      type: 'Query',
      field: 'search', // You can also use glob patterns
      max: 10,
      window: '1m'
    }
  ]
})
```
