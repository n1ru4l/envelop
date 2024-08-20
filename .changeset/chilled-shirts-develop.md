---
'@envelop/rate-limiter': minor
---

Now you can define a custom string interpolation function to be used in the rate limit message. This
is useful when you want to include dynamic values in the message.

```ts
useRateLimiter({
  configByField: [
    {
      type: 'Query',
      field: 'search', // You can also use glob patterns
      max: 10,
      window: '1m',
      message:
        'My custom message with interpolated values: ${args.searchTerm} and ${context.user.id}'
    }
  ],
  interpolateMessage: (message, args, context) => {
    return message.replace(/\${(.*?)}/g, (_, key) => {
      return key.split('.').reduce((acc, part) => acc[part], { args, context })
    })
  }
})
```
