# @envelop/on-resolve

## 2.0.4

### Patch Changes

- Updated dependencies []:
  - @envelop/core@3.0.4

## 2.0.3

### Patch Changes

- Updated dependencies [[`6b48ef96`](https://github.com/n1ru4l/envelop/commit/6b48ef962020eb7dfd2918626b8a394bff673e4f)]:
  - @envelop/core@3.0.3

## 2.0.2

### Patch Changes

- Updated dependencies [[`22f5ccfb`](https://github.com/n1ru4l/envelop/commit/22f5ccfbe69eb052cda6c1908425b63e3d906243)]:
  - @envelop/core@3.0.2

## 2.0.0

### Major Changes

- [#1487](https://github.com/n1ru4l/envelop/pull/1487) [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f) Thanks [@saihaj](https://github.com/saihaj)! - Remove `onResolverCalled`

  We decided to drop onResolverCalled hook and instead [provide a new plugin](https://github.com/n1ru4l/envelop/pull/1500) that will let you hook into this phase.

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

- Updated dependencies [[`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f), [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f), [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f), [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f), [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f), [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f), [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f), [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f), [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f), [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f), [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f), [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f), [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f), [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f)]:
  - @envelop/core@3.0.0
