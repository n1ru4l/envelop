# @envelop/persisted-operations

## 4.3.3

### Patch Changes

- fbf6155: update package.json repository links to point to the new home
- Updated dependencies [fbf6155]
  - @envelop/core@2.3.3

## 4.3.2

### Patch Changes

- Updated dependencies [07d029b]
  - @envelop/core@2.3.2

## 4.3.1

### Patch Changes

- Updated dependencies [d5c2c9a]
  - @envelop/core@2.3.1

## 4.3.0

### Minor Changes

- Updated dependencies [af23408]
  - @envelop/core@2.3.0

## 4.2.0

### Minor Changes

- Updated dependencies [ada7fb0]
- Updated dependencies [d5115b4]
- Updated dependencies [d5115b4]
  - @envelop/core@2.2.0

## 4.1.0

### Minor Changes

- Updated dependencies [78b3db2]
- Updated dependencies [f5eb436]
  - @envelop/core@2.1.0

## 4.0.0

### Patch Changes

- Updated dependencies [4106e08]
- Updated dependencies [aac65ef]
- Updated dependencies [4106e08]
  - @envelop/core@2.0.0

## 3.0.0

### Patch Changes

- Updated dependencies [d9cfb7c]
  - @envelop/core@1.7.0

## 2.2.1

### Patch Changes

- b1a0331: Properly list `@envelop/core` as a `peerDependency` in plugins.

  This resolves issues where the bundled envelop plugins published to npm had logic inlined from the `@envelop/core` package, causing `instanceof` check of `EnvelopError` to fail.

- Updated dependencies [b1a0331]
  - @envelop/core@1.6.1

## 2.2.0

### Minor Changes

- 0759d4a: Add `onMissingMatch` option to allow custom handling of missing operation Ids in store/s
- 090cae4: GraphQL v16 support

## 2.1.0

### Minor Changes

- 04120de: add support for GraphQL.js 16

## 2.0.0

### Major Changes

- f9841ba: BREAKING CHANGE: Renamed `onlyPersistedOperations` to `onlyPersisted`
- f9841ba: BREAKING CHANGE: Remove `writeToContext` - now the operation id is always written to the context
- f9841ba: BREAKING CHANGE: The operation ID written to the context is now a Symbol (instead of a string), use `readOperationId` to get it within your code / other plugins
- f9841ba: BREAKING CHANGE: Removed `canHandle` from interface. Replace it with returning `null` from the `get` function of your Store

### Minor Changes

- f9841ba: Added `extractOperationId` callback for extracting the persisted operation from the incoming http request
- f9841ba: Added support for dynamic store based on incoming req / initial context
- f9841ba: Added InMemoryStore and JsonFileStore

## 1.0.1

### Patch Changes

- 452af8f: Update dependencies of graphql-tools to latest

## 1.0.0

### Major Changes

- 40bc444: v1 major release for envelop packages

## 0.2.0

### Minor Changes

- 83b2b92: Extend plugin errors from GraphQLError.

## 0.1.1

### Patch Changes

- 28ad742: Improve TypeScript types

## 0.1.0

### Minor Changes

- 7b639c0: Save operation id to the context
- eb6f53b: ESM Support for all plugins and envelop core

## 0.0.2

### Patch Changes

- cb4e555: Remove apollo-tracing dependency

## 0.0.1

### Patch Changes

- 9fb5a66: Initial package release
