# @envelop/extended-validation

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
