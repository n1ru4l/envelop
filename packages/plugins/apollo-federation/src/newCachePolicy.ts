// Taken from https://github.com/apollographql/apollo-server/blob/main/packages/apollo-server-core/src/cachePolicy.ts
import type { CacheHint, CachePolicy, CacheScope } from 'apollo-server-types';

export function newCachePolicy(): CachePolicy {
  return {
    maxAge: undefined,
    scope: undefined,
    restrict(hint: CacheHint) {
      if (hint.maxAge !== undefined && (this.maxAge === undefined || hint.maxAge < this.maxAge)) {
        this.maxAge = hint.maxAge;
      }
      if (hint.scope !== undefined && this.scope !== 'PRIVATE') {
        this.scope = hint.scope;
      }
    },
    replace(hint: CacheHint) {
      if (hint.maxAge !== undefined) {
        this.maxAge = hint.maxAge;
      }
      if (hint.scope !== undefined) {
        this.scope = hint.scope;
      }
    },
    policyIfCacheable() {
      if (this.maxAge === undefined || this.maxAge === 0) {
        return null;
      }
      return { maxAge: this.maxAge, scope: this.scope ?? ('PUBLIC' as CacheScope) };
    },
  };
}
