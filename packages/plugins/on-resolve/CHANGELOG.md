# @envelop/on-resolve

## 3.0.0

### Major Changes

- Updated dependencies [[`1da52eef`](https://github.com/n1ru4l/envelop/commit/1da52eefcf198150b77db35733ad2b31018f9419)]:
  - @envelop/core@4.0.0

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
