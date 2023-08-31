# @envelop/on-resolve

## 3.0.1

### Patch Changes

- Updated dependencies []:
  - @envelop/core@4.0.1

## 3.0.0

### Major Changes

- [#1776](https://github.com/n1ru4l/envelop/pull/1776)
  [`332f1f22`](https://github.com/n1ru4l/envelop/commit/332f1f221f655421a850adb834afe549d50b4fac)
  Thanks [@ardatan](https://github.com/ardatan)! - Drop Node 14 and require Node 16 or higher

- Updated dependencies
  [[`332f1f22`](https://github.com/n1ru4l/envelop/commit/332f1f221f655421a850adb834afe549d50b4fac),
  [`a36925c7`](https://github.com/n1ru4l/envelop/commit/a36925c7df0538f88b51682e4e23f4b16f6fae2b)]:
  - @envelop/core@4.0.0

### Patch Changes

- [#1773](https://github.com/n1ru4l/envelop/pull/1773)
  [`7066ce98`](https://github.com/n1ru4l/envelop/commit/7066ce98df8e4ed18be618eb821ca50074557452)
  Thanks [@jonapgar-groupby](https://github.com/jonapgar-groupby)! - Prevent re-wrapping field
  resolvers with useOnResolve plugin. Fixes #1773

## 2.0.6

### Patch Changes

- Updated dependencies
  [[`c1eb2c09`](https://github.com/n1ru4l/envelop/commit/c1eb2c09ac535b076a5c13430c3892d98f7ef957)]:
  - @envelop/core@3.0.6

## 2.0.5

### Patch Changes

- Updated dependencies
  [[`270249cf`](https://github.com/n1ru4l/envelop/commit/270249cfb7650f8ad64f0167bb45a99475a03b04)]:
  - @envelop/core@3.0.5

## 2.0.4

### Patch Changes

- Updated dependencies []:
  - @envelop/core@3.0.4

## 2.0.3

### Patch Changes

- Updated dependencies
  [[`6b48ef96`](https://github.com/n1ru4l/envelop/commit/6b48ef962020eb7dfd2918626b8a394bff673e4f)]:
  - @envelop/core@3.0.3

## 2.0.2

### Patch Changes

- Updated dependencies
  [[`22f5ccfb`](https://github.com/n1ru4l/envelop/commit/22f5ccfbe69eb052cda6c1908425b63e3d906243)]:
  - @envelop/core@3.0.2

## 2.0.0

### Major Changes

- [#1487](https://github.com/n1ru4l/envelop/pull/1487)
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f)
  Thanks [@saihaj](https://github.com/saihaj)! - Remove `onResolverCalled`

  We decided to drop onResolverCalled hook and instead
  [provide a new plugin](https://github.com/n1ru4l/envelop/pull/1500) that will let you hook into
  this phase.

  ```diff
  import { parse, validate, execute, subscribe } from 'graphql'
  import { envelop, Plugin, useEngine } from '@envelop/core'
  + import { useOnResolve } from '@envelop/on-resolve'

  import { onResolverCalled } from './my-resolver'

  function useResolve(): Plugin {
    return {
  -   onResolverCalled: onResolverCalled,
  +   onPluginInit: ({ addPlugin }) => {
  +     addPlugin(useOnResolve(onResolverCalled))
  +   },
    }
  }

  const getEnveloped = envelop({
    plugins: [
      useEngine({ parse, validate, execute, subscribe }),
      // ... other plugins ...
      useResolve(),
    ],
  });
  ```

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
