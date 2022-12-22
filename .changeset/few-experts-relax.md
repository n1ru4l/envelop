---
'@envelop/validation-cache': patch
---

Include the validation rule names within the operation cache key.

This prevents skipping conditional validation rules in other plugins.
Please make sure your validation rules always have a unique `name` property.
