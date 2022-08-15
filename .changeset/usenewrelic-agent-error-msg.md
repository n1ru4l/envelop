---
'@envelop/newrelic': patch
---

New Relic: add error for agent not being found
Adds an error message when initializing the new relic plugin

- This error message will occur when the new relic agent is not found when initializing the plugin. Signalling information to a developer that new relic may not be
- installed correctly or may be disabled where this plugin is being instantiated.
