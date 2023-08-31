# @envelop/live-query

## 6.0.1

### Patch Changes

- Updated dependencies []:
  - @envelop/core@4.0.1

## 6.0.0

### Major Changes

- [#1776](https://github.com/n1ru4l/envelop/pull/1776)
  [`332f1f22`](https://github.com/n1ru4l/envelop/commit/332f1f221f655421a850adb834afe549d50b4fac)
  Thanks [@ardatan](https://github.com/ardatan)! - Drop Node 14 and require Node 16 or higher

- Updated dependencies
  [[`332f1f22`](https://github.com/n1ru4l/envelop/commit/332f1f221f655421a850adb834afe549d50b4fac),
  [`a36925c7`](https://github.com/n1ru4l/envelop/commit/a36925c7df0538f88b51682e4e23f4b16f6fae2b)]:
  - @envelop/core@4.0.0

### Patch Changes

- [#1776](https://github.com/n1ru4l/envelop/pull/1776)
  [`332f1f22`](https://github.com/n1ru4l/envelop/commit/332f1f221f655421a850adb834afe549d50b4fac)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Updated dependency
    [`@graphql-tools/utils@^10.0.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.0.0)
    (from `^8.8.0`, in `dependencies`)

## 5.0.6

### Patch Changes

- [#1725](https://github.com/n1ru4l/envelop/pull/1725)
  [`c1eb2c09`](https://github.com/n1ru4l/envelop/commit/c1eb2c09ac535b076a5c13430c3892d98f7ef957)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - dependencies updates:

  - Updated dependency [`tslib@^2.5.0` ↗︎](https://www.npmjs.com/package/tslib/v/2.5.0) (from
    `^2.4.0`, in `dependencies`)

- Updated dependencies
  [[`c1eb2c09`](https://github.com/n1ru4l/envelop/commit/c1eb2c09ac535b076a5c13430c3892d98f7ef957)]:
  - @envelop/core@3.0.6

## 5.0.5

### Patch Changes

- Updated dependencies
  [[`270249cf`](https://github.com/n1ru4l/envelop/commit/270249cfb7650f8ad64f0167bb45a99475a03b04)]:
  - @envelop/core@3.0.5

## 5.0.4

### Patch Changes

- Updated dependencies []:
  - @envelop/core@3.0.4

## 5.0.3

### Patch Changes

- Updated dependencies
  [[`6b48ef96`](https://github.com/n1ru4l/envelop/commit/6b48ef962020eb7dfd2918626b8a394bff673e4f)]:
  - @envelop/core@3.0.3

## 5.0.2

### Patch Changes

- Updated dependencies
  [[`22f5ccfb`](https://github.com/n1ru4l/envelop/commit/22f5ccfbe69eb052cda6c1908425b63e3d906243)]:
  - @envelop/core@3.0.2

## 5.0.0

### Major Changes

- Updated dependencies
  [[`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f)]:
  - @envelop/core@3.0.0

## 4.2.0

### Minor Changes

- [#1499](https://github.com/n1ru4l/envelop/pull/1499)
  [`1f7af02b`](https://github.com/n1ru4l/envelop/commit/1f7af02b9f1a16058a6d69fcd48425a93be655c6)
  Thanks [@viniciuspalma](https://github.com/viniciuspalma)! - Adding tslib to package dependencies

  Projects that currently are using yarn Berry with PnP or any strict dependency resolver, that
  requires that all dependencies are specified on package.json otherwise it would endue in an error
  if not treated correct

  Since https://www.typescriptlang.org/tsconfig#importHelpers is currently being used, tslib should
  be exported as a dependency to external runners get the proper import.

  Change on each package:

  ```json
  // package.json
  {
    "dependencies": {
      "tslib": "^2.4.0"
    }
  }
  ```

- Updated dependencies
  [[`1f7af02b`](https://github.com/n1ru4l/envelop/commit/1f7af02b9f1a16058a6d69fcd48425a93be655c6),
  [`ae7bc9a3`](https://github.com/n1ru4l/envelop/commit/ae7bc9a36abd595b0a91f7b4e133017d3eb99a4a)]:
  - @envelop/core@2.6.0

## 4.1.0

### Minor Changes

- [#1481](https://github.com/n1ru4l/envelop/pull/1481)
  [`752ba122`](https://github.com/n1ru4l/envelop/commit/752ba12247427822a02bfca2633e337864bccbef)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Support for plugging in a patch middleware.

  ```ts
  import { applyLiveQueryJSONDiffPatchGenerator } from '@n1ru4l/graphql-live-query-patch-jsondiffpatch'
  import { InMemoryLiveQueryStore } from '@n1ru4l/in-memory-live-query-store'

  const liveQueryStore = new InMemoryLiveQueryStore()

  const plugin = useLiveQuery({
    liveQueryStore,
    applyLiveQueryPatchGenerator: applyLiveQueryJSONDiffPatchGenerator
  })
  ```

- Updated dependencies
  [[`5a5f5c04`](https://github.com/n1ru4l/envelop/commit/5a5f5c04177b9e1379fd77db5d6383160879d449),
  [`d828f129`](https://github.com/n1ru4l/envelop/commit/d828f1291254a0f9dfdc3654611087859e4c9708)]:
  - @envelop/core@2.5.0

### Patch Changes

- [#1481](https://github.com/n1ru4l/envelop/pull/1481)
  [`752ba122`](https://github.com/n1ru4l/envelop/commit/752ba12247427822a02bfca2633e337864bccbef)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - dependencies updates:

  - Added dependency
    [`@n1ru4l/graphql-live-query-patch@^0.7.0` ↗︎](https://www.npmjs.com/package/@n1ru4l/graphql-live-query-patch/v/^0.7.0)
    (to `dependencies`)

## 4.0.1

### Patch Changes

- 071f946: Fix CommonJS TypeScript resolution with `moduleResolution` `node16` or `nodenext`
- Updated dependencies [071f946]
  - @envelop/core@2.4.2

## 4.0.0

### Major Changes

- dcde041: Bump `@n1ru4l/in-memory-live-query-store` and `@n1ru4l/graphql-live-query` version

## 3.4.1

### Patch Changes

- Updated dependencies [787d28a2]
  - @envelop/core@2.4.1

## 3.4.0

### Minor Changes

- 8bb2738: Support TypeScript module resolution.
- Updated dependencies [8bb2738]
  - @envelop/core@2.4.0

## 3.3.3

### Patch Changes

- fbf6155: update package.json repository links to point to the new home
- Updated dependencies [fbf6155]
  - @envelop/core@2.3.3

## 3.3.2

### Patch Changes

- Updated dependencies [07d029b]
  - @envelop/core@2.3.2

## 3.3.1

### Patch Changes

- Updated dependencies [d5c2c9a]
  - @envelop/core@2.3.1

## 3.3.0

### Minor Changes

- Updated dependencies [af23408]
  - @envelop/core@2.3.0

## 3.2.0

### Minor Changes

- Updated dependencies [ada7fb0]
- Updated dependencies [d5115b4]
- Updated dependencies [d5115b4]
  - @envelop/core@2.2.0

## 3.1.0

### Minor Changes

- Updated dependencies [78b3db2]
- Updated dependencies [f5eb436]
  - @envelop/core@2.1.0

## 3.0.0

### Patch Changes

- Updated dependencies [4106e08]
- Updated dependencies [aac65ef]
- Updated dependencies [4106e08]
  - @envelop/core@2.0.0

## 2.0.1

### Patch Changes

- 3dfddb5: Bump graphql-tools/utils to v8.6.1 to address a bug in getArgumentsValues
- Updated dependencies [3dfddb5]
  - @envelop/core@1.7.1

## 2.0.0

### Patch Changes

- Updated dependencies [d9cfb7c]
  - @envelop/core@1.7.0

## 1.2.1

### Patch Changes

- b1a0331: Properly list `@envelop/core` as a `peerDependency` in plugins.

  This resolves issues where the bundled envelop plugins published to npm had logic inlined from the
  `@envelop/core` package, causing `instanceof` check of `EnvelopError` to fail.

- Updated dependencies [b1a0331]
  - @envelop/core@1.6.1

## 1.2.0

### Minor Changes

- 090cae4: GraphQL v16 support

## 1.1.0

### Minor Changes

- 04120de: add support for GraphQL.js 16

## 1.0.1

### Patch Changes

- 452af8f: Update dependencies of graphql-tools to latest

## 1.0.0

### Major Changes

- 40bc444: v1 major release for envelop packages

## 0.0.2

### Patch Changes

- 28ad742: Improve TypeScript types

## 0.0.1

### Patch Changes

- 266dc9f: Add live query plugin
