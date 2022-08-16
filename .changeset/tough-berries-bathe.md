---
'@envelop/live-query': minor
---

Support for plugging in a patch middleware.

```ts
import { InMemoryLiveQueryStore } from '@n1ru4l/in-memory-live-query-store'
import { applyLiveQueryJSONDiffPatchGenerator } from '@n1ru4l/graphql-live-query-patch-jsondiffpatch'

const liveQueryStore = new InMemoryLiveQueryStore()

const plugin = useLiveQuery({ liveQueryStore, applyLiveQueryPatchGenerator: applyLiveQueryJSONDiffPatchGenerator })
```
