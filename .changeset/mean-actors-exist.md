---
'@envelop/core': patch
---

fix potential memory leak when using `onEnd` and `onNext` stream handlers for hooking into `subscribe` and `execute`.

This has been caused by AsyncGenerators being blocked until the next value is published. Now disposed result streams (AsyncIterables) will properly cleanup the underlying stream source.
