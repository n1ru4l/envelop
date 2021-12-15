---
'@envelop/response-cache': minor
---

Add cross-platform support for platforms that do not have the `Node.js` `crypto` module available by using the `WebCrypto` API. This adds support for deno, cloudflare workers and the browser.

**BREAKING**: The `BuildResponseCacheKeyFunction` function type now returns `Promise<string>` instead of `string.`. The function `defaultBuildResponseCacheKey` now returns a `Promise`. The `UseResponseCacheParameter.buildResponseCacheKey` config option must return a `Promise`.
**BREAKING**: The `defaultBuildResponseCacheKey` now uses the hash algorithm `SHA256` instead of `SHA1`.
