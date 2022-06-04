# @envelop/response-cache

## 2.3.3

### Patch Changes

- fbf6155: update package.json repository links to point to the new home
- Updated dependencies [fbf6155]
  - @envelop/core@2.3.3

## 2.3.2

### Patch Changes

- Updated dependencies [07d029b]
  - @envelop/core@2.3.2

## 2.3.1

### Patch Changes

- Updated dependencies [d5c2c9a]
  - @envelop/core@2.3.1

## 2.3.0

### Minor Changes

- Updated dependencies [af23408]
  - @envelop/core@2.3.0

## 2.2.0

### Minor Changes

- Updated dependencies [ada7fb0]
- Updated dependencies [d5115b4]
- Updated dependencies [d5115b4]
  - @envelop/core@2.2.0

## 2.1.1

### Patch Changes

- 5400c3f: fix infinite loop while applying schema transforms

## 2.1.0

### Minor Changes

- Updated dependencies [78b3db2]
- Updated dependencies [f5eb436]
  - @envelop/core@2.1.0

## 2.0.0

### Patch Changes

- Updated dependencies [4106e08]
- Updated dependencies [aac65ef]
- Updated dependencies [4106e08]
  - @envelop/core@2.0.0

## 1.0.1

### Patch Changes

- 3dfddb5: Bump graphql-tools/utils to v8.6.1 to address a bug in getArgumentsValues
- Updated dependencies [3dfddb5]
  - @envelop/core@1.7.1

## 1.0.0

### Patch Changes

- Updated dependencies [d9cfb7c]
  - @envelop/core@1.7.0

## 0.6.0

### Minor Changes

- b919b21: Add cross-platform support for platforms that do not have the `Node.js` `crypto` module available by using the `WebCrypto` API. This adds support for deno, cloudflare workers and the browser.

  **BREAKING**: The `BuildResponseCacheKeyFunction` function type now returns `Promise<string>` instead of `string.`. The function `defaultBuildResponseCacheKey` now returns a `Promise`. The `UseResponseCacheParameter.buildResponseCacheKey` config option must return a `Promise`.
  **BREAKING**: The `defaultBuildResponseCacheKey` now uses the hash algorithm `SHA256` instead of `SHA1`.

## 0.5.1

### Patch Changes

- b1a0331: Properly list `@envelop/core` as a `peerDependency` in plugins.

  This resolves issues where the bundled envelop plugins published to npm had logic inlined from the `@envelop/core` package, causing `instanceof` check of `EnvelopError` to fail.

- Updated dependencies [b1a0331]
  - @envelop/core@1.6.1

## 0.5.0

### Minor Changes

- 090cae4: GraphQL v16 support

## 0.4.0

### Minor Changes

- 04120de: add support for GraphQL.js 16

## 0.3.0

### Minor Changes

- 0623cf7: Introspection query operations are no longer cached by default.

  In case you still want to cache query operations you can set the `ttlPerSchemaCoordinate` parameter to `{ "Query.__schema": undefined }` for caching introspection forever or `{ "Query.__schema": 100 }` for caching introspection for a specific time. We do not recommend caching introspection.

  Query operation execution results that contain errors are no longer cached.

## 0.2.1

### Patch Changes

- 9688945: Allow to set ttl=0 to disable caching, and use ttlPerType to maintain a whitelist
- a749ec0: Include operationName for building the cache key hash. Previously, sending the same operation document with a different operationName value could result in the wrong response being served from the cache.

  Use `fast-json-stable-stringify` for stringifying the variableValues. This will ensure that the cache is hit more often as the variable value serialization is now more stable.

## 0.2.0

### Minor Changes

- 075fc77: Expose metadata by setting the `includeExtensionMetadata` option.

  - `extension.responseCache.hit` - Whether the result was served form the cache or not
  - `extension.responseCache.invalidatedEntities` - Entities that got invalidated by a mutation operation

  Take a look at the README for mor information and examples.

## 0.1.0

### Minor Changes

- 823b335: initial release
