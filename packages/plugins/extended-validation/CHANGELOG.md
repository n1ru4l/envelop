# @envelop/extended-validation

## 1.6.3

### Patch Changes

- fbf6155: update package.json repository links to point to the new home
- Updated dependencies [fbf6155]
  - @envelop/core@2.3.3

## 1.6.2

### Patch Changes

- Updated dependencies [07d029b]
  - @envelop/core@2.3.2

## 1.6.1

### Patch Changes

- Updated dependencies [d5c2c9a]
  - @envelop/core@2.3.1

## 1.6.0

### Minor Changes

- Updated dependencies [af23408]
  - @envelop/core@2.3.0

## 1.5.0

### Minor Changes

- Updated dependencies [ada7fb0]
- Updated dependencies [d5115b4]
- Updated dependencies [d5115b4]
  - @envelop/core@2.2.0

## 1.4.1

### Patch Changes

- 01c8dd6: fix handling of array input (list)

## 1.4.0

### Minor Changes

- Updated dependencies [78b3db2]
- Updated dependencies [f5eb436]
  - @envelop/core@2.1.0

### Patch Changes

- 78b3db2: Run extended validation phase for subscription operations.
- 8030244: Ensure the extended validation phase only runs once.

  Move shared extended validation rules context instantiation to the `onContextFactory` phase and raise an error when `execute` is invoked without building and passing the `contextValue` returned from `contextFactory`.

## 1.3.4

### Patch Changes

- f102d38: move `@envelop/core` dependency to peerDependencies

## 1.3.3

### Patch Changes

- Updated dependencies [4106e08]
- Updated dependencies [aac65ef]
- Updated dependencies [4106e08]
  - @envelop/core@2.0.0

## 1.3.2

### Patch Changes

- 3dfddb5: Bump graphql-tools/utils to v8.6.1 to address a bug in getArgumentsValues
- Updated dependencies [3dfddb5]
  - @envelop/core@1.7.1

## 1.3.1

### Patch Changes

- b1a0331: Properly list `@envelop/core` as a `peerDependency` in plugins.

  This resolves issues where the bundled envelop plugins published to npm had logic inlined from the `@envelop/core` package, causing `instanceof` check of `EnvelopError` to fail.

- 07c39b5: Simplify code and add comments to the code.
- Updated dependencies [b1a0331]
  - @envelop/core@1.6.1

## 1.3.0

### Minor Changes

- 090cae4: GraphQL v16 support

## 1.2.0

### Minor Changes

- 04120de: add support for GraphQL.js 16

### Patch Changes

- a0b2da3: Fix handling of introspection queries and disallow authorization bypassing. Previously, it was possible to bypass authorization by adding `\_\_schema` to query

## 1.1.1

### Patch Changes

- 422a6c6: fix ESM

## 1.1.0

### Minor Changes

- 7c897ae: Added onValidationFailed callback

## 1.0.0

### Major Changes

- 40bc444: v1 major release for envelop packages

## 0.2.2

### Patch Changes

- 28ad742: Improve TypeScript types

## 0.2.1

### Patch Changes

- 7fd2f7b: suuport multiple usages of useExtendedValidation

## 0.2.0

### Minor Changes

- eb6f53b: ESM Support for all plugins and envelop core

## 0.1.2

### Patch Changes

- 25bfb47: fix issue with inlining graphql.js code in published bundle

## 0.1.1

### Patch Changes

- d4fcb9e: Support oneOf validation for input object type fields.

  Correctly handle validation of lists of oneOf input types and input type fields that are of a nullable oneOf input type.

## 0.1.0

### Minor Changes

- 43010e1: also support oneOf via extensions fields

## 0.0.1

### Patch Changes

- ced704e: NEW PLUGIN!
