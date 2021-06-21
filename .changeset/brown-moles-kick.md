---
'@envelop/newrelic': patch
---

Fixed retrieval of root operation from Envelop context

NOTE: There is a breaking behaviour. When using the `operationNameProperty` option, this will be checked against the `document` object rather than the `operation` object as in initial version.
