---
'@envelop/generic-auth': patch
---

Handle operations with \`@include\` and \`@skip\` correctly when they have default values in the
operation definition

```ts
{
    query: /* GraphQL */ `
      query MyQuery($include: Boolean = true) {
        field @include(if: $include)
      }
    `,
    variables: {}
}
```

should be considered same as

```ts
{
    query: /* GraphQL */ `
      query MyQuery($include: Boolean!) {
        field @include(if: $include)
      }
    `,
    variables: {
        include: true
    }
}
```